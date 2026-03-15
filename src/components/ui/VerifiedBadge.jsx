// src/components/ui/VerifiedBadge.jsx
// ════════════════════════════════════════
//  VERIFIED BADGE — Estilo Telegram con animación
// ════════════════════════════════════════
import styles from './VerifiedBadge.module.css'

/**
 * @param {boolean} large - Versión grande para perfil
 * @param {string}  title - Tooltip al pasar el mouse
 */
export default function VerifiedBadge({ large = false, title = 'Verificado' }) {
  return (
    <span
      className={`${styles.badge} ${large ? styles.large : ''}`}
      title={title}
      aria-label="Verificado"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.svg}
      >
        {/* Forma de escudo/estrella rellena */}
        <path
          d="M12 2L14.39 8.26L21 9.27L16.5 13.64L17.77 20.23L12 17.27L6.23 20.23L7.5 13.64L3 9.27L9.61 8.26L12 2Z"
          fill="currentColor"
        />
        {/* Check interno */}
        <path
          d="M9 12L11 14L15.5 9.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {/* Brillo animado */}
      <span className={styles.shine} />
    </span>
  )
}
