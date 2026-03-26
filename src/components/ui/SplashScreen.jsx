// src/components/ui/SplashScreen.jsx
import { useEffect, useState } from 'react'
import styles from './SplashScreen.module.css'

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 1500)
    const t3 = setTimeout(() => setPhase(3), 2800)
    const t4 = setTimeout(() => { setPhase(4); setTimeout(onDone, 600) }, 4200)
    return () => [t1,t2,t3,t4].forEach(clearTimeout)
  }, [])

  return (
    <div className={`${styles.splash} ${phase >= 4 ? styles.exit : ''}`}>
      <div className={styles.bg} />
      <div className={styles.grid} />

      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      <div className={styles.center}>
        <div className={`${styles.logo} ${phase >= 1 ? styles.logoIn : ''}`}>
          <span className={styles.logoIcon}>⚡</span>
        </div>

        <div className={`${styles.title} ${phase >= 1 ? styles.titleIn : ''}`}>
          <span className={styles.word1}>ASMODEO</span>
          <span className={styles.word2}>DEV</span>
        </div>

        <div className={`${styles.sub} ${phase >= 2 ? styles.subIn : ''}`}>
          APK Mods · Juegos · Scripts
        </div>

        <div className={`${styles.benefits} ${phase >= 2 ? styles.benefitsIn : ''}`}>
          <span className={styles.chip}>🔒 100% Seguro</span>
          <span className={styles.chip}>💎 Full Mod</span>
          <span className={styles.chip}>🆓 Gratis</span>
          <span className={styles.chip}>⚡ Sin Anuncios</span>
        </div>

        <div className={`${styles.bar} ${phase >= 3 ? styles.barFill : ''}`}>
          <div className={styles.barTrack}>
            <div className={styles.barFg} />
          </div>
          <span className={styles.barLabel}>Cargando...</span>
        </div>
      </div>

      <div className={styles.particles}>
        {Array.from({length: 16}).map((_,i) => (
          <div key={i} className={styles.particle} style={{ '--i': i }} />
        ))}
      </div>
    </div>
  )
}
