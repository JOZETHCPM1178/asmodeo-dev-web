// src/pages/MaintenancePage.jsx
import styles from './MaintenancePage.module.css'

export default function MaintenancePage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* Icono animado rainbow */}
        <div className={styles.iconWrap}>
          <div className={styles.ring} />
          <div className={styles.ring2} />
          <div className={styles.ring3} />
          <span className={styles.icon}>⚡</span>
        </div>

        <h1 className={styles.title}>
          <span className={styles.rainbow}>ASMODEO</span>
          <span className={styles.titleDev}>DEV</span>
        </h1>

        <div className={styles.badge}>🔧 EN MANTENIMIENTO</div>

        <p className={styles.desc}>
          Estamos mejorando la plataforma para ti.<br />
          Volvemos muy pronto con novedades 🚀
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
