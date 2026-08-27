import { useState, useEffect } from 'react'
import styles from './StarterSelection.module.css'

const BASE = 'https://i0.wp.com/noellembrooks.com/wp-content/uploads/2025/02'

const STARTERS = [
  {
    id: 1,
    name: 'BULBASAUR',
    type: 'GRASS',
    bottomOffset: '-40px',
    hoverBottomOffset: '0px',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
    hoverSprite: `${BASE}/Bulbasaur-idle-1.gif?w=100&ssl=1`,
  },
  {
    id: 4,
    name: 'CHARMANDER',
    type: 'FIRE',
    bottomOffset: '-40px',
    hoverBottomOffset: '0px',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
    hoverSprite: `${BASE}/Charmander-idle.gif?w=100&ssl=1`,
  },
  {
    id: 7,
    name: 'SQUIRTLE',
    type: 'WATER',
    bottomOffset: '-49px',
    hoverBottomOffset: '0px',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',
    hoverSprite: `${BASE}/squirtle-idle.gif?w=100&ssl=1`,
  },
]

export default function StarterSelection({ onSelect, onSkip }) {
  const [hovered, setHovered] = useState(null)
  const [phase, setPhase] = useState('browsing')
  const [pending, setPending] = useState(null)
  const [yesNo, setYesNo] = useState(0)

  useEffect(() => {
    if (phase !== 'confirming') return

    function handleKey(e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        setYesNo((v) => (v === 0 ? 1 : 0))
      }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') {
        e.preventDefault()
        if (yesNo === 0) confirm()
        else cancel()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, yesNo])

  function handleCardClick(pokemon) {
    if (phase !== 'browsing') return
    setPending(pokemon)
    setYesNo(0)
    setPhase('confirming')
  }

  function confirm() {
    setPhase('confirmed')
    setTimeout(() => onSelect(pending), 1200)
  }

  function cancel() {
    setPhase('browsing')
    setPending(null)
    setYesNo(0)
  }

  const dialogText =
    phase === 'browsing'
      ? 'Choose your starter...'
      : `Choose ${pending.name}?`

  return (
    <div className={styles.screen}>
      <div className={styles.pokemonRow}>
        {STARTERS.map((p) => {
          const isHovered = hovered === p.id
          const isPending = pending?.id === p.id
          const isAnimated = (isHovered && phase === 'browsing') || isPending
          return (
            <button
              key={p.id}
              className={`${styles.card} ${isAnimated ? styles.active : ''}`}
              onMouseEnter={() => phase === 'browsing' && setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleCardClick(p)}
              style={{ cursor: phase === 'browsing' ? 'pointer' : 'default' }}
            >
              <div className={styles.spriteSlot}>
                <img
                  src={p.sprite}
                  alt={p.name}
                  className={`${styles.sprite} ${isAnimated ? styles.spriteHidden : ''}`}
                  style={{ bottom: p.bottomOffset }}
                  draggable={false}
                />
                <img
                  src={p.hoverSprite}
                  alt=""
                  className={`${styles.sprite} ${styles.spriteFlip} ${isAnimated ? '' : styles.spriteHidden}`}
                  style={{ bottom: p.hoverBottomOffset }}
                  draggable={false}
                />
              </div>
              <div className={styles.nameRow}>
                <span className={styles.nameCursor} style={{ visibility: isAnimated ? 'visible' : 'hidden' }}>▶</span>
                <span className={styles.pokemonName}>{p.name}</span>
              </div>
              <span className={`${styles.typeBadge} ${styles[p.type.toLowerCase()]}`}>
                {p.type}
              </span>
            </button>
          )
        })}
      </div>

      <div className={styles.dialogArea}>
        <div className={styles.dialogBox}>
          <p className={styles.dialogText}>{dialogText}</p>
        </div>

        {(phase === 'confirming' || phase === 'confirmed') && (
          <div className={styles.yesNoBox}>
            <button
              className={styles.yesNoOption}
              onMouseEnter={() => setYesNo(0)}
              onClick={confirm}
              disabled={phase === 'confirmed'}
            >
              <span className={styles.cursor} style={{ visibility: yesNo === 0 ? 'visible' : 'hidden' }}>▶</span>
              <span className={`${styles.optionLabel} ${yesNo === 0 ? styles.optionLabelShift : ''}`}>YES</span>
            </button>
            <button
              className={styles.yesNoOption}
              onMouseEnter={() => setYesNo(1)}
              onClick={cancel}
              disabled={phase === 'confirmed'}
            >
              <span className={styles.cursor} style={{ visibility: yesNo === 1 ? 'visible' : 'hidden' }}>▶</span>
              {/* 0.125em = 1 font pixel: N has no left bearing in Press Start 2P while Y has one, so NO's ink sits left of YES's without it */}
              <span className={`${styles.optionLabel} ${yesNo === 1 ? styles.optionLabelShift : ''}`} style={{ marginLeft: '0.125em' }}>NO</span>
            </button>
          </div>
        )}
      </div>

      {/* footer shortcut for visitors who don't want to play (recruiters) —
          styled as the DS blue key so it clearly reads as a button. "ahead"
          on purpose: the battle ends at the portfolio too, this is just the
          fast path. Disabled once a starter is confirmed so it can't race
          the pending screen transition. */}
      {onSkip && (
        <button
          className={styles.skipBtn}
          onClick={onSkip}
          disabled={phase === 'confirmed'}
        >
          <span className={styles.skipCursor}>▶</span>
          ...or skip ahead to the portfolio
        </button>
      )}
    </div>
  )
}
