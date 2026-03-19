// src/components/ui/DownloadModal.jsx
import { useState, useEffect } from 'react'
import styles from './DownloadModal.module.css'

function isExternalLink(url) {
  if (!url) return false
  const external = ['mediafire.com','mega.nz','mega.co.nz','drive.google.com',
    'dropbox.com','onedrive.live.com','1drv.ms','gofile.io','pixeldrain.com',
    'sendspace.com','wetransfer.com','zippyshare.com']
  return external.some(d => url.includes(d))
}

export default function DownloadModal({ post, onClose }) {
  const [countdown, setCountdown] = useState(5)
  const [started, setStarted]     = useState(false)
  const isExternal = isExternalLink(post.downloadUrl)

  // Links externos — abrir directo y cerrar
  useEffect(() => {
    if (!isExternal) return
    window.open(post.downloadUrl, '_blank', 'noopener,noreferrer')
    onClose()
  }, [])

  // Countdown para Archive.org
  useEffect(() => {
    if (isExternal || started) return
    if (countdown <= 0) { triggerDownload(); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, isExternal, started])

  function triggerDownload() {
    if (started) return
    setStarted(true)
    // Iframe oculto — la descarga empieza sin salir de la web
    // Archive.org envía Content-Disposition: attachment que el navegador
    // intercepta como descarga directa
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'display:none;width:0;height:0;border:none;position:absolute;'
    iframe.src = post.downloadUrl
    document.body.appendChild(iframe)
    // Limpiar después de 2 minutos
    setTimeout(() => { try { document.body.removeChild(iframe) } catch {} }, 120000)
  }

  if (isExternal) return null

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        <div className={styles.header}>
          <h2 className={styles.title}>⬇️ Descargando</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.postInfo}>
          {post.imageUrl && <img src={post.imageUrl} alt={post.name} className={styles.thumb} />}
          <div className={styles.postDetails}>
            <div className={styles.postName}>{post.name}</div>
            {post.version && <div className={styles.postMeta}>📦 Versión {post.version}</div>}
            {post.size    && <div className={styles.postMeta}>💾 {post.size}</div>}
          </div>
        </div>

        {!started ? (
          <div className={styles.countdownWrap}>
            <div className={styles.countdownCircle}>
              <span className={styles.countdownNum}>{countdown}</span>
            </div>
            <p className={styles.countdownText}>La descarga comenzará automáticamente...</p>
          </div>
        ) : (
          <div className={styles.downloadingWrap}>
            <div className={styles.downloadIcon}>✅</div>
            <p className={styles.downloadingText}>
              ¡Descarga iniciada! Revisa las notificaciones de tu navegador.
            </p>
          </div>
        )}

        <div className={styles.progressBar}>
          <div className={styles.progressFill}
            style={{ width: started ? '100%' : `${((5 - countdown) / 5) * 100}%` }} />
        </div>

        <div className={styles.actions}>
          <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
            onClick={() => { setStarted(false); setTimeout(triggerDownload, 100) }}>
            ⬇️ {started ? 'Descargar de nuevo' : 'Descargar ahora'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>

        <p className={styles.note}>🔒 Archivo alojado en Archive.org — seguro y gratuito</p>
      </div>
    </div>
  )
}
