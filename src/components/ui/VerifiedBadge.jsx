// src/components/ui/VerifiedBadge.jsx
// Estilo TikTok — gradiente neon rojo + cian, animación sutil
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
          {/* Gradiente neon rojo → cian */}
          <linearGradient id="vGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#ff0044" />
            <stop offset="100%" stopColor="#00e5ff" />
          </linearGradient>
        </defs>
        {/* Círculo relleno con gradiente */}
        <circle cx="12" cy="12" r="10" fill="url(#vGrad)" />
        {/* Check blanco */}
        <polyline
          points="7.5,12.5 10.5,15.5 16.5,9.5"
          fill="none"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
