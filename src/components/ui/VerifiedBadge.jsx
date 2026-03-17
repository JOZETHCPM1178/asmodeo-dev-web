// src/components/ui/VerifiedBadge.jsx
import styles from './VerifiedBadge.module.css'

export default function VerifiedBadge({ large = false, title = 'Verificado' }) {
  return (
    <span
      className={`${styles.badge} ${large ? styles.large : ''}`}
      title={title}
      aria-label="Verificado"
    >
      <svg viewBox="0 0 24 24" className={styles.svg} xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Carmesí → púrpura vacío */}
          <linearGradient id="vGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#8B0000" />
            <stop offset="45%"  stopColor="#B0004A" />
            <stop offset="100%" stopColor="#4B0082" />
          </linearGradient>
          {/* Glow interior */}
          <radialGradient id="vInner" cx="50%" cy="40%" r="55%">
            <stop offset="0%"   stopColor="#D0006A" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#4B0082" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Círculo base */}
        <circle cx="12" cy="12" r="10" fill="url(#vGrad)" />
        {/* Brillo interior */}
        <circle cx="12" cy="12" r="10" fill="url(#vInner)" />
        {/* Borde púrpura sutil */}
        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(155,48,255,0.35)" strokeWidth="0.7" />

        {/* ── Rayos decorativos ── */}
        {/* Rayo pequeño arriba-izquierda */}
        <path d="M6.5 4.5 L5.2 6.8 L6.8 6.4 L5.8 8.5"
          fill="none" stroke="rgba(255,180,200,0.7)" strokeWidth="0.75"
          strokeLinecap="round" strokeLinejoin="round" className={styles.bolt1} />
        {/* Rayo pequeño arriba-derecha */}
        <path d="M17.5 4.5 L18.8 6.8 L17.2 6.4 L18.2 8.5"
          fill="none" stroke="rgba(200,140,255,0.7)" strokeWidth="0.75"
          strokeLinecap="round" strokeLinejoin="round" className={styles.bolt2} />
        {/* Destello pequeño abajo-derecha */}
        <path d="M18.5 16 L19.5 17.8 L18.2 17.5 L19 19"
          fill="none" stroke="rgba(180,100,255,0.55)" strokeWidth="0.65"
          strokeLinecap="round" strokeLinejoin="round" className={styles.bolt3} />
        {/* Chispa izquierda */}
        <path d="M4.5 14 L3.5 15.5 L4.8 15.2"
          fill="none" stroke="rgba(255,160,190,0.5)" strokeWidth="0.65"
          strokeLinecap="round" strokeLinejoin="round" className={styles.bolt4} />

        {/* Check blanco principal */}
        <polyline
          points="7.5,12.5 10.5,15.5 16.5,9.5"
          fill="none"
          stroke="white"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Brillo en el check */}
        <polyline
          points="7.5,12.5 10.5,15.5 16.5,9.5"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
