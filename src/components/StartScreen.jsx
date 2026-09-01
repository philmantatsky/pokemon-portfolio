import { useEffect } from 'react'
import styles from './StartScreen.module.css'

export default function StartScreen({ onStart }) {
  useEffect(() => {
    const handleKey = () => onStart()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onStart])

  return (
    <div className={styles.screen} onClick={onStart}>
      <div className={styles.content}>
        {/* name gets the big logo slot; the theme drops to the small line —
            PHILLIP/POKEMON are both 7 chars and MANTATSKY/PORTFOLIO both 9,
            so the swap keeps the original balance exactly */}
        <p className={styles.title}>PHILLIP</p>
        <p className={styles.subtitle}>MANTATSKY</p>
        <p className={styles.pressStart}>
          <span className={styles.pressCursor}>▶</span> PRESS START
        </p>
        <p className={styles.name}>POKEMON PORTFOLIO</p>
      </div>
      <p className={styles.copyright}>© 2026</p>
    </div>
  )
}
