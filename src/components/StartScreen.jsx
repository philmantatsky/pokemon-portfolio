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
        {/* the name IS the logo, on one line; the theme sits in the small line */}
        <p className={styles.title}>PHILLIP MANTATSKY</p>
        <p className={styles.pressStart}>
          <span className={styles.pressCursor}>▶</span> PRESS START
        </p>
        <p className={styles.name}>POKEMON PORTFOLIO</p>
      </div>
      <p className={styles.copyright}>© 2026</p>
    </div>
  )
}
