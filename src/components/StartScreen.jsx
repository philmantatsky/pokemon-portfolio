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
        {/* name rides above the logo like an eyebrow line */}
        <p className={styles.name}>PHILLIP MANTATSKY</p>
        <p className={styles.title}>POKEMON</p>
        <p className={styles.subtitle}>PORTFOLIO</p>
        <p className={styles.pressStart}>
          <span className={styles.pressCursor}>▶</span> PRESS START
        </p>
      </div>
      <p className={styles.copyright}>© 2026</p>
    </div>
  )
}
