import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import styles from './Portfolio.module.css'
import { PP_FONT } from './ppFont'

// Authentic Gen IV party mini icons (pret/pokeplatinum res/pokemon/*/icon.png,
// 32x64 = two animation frames stacked — shown via background-position, and
// frame-flipped on the selected slot like the real party screen). The old
// Gen VII icon-{id}.png files are still in src/assets.
import icon25 from '../assets/icon4-25.png'
import icon6 from '../assets/icon4-6.png'
import icon9 from '../assets/icon4-9.png'
import icon3 from '../assets/icon4-3.png'
import icon94 from '../assets/icon4-94.png'
import icon149 from '../assets/icon4-149.png'

// The selected-slot sprites are only referenced from .slotOn CSS rules, so the
// browser would otherwise fetch + decode them on the FIRST hover — a visible
// hitch. Importing them here yields the same URLs Vite gives the CSS, and the
// preload effect below warms the cache before any hover happens.
import ppSlotSel from '../assets/pp-slot-sel.png'
import ppFirstSel from '../assets/pp-first-sel.png'
import ppStripSel from '../assets/pp-strip-sel.png'

const PRELOAD_SPRITES = [ppSlotSel, ppFirstSel, ppStripSel]

// TODO: slots 2-6 are still placeholders. `lv`, `hp` and `gender` are
// decorative only — the DPPt party screen this mimics always shows a full
// green bar. Drop `url` or `github` on an entry and that action disappears
// from its menu; the summary shows automatically when the project is opened.
const PROJECTS = [
  {
    name: 'AI CARD SCANNER',
    sprite: icon25,
    lv: 50,
    hp: 186,
    gender: 'm',
    summary:
      'Fine-tuned a vision model on 20,700 card images to identify Pokemon cards from a live camera feed. TensorRT INT8 inference surfaces card pricing and population data.',
    tech: 'Knows PYTHON, TENSORFLOW, NVIDIA TAO, TENSORRT, OPENCV, and DOCKER! In training since May 2026.',
    url: 'https://github.com/philmantatsky/real-time-trading-card-recognizer',
  },
  {
    name: 'KALSHI ARB BOT',
    sprite: icon6,
    lv: 50,
    hp: 176,
    gender: 'm',
    summary:
      'Paper-trades 1,200+ Kalshi contracts against live Vegas odds when prices diverge 3%+, sizing with fractional Kelly. Ran 14 days live in a UChicago AI hackathon.',
    tech: 'Knows PYTHON, SQLITE, DOCKER, and FLY.IO! Trained May 2026.',
    url: 'https://github.com/philmantatsky/kalshi-vegas-arb',
  },
  {
    name: 'POKEMON BATTLE AI',
    sprite: icon9,
    lv: 50,
    hp: 236,
    gender: 'f',
    summary:
      'A doubles battle bot for Pokemon Showdown VGC: PPO self-play + behavior cloning from human replays, with Monte Carlo tree search. Plays live on the ladder.',
    tech: 'Knows PYTHON, PYTORCH, POKE-ENV, PPO, and MCTS! In training since August 2026.',
    url: 'https://github.com/philmantatsky/VGC-Pokemon-Showdown-AI',
  },
  {
    name: 'LLM DEBATE SIMULATOR',
    sprite: icon3,
    lv: 50,
    hp: 186,
    gender: 'm',
    summary:
      'Pits LLMs against each other in debates over 1,300+ GSM8K math problems to test whether arguing improves their answers. Part of my LLM research at UIC.',
    tech: 'Knows PYTHON, LLAMA 3, GEMMA 2, and GSM8K! Trained May 2026.',
    url: 'https://github.com/philmantatsky/debate-simulator',
  },
  {
    name: 'COMING SOON...',
    sprite: icon94,
    lv: 50,
    hp: 186,
    summary: "This project hasn't hatched yet. Check back soon!",
  },
  {
    name: 'COMING SOON...',
    sprite: icon149,
    lv: 50,
    hp: 191,
    summary: "This project hasn't hatched yet. Check back soon!",
  },
]

// ── Bitmap text, straight from the games' own glyph sheets ──
// PText: Platinum system font (pp-font.png, ripped from pret/pokeplatinum
// font_system.png and recolored white + shadow) — used for the slot names.
// PNum: the bold party-screen digits (font_special_chars.png) + the "/".
// Both size in --u (1 DS pixel of the slot sprite) so they scale with the slot.
function PText({ text, className }) {
  return (
    <span className={`${styles.ptext} ${className || ''}`} style={{ '--fw': PP_FONT.sheetW }}>
      {[...text].map((ch, i) => {
        if (ch === ' ') return <span key={i} className={styles.psp} />
        const g = PP_FONT.map[ch] || PP_FONT.map['?']
        return (
          <span
            key={i}
            className={styles.pch}
            style={{ '--gx': g[0], '--gw': g[1] }}
          />
        )
      })}
    </span>
  )
}

function PNum({ text, className }) {
  return (
    <span className={`${styles.pnum} ${className || ''}`}>
      {[...text].map((ch, i) =>
        ch === '/' ? (
          <span key={i} className={styles.nslash} />
        ) : (
          <span key={i} className={styles.ndigit} style={{ '--d': ch }} />
        )
      )}
    </span>
  )
}

const PROMPT = 'Choose a project.'
const CANCEL_INDEX = PROJECTS.length

export default function Portfolio({ onExit }) {
  const [phase, setPhase] = useState('browsing') // 'browsing' | 'actions'
  const [cursor, setCursor] = useState(0)
  const [actionCursor, setActionCursor] = useState(0)
  const [dialogText, setDialogText] = useState(PROMPT)
  const [aboutOpen, setAboutOpen] = useState(false)
  // TECH STACK opens as its own sub-box with just BACK — one click fewer
  // than a SUMMARY row, and BACK restores the summary in the dialog
  const [techView, setTechView] = useState(false)
  const dialogRef = useRef(null)

  const active = cursor < PROJECTS.length ? PROJECTS[cursor] : null

  // warm the selected-state sprites once on mount (see PRELOAD_SPRITES note)
  useEffect(() => {
    PRELOAD_SPRITES.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  function closeMenu() {
    setPhase('browsing')
    setTechView(false)
    setDialogText(PROMPT)
  }

  function openLink(url) {
    window.open(url, '_blank', 'noopener,noreferrer')
    closeMenu()
  }

  // Built per project so a missing url/github/tech simply drops that row —
  // the cursor bounds then follow the rendered list for free. The summary
  // shows automatically when the menu opens; TECH STACK swaps the dialog to
  // the move-list-style stack line and the menu to a lone BACK box, which
  // restores the summary and the main menu.
  function backToMain(p) {
    setTechView(false)
    setDialogText(p.summary)
    setActionCursor(0)
  }

  function actionsFor(p) {
    if (techView) {
      return [{ label: 'BACK', run: () => backToMain(p) }]
    }
    const list = []
    if (p.url) list.push({ label: 'VISIT', run: () => openLink(p.url) })
    if (p.github) list.push({ label: 'GITHUB', run: () => openLink(p.github) })
    if (p.tech) {
      list.push({
        label: 'TECH STACK',
        run: () => {
          setDialogText(p.tech)
          setTechView(true)
          setActionCursor(0)
        },
      })
    }
    list.push({ label: 'CANCEL', run: closeMenu })
    return list
  }

  const actions = active ? actionsFor(active) : []

  function pick(i) {
    if (i === CANCEL_INDEX) {
      onExit()
      return
    }
    setCursor(i)
    setActionCursor(0)
    setTechView(false)
    // the project's summary appears in the dialog the moment it's opened
    setDialogText(PROJECTS[i].summary)
    setPhase('actions')
  }

  // Slots run left-to-right in a 2-column grid: even = left column, odd = right.
  function moveVertical(dir) {
    if (dir < 0) {
      if (cursor === CANCEL_INDEX) setCursor(PROJECTS.length - 1)
      else if (cursor >= 2) setCursor(cursor - 2)
      return
    }
    if (cursor === CANCEL_INDEX) return
    if (cursor + 2 < PROJECTS.length) setCursor(cursor + 2)
    else setCursor(CANCEL_INDEX)
  }

  function moveSide(dir) {
    if (cursor === CANCEL_INDEX) return
    if (dir > 0 && cursor % 2 === 0 && cursor + 1 < PROJECTS.length) setCursor(cursor + 1)
    if (dir < 0 && cursor % 2 === 1) setCursor(cursor - 1)
  }

  // ── Keyboard controls ──
  // No dependency array on purpose (as in Battle.jsx): the effect re-subscribes
  // every render so the handler always closes over the current cursor/phase.
  useEffect(() => {
    function onKey(e) {
      const k = e.key
      const isConfirm = k === 'Enter' || k === ' ' || k === 'z' || k === 'Z'
      const isCancel = k === 'x' || k === 'X' || k === 'Escape' || k === 'Backspace'

      if (aboutOpen) {
        if (isConfirm || isCancel) {
          e.preventDefault()
          setAboutOpen(false)
        }
        return
      }

      if (phase === 'actions') {
        if (k === 'ArrowUp') {
          e.preventDefault()
          setActionCursor((c) => (c === 0 ? actions.length - 1 : c - 1))
        } else if (k === 'ArrowDown') {
          e.preventDefault()
          setActionCursor((c) => (c === actions.length - 1 ? 0 : c + 1))
        } else if (isConfirm) {
          e.preventDefault()
          actions[actionCursor].run()
        } else if (isCancel) {
          e.preventDefault()
          // B backs out one level: tech box -> main menu -> closed
          if (techView && active) backToMain(active)
          else closeMenu()
        }
        return
      }

      if (k === 'ArrowUp') {
        e.preventDefault()
        moveVertical(-1)
      } else if (k === 'ArrowDown') {
        e.preventDefault()
        moveVertical(1)
      } else if (k === 'ArrowLeft') {
        e.preventDefault()
        moveSide(-1)
      } else if (k === 'ArrowRight') {
        e.preventDefault()
        moveSide(1)
      } else if (isConfirm) {
        e.preventDefault()
        pick(cursor)
      } else if (isCancel) {
        e.preventDefault()
        onExit()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const shownText = dialogText

  // Chromium under-invalidates the old Press Start 2P glyphs when the dialog
  // string changes, leaving stale glyph tops behind — force a repaint of the
  // box per text change. CSS-only fixes were tried and do not work (CLAUDE.md).
  useLayoutEffect(() => {
    const el = dialogRef.current
    if (!el) return
    el.style.display = 'none'
    void el.offsetHeight
    el.style.display = ''
  }, [shownText])

  const columns = [
    PROJECTS.map((p, i) => ({ p, i })).filter((x) => x.i % 2 === 0),
    PROJECTS.map((p, i) => ({ p, i })).filter((x) => x.i % 2 === 1),
  ]

  return (
    <div className={styles.screen}>
      {/* header in the slate band above the party: trainer name + link keys.
          The resume PDF lives in public/ so the site serves it directly. */}
      <div className={styles.header}>
        <PText text="PHILLIP MANTATSKY" className={styles.headerName} />
        <div className={styles.headerLinks}>
          <button
            className={styles.linkKey}
            onClick={() => setAboutOpen((v) => !v)}
          >
            ABOUT ME
          </button>
          <a
            className={styles.linkKey}
            href="/Phillip_Mantatsky_Resume.pdf"
            target="_blank"
            rel="noreferrer"
          >
            RESUME
          </a>
          <a
            className={styles.linkKey}
            href="https://github.com/philmantatsky"
            target="_blank"
            rel="noreferrer"
          >
            GITHUB
          </a>
          <a
            className={styles.linkKey}
            href="https://www.linkedin.com/in/philmantatsky/"
            target="_blank"
            rel="noreferrer"
          >
            LINKEDIN
          </a>
        </div>
      </div>

      <div className={styles.party}>
        {columns.map((col, c) => (
          <div key={c} className={`${styles.col} ${c === 1 ? styles.colRight : ''}`}>
            {/* colInner is content-sized so its ::before (the single striped
                box behind the whole column) spans first slot → last slot */}
            <div className={styles.colInner}>
            {col.map(({ p, i }) => (
              <button
                key={i}
                className={`${styles.slot} ${i === 0 ? styles.slotFirst : ''} ${
                  cursor === i ? styles.slotOn : ''
                }`}
                onMouseEnter={() => phase === 'browsing' && setCursor(i)}
                onClick={() => pick(i)}
              >
                {/* the panel is the REAL DPPt party slot sprite in three
                    slices: left cap (ball + chamfer), 1px strip stretched
                    across the middle, right cap — so the ball never distorts
                    however wide the slot is. .slotOn swaps all three for the
                    selected sprite (cyan panel + orange ring + open ball).
                    The strip renders FIRST and extends 1u under each cap:
                    at fractional --u the slice edges can miss by a subpixel
                    and the pinstriped backdrop grins through as a dashed
                    line — the caps must overlap the strip, not abut it. */}
                <span className={styles.panelM} />
                <span className={styles.panelL} />
                <span className={styles.panelR} />
                <span
                  className={styles.icon}
                  style={{ backgroundImage: `url(${p.sprite})` }}
                />
                <PText text={p.name} className={styles.name} />
                {p.gender && (
                  <span
                    className={`${styles.gender} ${
                      p.gender === 'f' ? styles.genderF : styles.genderM
                    }`}
                  />
                )}
                <span className={styles.hpBar}>
                  {/* mid strip first + tucked under the end caps, same
                      subpixel-seam rule as the panel slices */}
                  <span className={styles.hpM} />
                  <span className={styles.hpL} />
                  <span className={styles.hpR} />
                </span>
                <span className={styles.lvRow}>
                  <span className={styles.lvIcon} />
                  <PNum text={String(p.lv)} />
                </span>
                <PNum text={`${p.hp}/${p.hp}`} className={styles.hpNum} />
              </button>
            ))}
            </div>
          </div>
        ))}
      </div>

      {/* trainer-card style about box — closes on Enter/X/Escape or ANY
          click: the invisible backdrop catches clicks outside the card so
          they only dismiss it (and can't open a project underneath) */}
      {aboutOpen && (
        <div
          className={styles.aboutBackdrop}
          onClick={() => setAboutOpen(false)}
        />
      )}
      {aboutOpen && (
        <div className={styles.aboutBox} onClick={() => setAboutOpen(false)}>
          <PText text="PHILLIP MANTATSKY" className={styles.aboutName} />
          <p className={styles.aboutText}>
            CS at UIC, graduating May 2028 (3.9 GPA). Currently at Teradyne building
            an AI agent that triages semiconductor test failures so
            engineers don't spend their mornings reading logs.
          </p>
          <p className={styles.aboutText}>
            On my own time I'm teaching a camera to recognize 20,000+
            Pokémon cards and price them in real time, and I once pointed an
            arbitrage bot at Kalshi and Vegas odds for 14 days just to see
            if the prices ever disagreed. (They did.)
          </p>
          <p className={styles.aboutText}>
            Off screen: watching Attack on Titan, playing pickleball, and
            fishing.
          </p>
          <p className={styles.aboutText}>
            Fluent in Russian and Lithuanian.
          </p>
        </div>
      )}

      {phase === 'actions' && (
        <div className={styles.actionMenu}>
          {actions.map((a, i) => (
            <button
              key={a.label}
              className={styles.actionRow}
              onMouseEnter={() => setActionCursor(i)}
              onClick={a.run}
            >
              <span
                className={styles.cursor}
                style={{ visibility: actionCursor === i ? 'visible' : 'hidden' }}
              >
                ▶
              </span>
              <span
                className={`${styles.actionLabel} ${
                  actionCursor === i ? styles.actionLabelShift : ''
                }`}
              >
                {a.label}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.bottomBar}>
        <div ref={dialogRef} className={styles.dialogBox}>
          <p className={styles.dialogText}>{shownText}</p>
        </div>
        <button
          className={`${styles.cancelBtn} ${cursor === CANCEL_INDEX ? styles.slotOn : ''}`}
          onMouseEnter={() => phase === 'browsing' && setCursor(CANCEL_INDEX)}
          onClick={onExit}
        >
          <span className={styles.cancelInner}>CANCEL</span>
        </button>
      </div>
    </div>
  )
}
