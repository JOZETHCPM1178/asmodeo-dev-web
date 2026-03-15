// src/components/ui/DownloadModal.jsx
// Modal de descarga — el usuario NO sale de la web
import { useState, useEffect } from 'react'
import styles from './DownloadModal.module.css'

export default function DownloadModal({ post, onClose }) {
  const [countdown, setCountdown] = useState(5)
  const [started, setStarted]     = useState(false)

  // Cuenta regresiva y luego descarga automática en iframe oculto
  useEffect(() => {
    if (countdown <= 0) {
      triggerDownload()
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function triggerDownload() {
    if (started) return
    setStarted(true)

    // Descarga usando iframe oculto — NO abre nueva pestaña ni saca de la web
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = post.downloadUrl
    document.body.appendChild(iframe)
    // Limpiar iframe después de 30s
    setTimeout(() => { document.body.removeChild(iframe) }, 30000)
  }

  function handleManual() {
    triggerDownload()
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>⬇️ Descargando</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Info del post */}
        <div className={styles.postInfo}>
          {post.imageUrl && (
            <img src={post.imageUrl} alt={post.name} className={styles.thumb} />
          )}
          <div className={styles.postDetails}>
            <div className={styles.postName}>{post.name}</div>
            {post.version && <div className={styles.postMeta}>📦 Versión {post.version}</div>}
            {post.size    && <div className={styles.postMeta}>💾 {post.size}</div>}
          </div>
        </div>

        {/* Estado descarga */}
        {!started ? (
          <div className={styles.countdownWrap}>
            <div className={styles.countdownCircle}>
              <span className={styles.countdownNum}>{countdown}</span>
            </div>
            <p className={styles.countdownText}>
              La descarga comenzará automáticamente...
            </p>
          </div>
        ) : (
          <div className={styles.downloadingWrap}>
            <div className={styles.downloadIcon}>✅</div>
            <p className={styles.downloadingText}>
              ¡Descarga iniciada! Si no comienza, toca el botón de abajo.
            </p>
          </div>
        )}

        {/* Barra de progreso animada */}
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: started ? '100%' : `${((5 - countdown) / 5) * 100}%` }}
          />
        </div>

        {/* Botones */}
        <div className={styles.actions}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleManual}
            style={{ flex: 1 }}
          >
            ⬇️ {started ? 'Descargar de nuevo' : 'Descargar ahora'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {/* Info */}
        <p className={styles.note}>
          🔒 Archivo alojado en Archive.org — seguro y gratuito
        </p>
      </div>
    </div>
  )
}
