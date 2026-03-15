// src/components/ui/VerifiedBadge.jsx
import styles from './VerifiedBadge.module.css'

export default function VerifiedBadge({ large = false, title = 'Verificado' }) {
  return (
    <span
      className={`${styles.badge} ${large ? styles.large : ''}`}
      title={title}
      aria-label="Verificado"
    >
      {/* Estrella de 8 puntas usando clip-path — forma limpia sin cuadro */}
      <span className={styles.star}>
        <span className={styles.check}>✓</span>
      </span>
      <span className={styles.glow} />
    </span>
  )
}
