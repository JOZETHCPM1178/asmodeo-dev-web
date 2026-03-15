// src/components/ui/VerifiedBadge.jsx
// Estrella negra de 8 puntas con ✓ blanco brillante — igual a la imagen
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
      >
        {/* Estrella de 8 puntas negra — misma forma que la imagen */}
        <polygon
          className={styles.star}
          points="
            50,5
            61,35
            93,35
            68,56
            78,88
            50,70
            22,88
            32,56
            7,35
            39,35
          "
        />
        {/* Check blanco grueso centrado */}
        <polyline
          className={styles.check}
          points="32,52 44,64 68,38"
        />
        {/* Brillo diagonal que barre — igual a la foto */}
        <rect
          className={styles.shine}
          x="-120" y="-20"
          width="60" height="140"
          rx="4"
          transform="rotate(-30 50 50)"
        />
      </svg>
    </span>
  )
}
