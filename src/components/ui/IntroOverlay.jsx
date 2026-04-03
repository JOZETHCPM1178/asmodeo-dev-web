// src/components/ui/IntroOverlay.jsx
// Animación de entrada SOLO la primera visita (persiste en localStorage)
import { useEffect, useState, useRef } from 'react'
import styles from './IntroOverlay.module.css'

const INTRO_KEY = 'asmodeo_hasSeenIntro_v1'

export default function IntroOverlay({ onDone }) {
  const [phase, setPhase]   = useState(0) // 0=hidden 1=in 2=lines 3=logo 4=text 5=exit
  const [skipped, setSkipped] = useState(false)
  const doneRef = useRef(false)

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    localStorage.setItem(INTRO_KEY, 'true')
    setPhase(5)
    setTimeout(onDone, 700)
  }

  useEffect(() => {
    // Verificar si ya vio la intro
    if (localStorage.getItem(INTRO_KEY)) {
      onDone()
      return
    }

    const t0 = setTimeout(() => setPhase(1), 50)
    const t1 = setTimeout(() => setPhase(2), 400)
    const t2 = setTimeout(() => setPhase(3), 1000)
    const t3 = setTimeout(() => setPhase(4), 1800)
    const t4 = setTimeout(finish, 3800)

    return () => [t0, t1, t2, t3, t4].forEach(clearTimeout)
  }, [])

  const handleSkip = (e) => {
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return
    setSkipped(true)
    setTimeout(finish, 300)
  }

  if (skipped && phase !== 5) return null

  return (
    <div
      className={`${styles.overlay} ${phase >= 1 ? styles.visible : ''} ${phase === 5 ? styles.exit : ''}`}
      onClick={handleSkip}
      onKeyDown={handleSkip}
      tabIndex={0}
      role="button"
      aria-label="Omitir introducción"
    >
      {/* Grid de fondo */}
      <div className={styles.gridBg} />

      {/* Líneas de escaneo */}
      <div className={`${styles.scanlines} ${phase >= 2 ? styles.visible : ''}`} />

      {/* Orbs ambientales */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      {/* Partículas */}
      <div className={styles.particles}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={styles.particle} style={{ '--pi': i, '--pn': 20 }} />
        ))}
      </div>

      {/* Centro */}
      <div className={styles.center}>
        {/* Hexágono / logo frame */}
        <div className={`${styles.hexFrame} ${phase >= 3 ? styles.hexIn : ''}`}>
          <div className={styles.hexInner}>
            <span className={styles.hexIcon}>⚡</span>
            <div className={styles.hexRing} />
            <div className={styles.hexRing2} />
          </div>
        </div>

        {/* Nombre */}
        <div className={`${styles.brandWrap} ${phase >= 4 ? styles.brandIn : ''}`}>
          <div className={styles.brandName}>
            <span className={styles.brandPart1}>ASMODEO</span>
            <span className={styles.brandPart2}>DEV</span>
          </div>
          <div className={styles.brandSub}>APK Mods · Juegos · Scripts</div>
        </div>

        {/* Chips de beneficios */}
        <div className={`${styles.chips} ${phase >= 4 ? styles.chipsIn : ''}`}>
          {['🔒 Seguro', '💎 Full Mod', '🆓 Gratis', '⚡ Sin Ads'].map((c, i) => (
            <span key={i} className={styles.chip} style={{ '--ci': i }}>{c}</span>
          ))}
        </div>

        {/* Barra de carga */}
        <div className={`${styles.loader} ${phase >= 4 ? styles.loaderIn : ''}`}>
          <div className={styles.loaderTrack}>
            <div className={`${styles.loaderFill} ${phase >= 4 ? styles.loaderGo : ''}`} />
          </div>
          <span className={styles.loaderLabel}>Iniciando sistema...</span>
        </div>
      </div>

      {/* Skip hint */}
      <div className={`${styles.skipHint} ${phase >= 4 ? styles.skipVisible : ''}`}>
        Toca para continuar
      </div>

      {/* Líneas de esquina (decoración) */}
      <div className={styles.cornerTL} />
      <div className={styles.cornerTR} />
      <div className={styles.cornerBL} />
      <div className={styles.cornerBR} />
    </div>
  )
}
