// src/components/ui/DownloadModal.jsx
import { useState, useEffect } from 'react'
import styles from './DownloadModal.module.css'

// Detectar si es link externo (Mediafire, Mega, Drive, etc.)
function isExternalLink(url) {
  if (!url) return false
  const external = ['mediafire.com', 'mega.nz', 'mega.co.nz', 'drive.google.com',
    'dropbox.com', 'onedrive.live.com', '1drv.ms', 'zippyshare.com',
    'gofile.io', 'pixeldrain.com', 'anonfiles.com', 'uploadhaven.com',
    'sendspace.com', 'file.io', 'transfer.sh', 'wetransfer.com']
  return external.some(d => url.includes(d))
}

export default function DownloadModal({ post, onClose }) {
  const [countdown, setCountdown] = useState(5)
  const [started, setStarted]     = useState(false)
  const isExternal = isExternalLink(post.downloadUrl)

  useEffect(() => {
    // Si es externo, abrir directo sin countdown
    if (isExternal) {
      window.open(post.downloadUrl, '_blank', 'noopener,noreferrer')
      onClose()
      return
    }
    if (countdown <= 0) {
      triggerDownload()
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, isExternal])

  async function triggerDownload() {
    if (started) return
    setStarted(true)

    const url = post.downloadUrl || ''
    const filename = post.name ? post.name.replace(/[^a-z0-9._-]/gi, '_') + '.apk' : 'download.apk'

    if (url.includes('archive.org')) {
      // Archive.org — descargar como blob para que no salga de la web
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error('fetch failed')
        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
      } catch {
        // Si fetch falla por CORS, fallback a nueva pestaña
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      return
    }

    // Links externos — nueva pestaña
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleManual() {
    setStarted(false)
    setTimeout(() => triggerDownload(), 100)
  }

  // Si es externo ya cerró, no renderizar nada
  if (isExternal) return null

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>⬇️ Descargando</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

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
              ¡Descarga iniciada! Si no comienza, toca el botón de abajo.
            </p>
          </div>
        )}

        <div className={styles.progressBar}>
          <div className={styles.progressFill}
            style={{ width: started ? '100%' : `${((5 - countdown) / 5) * 100}%` }} />
        </div>

        <div className={styles.actions}>
          <button className="btn btn-primary btn-lg" onClick={handleManual} style={{ flex: 1 }}>
            ⬇️ {started ? 'Descargar de nuevo' : 'Descargar ahora'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>

        <p className={styles.note}>🔒 Archivo alojado en Archive.org — seguro y gratuito</p>
      </div>
    </div>
  )
}
