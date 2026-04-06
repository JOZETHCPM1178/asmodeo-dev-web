// src/pages/MaintenancePage.jsx
import styles from './MaintenancePage.module.css'

export default function MaintenancePage({ message }) {
  const displayMsg = message || 'Estamos mejorando la plataforma para ti.\nVolvemos muy pronto con novedades 🚀'

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <div className={styles.ring} />
          <div className={styles.ring2} />
          <div className={styles.ring3} />
          <span className={styles.icon}>⚡</span>
        </div>

        <h1 className={styles.title}>
          <span className={styles.neon}>ASMODEO</span>
          <span className={styles.titleDev}>DEV</span>
        </h1>

        <div className={styles.badge}>🔧 EN MANTENIMIENTO</div>

        <p className={styles.desc}>
          {displayMsg.split('\n').map((line, i) => (
            <span key={i}>{line}{i < displayMsg.split('\n').length - 1 && <br />}</span>
          ))}
        </p>

        <div className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>

        <p className={styles.footer}>© AsmodeoDev — La plataforma #1 de mods y APKs</p>
      </div>
    </div>
  )
}
