// src/components/ui/VerifiedBadge.jsx
import styles from './VerifiedBadge.module.css'

export default function VerifiedBadge({ large = false, title = 'Verificado' }) {
  return (
    <span
      className={`${styles.badge} ${large ? styles.large : ''}`}
      title={title}
      aria-label="Verificado"
    >
      {/* Estrella negra de 8 puntas — igual que Telegram */}
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={styles.svg}>
        {/* Forma de estrella/escudo de 8 puntas */}
        <path
          className={styles.star}
          d="M12 2
             L13.8 7.2 L19.2 5.8 L17.2 10.8
             L22 12 L17.2 13.2 L19.2 18.2
             L13.8 16.8 L12 22
             L10.2 16.8 L4.8 18.2 L6.8 13.2
             L2 12 L6.8 10.8 L4.8 5.8
             L10.2 7.2 Z"
        />
        {/* Checkmark blanco */}
        <path
          className={styles.check}
          d="M8.5 12.5 L11 15 L15.5 9.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {/* Brillo que barre */}
      <span className={styles.shine} />
    </span>
  )
}
