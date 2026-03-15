// src/components/ui/VerifiedBadge.jsx
import styles from './VerifiedBadge.module.css'

export default function VerifiedBadge({ large = false, title = 'Verificado' }) {
  return (
    <span
      className={`${styles.wrap} ${large ? styles.large : ''}`}
      title={title}
      aria-label="Verificado"
    >
      <svg
        className={styles.svg}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'hidden' }}
      >
        {/* Filtro de glow rojo neon para el borde exterior */}
        <defs>
          <filter id="redGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feColorMatrix type="matrix"
              values="3 0 0 0 0.6
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              in="blur" result="redBlur" />
            <feMerge>
              <feMergeNode in="redBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Clip para que el brillo no salga fuera de la estrella */}
          <clipPath id="starClip">
            <polygon points="50,5 61,35 93,35 68,56 78,88 50,70 22,88 32,56 7,35 39,35" />
          </clipPath>
        </defs>

        {/* Estrella negra con glow rojo neon */}
        <polygon
          className={styles.star}
          points="50,5 61,35 93,35 68,56 78,88 50,70 22,88 32,56 7,35 39,35"
          filter="url(#redGlow)"
        />

        {/* Check blanco brillante */}
        <polyline
          className={styles.check}
          points="32,52 44,64 68,38"
        />

        {/* Brillo blanco diagonal que barre — CLIPADO a la forma de la estrella */}
        <rect
          className={styles.shine}
          x="-30" y="-10"
          width="40" height="120"
          fill="white"
          opacity="0"
          clipPath="url(#starClip)"
          transform="rotate(-35 50 50)"
        />
      </svg>
    </span>
  )
}
