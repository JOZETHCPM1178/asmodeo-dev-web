// src/components/ui/VerifiedBadge.jsx
import styles from './VerifiedBadge.module.css'

export default function VerifiedBadge({ large = false, title = 'Verificado' }) {
  return (
    <span
      className={`${styles.badge} ${large ? styles.large : ''}`}
      title={title}
      aria-label="Verificado"
    >
      <svg
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.svg}
      >
        {/* Estrella negra de 8 puntas — igual Telegram */}
        <path
          fill="#1a1a1a"
          d="M12 1.5
             L14.2 7.8 L20.8 6.2 L18.5 12.0
             L22.5 16.5 L16.0 16.8 L14.2 23.0
             L9.8 18.5 L3.5 20.5 L5.5 14.2
             L1.5 9.8 L8.0 8.5 Z"
        />
        {/* Check blanco grueso */}
        <polyline
          points="8,12.5 11,15.5 16,9"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.shine} />
    </span>
  )
}
