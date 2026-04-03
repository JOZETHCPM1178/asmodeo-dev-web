// src/components/ui/DownloadModal.jsx
import { useState, useEffect, useRef } from 'react'
import styles from './DownloadModal.module.css'

const PROXY_BASE = import.meta.env.VITE_DOWNLOAD_PROXY_URL || ''

function isMediafire(url) { return url?.includes('mediafire.com') }
function isArchive(url)   { return url?.includes('archive.org') }
function isExternal(url)  {
  if (!url) return false
  const ext = ['mega.nz','mega.co.nz','drive.google.com','dropbox.com','gofile.io','pixeldrain.com','sendspace.com']
  return ext.some(d => url.includes(d))
}

// Construye URL de proxy si está configurado, si no usa la original
function buildDownloadUrl(originalUrl) {
  if (!PROXY_BASE || !originalUrl) return originalUrl
  if (isMediafire(originalUrl) || isArchive(originalUrl)) {
    return `${PROXY_BASE}/dl?url=${encodeURIComponent(originalUrl)}`
  }
  return originalUrl
}

export default function DownloadModal({ post, onClose }) {
  const [phase, setPhase]       = useState('ready')   // ready | countdown | downloading | done
  const [countdown, setCountdown] = useState(4)
  const iframeRef               = useRef(null)

  const rawUrl    = post.downloadUrl
  const proxyUrl  = buildDownloadUrl(rawUrl)
  const useProxy  = proxyUrl !== rawUrl
  const external  = isExternal(rawUrl) && !isMediafire(rawUrl) && !isArchive(rawUrl)

  // Links que no podemos proxear: abrir en nueva pestaña directo
  useEffect(() => {
    if (external) {
      window.open(rawUrl, '_blank', 'noopener,noreferrer')
      onClose()
    }
  }, [])

  // Countdown automático
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) { triggerDownload(); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown])

  function startCountdown() {
    setPhase('countdown')
    setCountdown(4)
  }

  function triggerDownload() {
    if (phase === 'downloading' || phase === 'done') return
    setPhase('downloading')

    if (useProxy) {
      // Descarga directa via <a> con el proxy — el navegador descarga sin salir
      const a = document.createElement('a')
      a.href = proxyUrl
      a.download = (post.name || 'archivo').replace(/[^a-z0-9\-_.]/gi, '_') + '.apk'
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else {
      // Sin proxy: iframe oculto (descarga directa archive.org / mediafire)
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'display:none;width:0;height:0;border:none;position:absolute;'
      iframe.src = rawUrl
      document.body.appendChild(iframe)
      setTimeout(() => { try { document.body.removeChild(iframe) } catch {} }, 120000)
    }

    setTimeout(() => setPhase('done'), 1200)
  }

  if (external) return null

  const fileName = post.name || 'archivo'
  const fileSize = post.size || null
  const progress = phase === 'ready' ? 0 : phase === 'countdown' ? ((4 - countdown) / 4) * 70 : phase === 'downloading' ? 90 : 100

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>⬇</div>
            <div>
              <div className={styles.headerTitle}>Descarga directa</div>
              <div className={styles.headerSub}>Desde {useProxy ? 'AsmodeoDev' : isArchive(rawUrl) ? 'archive.org' : 'servidor externo'}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Info del archivo */}
        <div className={styles.fileCard}>
          {post.imageUrl && <img src={post.imageUrl} alt={fileName} className={styles.fileThumb} />}
          <div className={styles.fileInfo}>
            <div className={styles.fileName}>{fileName}</div>
            <div className={styles.fileMeta}>
              {post.version && <span>📦 v{post.version}</span>}
              {fileSize    && <span>💾 {fileSize}</span>}
              {post.category && <span>{post.category === 'apk' ? '📱 APK' : post.category === 'games' ? '🎮 Juego' : '📄 Archivo'}</span>}
            </div>
          </div>
        </div>

        {/* Aviso de seguridad (siempre visible) */}
        <div className={styles.warning}>
          <span className={styles.warningIcon}>⚠️</span>
          <div className={styles.warningText}>
            <strong>Este contenido es solo para uso educativo.</strong> No es legal ni ético. Úsalo bajo tu propio riesgo.
            Verifica en <a href={`https://www.virustotal.com/gui/search/${encodeURIComponent(post.name || '')}`}
              target="_blank" rel="noopener noreferrer" className={styles.vtLink}>VirusTotal</a> antes
            de instalar. Si detectas algo raro,{' '}
            <span className={styles.reportLink} onClick={onClose}>reporta la publicación</span>.
          </div>
        </div>

        {/* Estado central */}
        {phase === 'ready' && (
          <div className={styles.stateBox}>
            <div className={styles.stateIcon}>📥</div>
            <p className={styles.stateText}>Listo para descargar</p>
          </div>
        )}

        {phase === 'countdown' && (
          <div className={styles.stateBox}>
            <div className={styles.countdownRing}>
              <svg viewBox="0 0 60 60" className={styles.ringsvg}>
                <circle cx="30" cy="30" r="26" className={styles.ringBg} />
                <circle cx="30" cy="30" r="26" className={styles.ringFill}
                  style={{ strokeDashoffset: 163 - (163 * (4 - countdown) / 4) }} />
              </svg>
              <span className={styles.countdownNum}>{countdown}</span>
            </div>
            <p className={styles.stateText}>Iniciando descarga...</p>
          </div>
        )}

        {phase === 'downloading' && (
          <div className={styles.stateBox}>
            <div className={styles.stateIcon} style={{ animation: 'float 1s ease-in-out infinite' }}>⬇️</div>
            <p className={styles.stateText}>Descargando archivo...</p>
          </div>
        )}

        {phase === 'done' && (
          <div className={styles.stateBox}>
            <div className={styles.stateIcon}>✅</div>
            <p className={styles.stateText}>¡Descarga iniciada! Revisa tus notificaciones.</p>
          </div>
        )}

        {/* Barra de progreso */}
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* Acciones */}
        <div className={styles.actions}>
          {phase === 'ready' && (
            <button className={styles.dlBtn} onClick={startCountdown}>
              ⬇ Descargar{fileSize ? ` — ${fileSize}` : ''}
            </button>
          )}
          {(phase === 'done' || phase === 'downloading') && (
            <button className={styles.dlBtn} onClick={() => { setPhase('ready') }}>
              🔄 Descargar de nuevo
            </button>
          )}
          <button className={styles.cancelBtn} onClick={onClose}>Cerrar</button>
        </div>

        <div className={styles.footerNote}>
          {useProxy
            ? '⚡ Descarga directa desde AsmodeoDev — sin salir de la web'
            : '🔒 Archivo alojado en archive.org — gratuito y seguro'}
        </div>
      </div>
    </div>
  )
}
