import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import styles from './Battle.module.css'
// Gen IV (HGSS) in-battle sprites — bundled locally because
// raw.githubusercontent.com rate-limits (429) and the Pokemon vanish
import back1 from '../assets/back-1.png'
import back4 from '../assets/back-4.png'
import back7 from '../assets/back-7.png'
import front25 from '../assets/front-25.png'
// Trainer intro sprites: classic Red (play.pokemonshowdown.com/sprites/trainers/red.png,
// 80×80 like the Pokemon fronts) and the HGSS Ethan battle back (waist-up crop from the
// Spriters Resource HGSS "Trainers (Back)" sheet, asset 41995 — the dialog box crops it)
import trainerRed from '../assets/trainer-red.png'
import trainerEthan from '../assets/trainer-back-ethan.png'

// ── Editable constants ──
const OPPONENT = { trainer: 'PHILLIP', name: 'PIKACHU', id: 25, types: ['ELECTRIC'], level: 6 }
const ENEMY_MAX_HP = 88 // cosmetic; enemy box shows no numbers
const PLAYER_LEVEL = 5
const PLAYER_MAX_HP = 20 // shown as player HP numbers; never drops (~real Lv5 starter HP)
const EXP_FROM_PCT = 20 // exp bar fill before the battle
const EXP_TO_PCT = 65 // exp bar fill after "gained X Exp. Points!"
const HIT_DELAY = 700 // ms before HP starts draining
const DRAIN_MS = 1300 // ms for full HP drain
const SE_MS = 1000 // ms to show "super effective"
const CRIT_MS = 1600 // ms to show "A critical hit!" (user-tuned: hold it a beat)
const FAINT_MS = 1200 // ms for faint drop/fade
const SUPER_EFFECTIVE = ['GROUND'] // vs Pikachu; no starter has one, so it never fires

const STARTER_MOVES = {
  1: [ // Bulbasaur — all damaging, Gen IV HGSS learnset
    { name: 'VINE WHIP', type: 'GRASS', pp: 25 },
    { name: 'RAZOR LEAF', type: 'GRASS', pp: 25 },
    { name: 'SEED BOMB', type: 'GRASS', pp: 15 },
    { name: 'TACKLE', type: 'NORMAL', pp: 35 },
  ],
  4: [ // Charmander — all damaging, Gen IV HGSS learnset
    { name: 'SCRATCH', type: 'NORMAL', pp: 35 },
    { name: 'EMBER', type: 'FIRE', pp: 25 },
    { name: 'FIRE FANG', type: 'FIRE', pp: 15 },
    { name: 'DRAGON RAGE', type: 'DRAGON', pp: 10 },
  ],
  7: [ // Squirtle — all damaging, Gen IV HGSS learnset
    { name: 'WATER GUN', type: 'WATER', pp: 25 },
    { name: 'AQUA TAIL', type: 'WATER', pp: 10 },
    { name: 'BITE', type: 'DARK', pp: 25 },
    { name: 'TACKLE', type: 'NORMAL', pp: 35 },
  ],
}

// Move effects use authentic Game Freak battle-animation sprites (ripped by
// the pret/pokeemerald decomp, graphics/battle_anims/sprites, bundled as
// fx-*.png in src/assets), frame-stepped with CSS steps(); choreography is
// matched to the Gen IV (DPPt/HGSS) animation recordings. Grass/dark stay
// hand-built CSS.
// Scatter vectors (px) for the water splash droplets around the enemy.
const WATER_DROPS = [
  { dx: -52, dy: -38 }, { dx: 48, dy: -46 }, { dx: -70, dy: 8 }, { dx: 66, dy: -6 },
  { dx: -34, dy: -64 }, { dx: 30, dy: -70 }, { dx: -14, dy: 26 }, { dx: 56, dy: 30 },
]
// Per-orb size factors for the water gun stream.
const WATER_BLOBS = [1, 0.8, 1.1, 0.9, 1, 0.75, 1.05, 0.85, 1, 0.9]
// Vertical offsets (% of scene) fanning the razor leaves' flight paths.
const LEAF_LIFTS = [0, 4, -3, 7, 2, -5]

const BACK_SPRITES = { 1: back1, 4: back4, 7: back7 }
const ENEMY_SPRITE = front25

// Fraction of transparent padding below each back sprite's feet (measured
// from the PNGs' alpha channel) — lets CSS plant the feet on the platform.
const BACK_SPRITE_PAD = { 1: 0.225, 4: 0.138, 7: 0.15 }

export default function Battle({ starter, onFinish }) {
  const moves = STARTER_MOVES[starter.id]
  const playerSprite = BACK_SPRITES[starter.id]

  // trainerIntro | intro | menu | cantDo | moveSelect | attacking | victory
  const [phase, setPhase] = useState('trainerIntro')
  const [trainersExiting, setTrainersExiting] = useState(false)
  const [lineIdx, setLineIdx] = useState(0)
  const [menuCursor, setMenuCursor] = useState(0)
  const [moveCursor, setMoveCursor] = useState(0) // 0-3 moves, 4 = CANCEL
  const [enemyHp, setEnemyHp] = useState(ENEMY_MAX_HP)
  // bar width is animated by a single CSS transition (smooth), while enemyHp
  // ticks down on an interval just for the color thresholds + faint timing
  const [enemyBarPct, setEnemyBarPct] = useState(100)
  const [expPct, setExpPct] = useState(EXP_FROM_PCT)
  const [enemyAnim, setEnemyAnim] = useState('idle') // idle | hit | fainted
  const [playerAnim, setPlayerAnim] = useState('idle') // idle | lunging
  const [projectile, setProjectile] = useState(null) // null | 'FIRE' | 'WATER' | 'GRASS' | 'DRAGON' | 'DARK'
  const [attackText, setAttackText] = useState('')
  // 'ball' | 'materializing' | 'visible'
  const [enemySpawnPhase, setEnemySpawnPhase] = useState('ball')
  // 'hidden' | 'ball' | 'materializing' | 'visible'
  const [playerSpawnPhase, setPlayerSpawnPhase] = useState('hidden')

  const timersRef = useRef([])

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout)
  }, [])


  // Player Pokéball throw when "Go! STARTER!" line appears
  useEffect(() => {
    if (phase === 'intro' && lineIdx === 1) {
      setPlayerSpawnPhase('ball')
      later(() => setPlayerSpawnPhase('materializing'), 800)
      later(() => setPlayerSpawnPhase('visible'), 1380)
    }
  }, [phase, lineIdx])

  function later(fn, ms) {
    timersRef.current.push(setTimeout(fn, ms))
  }

  // exp bar fills when the "gained X Exp. Points!" victory line appears
  useEffect(() => {
    if (phase === 'victory' && lineIdx === 1) setExpPct(EXP_TO_PCT)
  }, [phase, lineIdx])

  const TRAINER_LINES = [
    `You are challenged by ${OPPONENT.trainer}!`,
    `${OPPONENT.trainer}: If you wanna see my portfolio, you'll have to defeat me in battle!`,
  ]
  const INTRO_LINES = [
    `${OPPONENT.trainer} sent out ${OPPONENT.name}!`,
    `Go! ${starter.name}!`,
  ]
  const VICTORY_LINES = [
    `${OPPONENT.trainer} is defeated!`,
    `${starter.name} gained 105 Exp. Points!`,
  ]
  const OUTRO_LINES = [
    `${OPPONENT.trainer}: Ugh... you won. Here's my portfolio, I guess.`,
  ]

  function advanceDialog() {
    if (phase === 'trainerIntro') {
      if (trainersExiting) return
      if (lineIdx < TRAINER_LINES.length - 1) setLineIdx(lineIdx + 1)
      else {
        setTrainersExiting(true)
        later(() => {
          setLineIdx(0)
          setTrainersExiting(false) // reset so Red can re-enter for the outro
          setPhase('intro')
          // enemy Pokéball throw starts once the trainers have cleared out
          later(() => setEnemySpawnPhase('materializing'), 800)
          later(() => setEnemySpawnPhase('visible'), 1380)
        }, 600)
      }
    } else if (phase === 'intro') {
      if (lineIdx < INTRO_LINES.length - 1) setLineIdx(lineIdx + 1)
      else {
        setPhase('menu')
        setMenuCursor(0)
      }
    } else if (phase === 'cantDo') {
      setPhase('menu')
    } else if (phase === 'victory') {
      if (lineIdx < VICTORY_LINES.length - 1) setLineIdx(lineIdx + 1)
      else {
        // defeated trainer walks back out for his concession line
        setLineIdx(0)
        setPhase('outro')
      }
    } else if (phase === 'outro') {
      if (lineIdx < OUTRO_LINES.length - 1) setLineIdx(lineIdx + 1)
      else onFinish()
    }
  }

  function pickMenu(idx) {
    if (idx === 0) {
      setMoveCursor(0)
      setPhase('moveSelect')
    } else {
      setPhase('cantDo')
    }
  }

  function chooseMove(move) {
    setPhase('attacking')
    setAttackText(`${starter.name} used ${move.name}!`)
    setPlayerAnim('lunging')

    if (move.type !== 'NORMAL') {
      setProjectile(move.type)
      later(() => setProjectile(null), 2200)
    }

    later(() => {
      setEnemyAnim('hit')
      setEnemyBarPct(0)
      const start = Date.now()
      const iv = setInterval(() => {
        const t = Math.min(1, (Date.now() - start) / DRAIN_MS)
        setEnemyHp(Math.round(ENEMY_MAX_HP * (1 - t)))
        if (t >= 1) {
          clearInterval(iv)
          afterDrain(move)
        }
      }, 50)
      timersRef.current.push(iv)
    }, HIT_DELAY)
  }

  function afterDrain(move) {
    const faint = () => {
      setAttackText(`${OPPONENT.name} fainted!`)
      setEnemyAnim('fainted')
      later(() => {
        setLineIdx(0)
        setPhase('victory')
      }, FAINT_MS)
    }
    const effectiveness = () => {
      if (SUPER_EFFECTIVE.includes(move.type)) {
        setAttackText(`It's super effective!`)
        later(faint, SE_MS)
      } else {
        faint()
      }
    }
    // every player move crits — the scripted always-win battle leans into it.
    // Gen IV order: damage, then "A critical hit!", then the effectiveness line
    setAttackText(`A critical hit!`)
    later(effectiveness, CRIT_MS)
  }

  // ── Keyboard controls ──
  useEffect(() => {
    function onKey(e) {
      const k = e.key
      const isConfirm = k === 'Enter' || k === ' ' || k === 'z' || k === 'Z'
      const isCancel = k === 'x' || k === 'X' || k === 'Escape' || k === 'Backspace'

      if (phase === 'trainerIntro' || phase === 'intro' || phase === 'cantDo' || phase === 'victory' || phase === 'outro') {
        if (isConfirm) {
          e.preventDefault()
          advanceDialog()
        }
        return
      }

      if (phase === 'menu') {
        if (k === 'ArrowUp') {
          e.preventDefault()
          setMenuCursor(0)
        } else if (k === 'ArrowDown') {
          e.preventDefault()
          if (menuCursor === 0) setMenuCursor(2)
        } else if (k === 'ArrowLeft') {
          e.preventDefault()
          if (menuCursor > 1) setMenuCursor(menuCursor - 1)
        } else if (k === 'ArrowRight') {
          e.preventDefault()
          if (menuCursor >= 1 && menuCursor < 3) setMenuCursor(menuCursor + 1)
        } else if (isConfirm) {
          e.preventDefault()
          pickMenu(menuCursor)
        }
        return
      }

      if (phase === 'moveSelect') {
        if (k === 'ArrowUp') {
          e.preventDefault()
          if (moveCursor === 4) setMoveCursor(3)
          else if (moveCursor >= 2) setMoveCursor(moveCursor - 2)
        } else if (k === 'ArrowDown') {
          e.preventDefault()
          if (moveCursor <= 1) setMoveCursor(moveCursor + 2)
          else if (moveCursor <= 3) setMoveCursor(4)
        } else if (k === 'ArrowLeft') {
          e.preventDefault()
          if (moveCursor === 1 || moveCursor === 3) setMoveCursor(moveCursor - 1)
        } else if (k === 'ArrowRight') {
          e.preventDefault()
          if (moveCursor === 0 || moveCursor === 2) setMoveCursor(moveCursor + 1)
        } else if (isConfirm) {
          e.preventDefault()
          if (moveCursor === 4) setPhase('menu')
          else chooseMove(moves[moveCursor])
        } else if (isCancel) {
          e.preventDefault()
          setPhase('menu')
        }
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── Derived display ──
  const hpPct = (enemyHp / ENEMY_MAX_HP) * 100
  const hpColor = hpPct > 50 ? styles.hpGreen : hpPct > 25 ? styles.hpYellow : styles.hpRed

  const dialogRef = useRef(null)

  let dialogText = ''
  let dialogWaits = false
  if (phase === 'trainerIntro') {
    dialogText = TRAINER_LINES[lineIdx]
    dialogWaits = !trainersExiting
  } else if (phase === 'intro') {
    dialogText = INTRO_LINES[lineIdx]
    dialogWaits = true
  } else if (phase === 'cantDo') {
    dialogText = `Can't do that now!`
    dialogWaits = true
  } else if (phase === 'attacking') {
    dialogText = attackText
  } else if (phase === 'victory') {
    dialogText = VICTORY_LINES[lineIdx]
    dialogWaits = true
  } else if (phase === 'outro') {
    dialogText = OUTRO_LINES[lineIdx]
    dialogWaits = true
  } else {
    // menu + moveSelect keep the prompt visible, DS-style
    dialogText = `What will ${starter.name} do?`
  }

  // Chromium under-invalidates the old Press Start 2P glyphs when the dialog
  // string changes, leaving stale glyph tops behind (verified: only a full
  // display toggle clears them) — force a repaint of the box per text change
  useLayoutEffect(() => {
    const el = dialogRef.current
    if (!el) return
    el.style.display = 'none'
    void el.offsetHeight
    el.style.display = ''
  }, [dialogText])

  return (
    <div
      className={styles.screen}
      /* while the dialog waits (blinking ▶), a click ANYWHERE advances — the
         menu/move buttons only exist in non-waiting phases, so no double-fires */
      onClick={dialogWaits ? advanceDialog : undefined}
      style={{ cursor: dialogWaits ? 'pointer' : undefined }}
    >
      {/* ── Scene ── */}
      <div className={styles.scene}>
        <div className={styles.sky} />
        <div className={styles.ground} />

        <div className={`${styles.platform} ${styles.enemyPlatform}`} />
        <div className={`${styles.platform} ${styles.playerPlatform}`} />
        <div className={styles.enemyShadow} />
        <div className={styles.playerShadow} />

        {(phase === 'trainerIntro' || phase === 'outro') && (
          <img
            src={trainerRed}
            alt={OPPONENT.trainer}
            className={`${styles.trainerEnemy} ${trainersExiting ? styles.trainerExitR : ''}`}
            draggable={false}
          />
        )}
        {phase === 'trainerIntro' && (
          <img
            src={trainerEthan}
            alt="You"
            className={`${styles.trainerPlayer} ${trainersExiting ? styles.trainerExitL : ''}`}
            draggable={false}
          />
        )}

        {phase !== 'trainerIntro' && enemySpawnPhase === 'ball' && <div className={styles.enemyBall} />}
        <img
          src={ENEMY_SPRITE}
          alt={OPPONENT.name}
          className={[
            styles.enemySprite,
            enemySpawnPhase === 'ball' ? styles.spawnHidden : '',
            enemySpawnPhase === 'materializing' ? styles.materializing : '',
            enemyAnim === 'hit' ? styles.hit : '',
            enemyAnim === 'fainted' ? styles.fainted : '',
          ].join(' ')}
          draggable={false}
        />

        {projectile && (
          <div className={styles.fxLayer}>
            {projectile === 'FIRE' && (
              <>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={styles.emberBall} style={{ '--i': i }} />
                ))}
                <div className={styles.fireBurn} />
                <span className={`${styles.smokePuff} ${styles.smoke1}`} />
                <span className={`${styles.smokePuff} ${styles.smoke2}`} />
                <span className={`${styles.smokePuff} ${styles.smoke3}`} />
              </>
            )}
            {projectile === 'WATER' && (
              <>
                {WATER_BLOBS.map((size, i) => (
                  <span
                    key={i}
                    className={styles.waterOrb}
                    style={{ '--i': i, '--size': size }}
                  />
                ))}
                <div className={styles.waterBurst} />
                {WATER_DROPS.map((d, i) => (
                  <span
                    key={i}
                    className={styles.waterDrop}
                    style={{ '--i': i, '--dx': `${d.dx}px`, '--dy': `${d.dy}px` }}
                  />
                ))}
              </>
            )}
            {projectile === 'GRASS' && (
              <>
                {LEAF_LIFTS.map((lift, i) => (
                  <span
                    key={i}
                    className={styles.leaf}
                    style={{ '--i': i, '--lift': `${lift}%` }}
                  />
                ))}
                <div className={styles.grassBurst} />
              </>
            )}
            {projectile === 'DRAGON' && (
              <>
                <span className={styles.pulseRing} />
                <span className={styles.pulseCore} />
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <span key={i} className={styles.pulsePuff} style={{ '--i': i }} />
                ))}
                <div className={styles.pulseCloud} />
              </>
            )}
            {projectile === 'DARK' && (
              <>
                <span className={styles.fangTop} />
                <span className={styles.fangBottom} />
                <div className={styles.biteFlash} />
              </>
            )}
          </div>
        )}

        {playerSpawnPhase === 'ball' && <div className={styles.playerBall} />}
        <img
          src={playerSprite}
          alt={starter.name}
          className={[
            styles.playerSprite,
            playerSpawnPhase === 'hidden' || playerSpawnPhase === 'ball' ? styles.spawnHidden : '',
            playerSpawnPhase === 'materializing' ? styles.materializing : '',
            playerAnim === 'lunging' ? styles.lunging : '',
          ].join(' ')}
          style={{ '--backPad': BACK_SPRITE_PAD[starter.id] }}
          draggable={false}
        />

        {/* Enemy HP box (no numbers) — hidden while a trainer holds the enemy side */}
        {phase !== 'trainerIntro' && phase !== 'outro' && (
        <div className={`${styles.hpBox} ${styles.enemyHpBox}`}>
          <div className={styles.hpTopRow}>
            <span>
              {OPPONENT.name}
              <span className={styles.genderF}>♀</span>
            </span>
            <span className={styles.hpLevel}>Lv{OPPONENT.level}</span>
          </div>
          <div className={styles.hpBarRow}>
            <span className={styles.hpLabel}>HP</span>
            <div className={styles.hpTrack}>
              <div
                className={`${styles.hpFill} ${hpColor}`}
                style={{ width: `${enemyBarPct}%`, transition: `width ${DRAIN_MS}ms linear` }}
              />
            </div>
          </div>
        </div>
        )}

        {/* Player HP box (with numbers) */}
        {phase !== 'trainerIntro' && (
        <div className={`${styles.hpBox} ${styles.playerHpBox}`}>
          <div className={styles.hpTopRow}>
            <span>
              {starter.name}
              <span className={styles.genderM}>♂</span>
            </span>
            <span className={styles.hpLevel}>Lv{PLAYER_LEVEL}</span>
          </div>
          <div className={styles.hpBarRow}>
            <span className={styles.hpLabel}>HP</span>
            <div className={styles.hpTrack}>
              <div className={`${styles.hpFill} ${styles.hpGreen}`} style={{ width: '100%' }} />
            </div>
          </div>
          <div className={styles.hpNumbers}>
            {PLAYER_MAX_HP}/{PLAYER_MAX_HP}
          </div>
          <div className={styles.expRow}>
            <div className={styles.expTrack}>
              <div
                className={styles.expFill}
                style={{ width: `${expPct}%`, transition: 'width 1200ms ease-out' }}
              />
            </div>
          </div>
        </div>
        )}

        {/* Dialog — bottom of the scene, like the DS top screen */}
        <div ref={dialogRef} className={styles.dialogBox}>
          <p className={styles.dialogText}>{dialogText}</p>
          {dialogWaits && <span className={styles.dialogArrow}>▶</span>}
        </div>
      </div>

      {/* ── Control panel (DS bottom screen) ── */}
      <div className={styles.panel}>
        <div className={styles.panelStrip}>
          <span className={styles.ball} />
          <span className={styles.ball} />
          <span className={styles.ball} />
          <span className={styles.stripLine} />
          <span className={styles.ballFaded} />
          <span className={styles.ballFaded} />
          <span className={styles.ballFaded} />
        </div>

        <div className={styles.panelBody}>
          {phase === 'menu' && (
            <div className={styles.menuWrap}>
              <button
                className={`${styles.fightBtn} ${menuCursor === 0 ? styles.selected : ''}`}
                onMouseEnter={() => setMenuCursor(0)}
                onClick={() => pickMenu(0)}
              >
                <span className={styles.fightInner}>
                  <span className={styles.pokeball} />
                  FIGHT
                </span>
              </button>
              <div className={styles.subRow}>
                <button
                  className={`${styles.subBtn} ${styles.bagBtn} ${menuCursor === 1 ? styles.selected : ''}`}
                  onMouseEnter={() => setMenuCursor(1)}
                  onClick={() => pickMenu(1)}
                >
                  <span className={styles.subInner}>BAG</span>
                </button>
                <button
                  className={`${styles.subBtn} ${styles.runBtn} ${menuCursor === 2 ? styles.selected : ''}`}
                  onMouseEnter={() => setMenuCursor(2)}
                  onClick={() => pickMenu(2)}
                >
                  <span className={styles.subInner}>RUN</span>
                </button>
                <button
                  className={`${styles.subBtn} ${styles.pokemonBtn} ${menuCursor === 3 ? styles.selected : ''}`}
                  onMouseEnter={() => setMenuCursor(3)}
                  onClick={() => pickMenu(3)}
                >
                  <span className={styles.subInner}>POKéMON</span>
                </button>
              </div>
            </div>
          )}

          {phase === 'moveSelect' && (
            <div className={styles.moveWrap}>
              <div className={styles.moveGrid}>
                {moves.map((m, i) => (
                  <button
                    key={m.name}
                    className={`${styles.moveBtn} ${styles['bg' + m.type]} ${
                      moveCursor === i ? styles.selected : ''
                    }`}
                    onMouseEnter={() => setMoveCursor(i)}
                    onClick={() => chooseMove(m)}
                  >
                    <span className={styles.moveInner}>
                      <span className={styles.moveName}>{m.name}</span>
                      <span className={styles.moveMeta}>
                        <span className={`${styles.typeBadge} ${styles[m.type.toLowerCase()]}`}>{m.type}</span>
                        <span className={styles.movePp}>
                          PP {m.pp}/{m.pp}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <button
                className={`${styles.cancelBtn} ${moveCursor === 4 ? styles.selected : ''}`}
                onMouseEnter={() => setMoveCursor(4)}
                onClick={() => setPhase('menu')}
              >
                <span className={styles.subInner}>CANCEL</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
