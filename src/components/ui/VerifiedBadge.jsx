// src/components/ui/VerifiedBadge.jsx
// Gradiente carmesí → púrpura infinito (estilo Gojo Satoru)
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
          {/* Carmesí profundo → púrpura vacío infinito (Gojo) */}
          <linearGradient id="vGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#8B0000" />
            <stop offset="40%"  stopColor="#C0006A" />
            <stop offset="100%" stopColor="#4B0082" />
          </linearGradient>
          <radialGradient id="vGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#9B30FF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#4B0082" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#vGlow)" />
        <circle cx="12" cy="12" r="10" fill="url(#vGrad)" />
        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(155,48,255,0.4)" strokeWidth="0.8" />
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
