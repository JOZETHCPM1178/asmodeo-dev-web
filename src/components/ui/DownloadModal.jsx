// src/components/ui/DownloadModal.jsx
import { useState, useEffect, useRef } from 'react'
import styles from './DownloadModal.module.css'

const PROXY_BASE = (import.meta.env.VITE_DOWNLOAD_PROXY_URL || '').replace(/\/$/, '')

function isArchive(url)   { return typeof url === 'string' && url.includes('archive.org') }
function isMediafire(url) { return typeof url === 'string' && url.includes('mediafire.com') }
function isDirectLink(url) {
  // Links que podemos descargar directo sin proxy
  if (!url) return false
  const direct = ['.apk', '.zip', '.rar', '.7z', '.apks', '.xapk']
  try {
    const path = new URL(url).pathname.toLowerCase()
    return direct.some(ext => path.endsWith(ext))
  } catch { return false }
}
function needsNewTab(url) {
  if (!url) return false
  return ['mega.nz','mega.co.nz','drive.google.com','dropbox.com','gofile.io','pixeldrain.com']
    .some(d => url.includes(d))
}

export default function DownloadModal({ post, onClose }) {
  const [phase, setPhase]         = useState('ready')
  const [countdown, setCountdown] = useState(4)
  const closedRef  = useRef(false)
  const timerRef   = useRef(null)
  const rawUrl     = post?.downloadUrl || ''

  // Al montar: reset limpio
  useEffect(() => {
    closedRef.current = false
    setPhase('ready')
    setCountdown(4)
    return () => {
      closedRef.current = true
      clearTimer()
    }
  }, []) // eslint-disable-line

  // Abrir links tipo Mega directo al montar
  useEffect(() => {
    if (needsNewTab(rawUrl)) {
      window.open(rawUrl, '_blank', 'noopener,noreferrer')
      safeClose()
    }
  }, []) // eslint-disable-line

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) { doDownload(); return }
    timerRef.current = setTimeout(() => {
      if (!closedRef.current) setCountdown(c => c - 1)
    }, 1000)
    return clearTimer
  }, [phase, countdown]) // eslint-disable-line

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  function safeClose() {
    if (closedRef.current) return
    closedRef.current = true
    clearTimer()
    onClose()
  }

  function handleClose() { safeClose() }

  function handleOverlay(e) {
    if (e.target === e.currentTarget) safeClose()
  }

  function startCountdown() {
    if (closedRef.current) return
    setPhase('countdown')
    setCountdown(4)
  }

  function skipCountdown() {
    clearTimer()
    doDownload()
  }

  function doDownload() {
    if (closedRef.current) return
    setPhase('triggered')

    const url = rawUrl

    // ── Archive.org: window.open directo ──
    // El servidor envía Content-Disposition:attachment así que el navegador
    // descarga el archivo — NO hay riesgo de que descargue HTML.
    // NO usar iframe ni <a download> porque en móvil falla.
    if (isArchive(url)) {
      window.open(url, '_blank', 'noopener,noreferrer')

    // ── MediaFire con proxy configurado ──
    } else if (isMediafire(url) && PROXY_BASE) {
      // El proxy resuelve el redirect y sirve el archivo
      const proxyUrl = `${PROXY_BASE}/dl?url=${encodeURIComponent(url)}`
      window.open(proxyUrl, '_blank', 'noopener,noreferrer')

    // ── MediaFire sin proxy: abrir directo ──
    } else if (isMediafire(url)) {
      window.open(url, '_blank', 'noopener,noreferrer')

    // ── Cualquier otro link ──
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }

    // Marcar como done
    timerRef.current = setTimeout(() => {
      if (!closedRef.current) setPhase('done')
    }, 1200)
  }

  function retry() {
    clearTimer()
    setPhase('ready')
    setCountdown(4)
  }

  // No renderizar si es Mega etc.
  if (needsNewTab(rawUrl)) return null

  if (!rawUrl) return (
    <div className={styles.overlay} onClick={handleOverlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>⬇</div>
            <div><div className={styles.headerTitle}>Sin enlace</div></div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>
        <p style={{ color:'var(--t2)', fontSize:'.85rem', padding:'.5rem 0' }}>
          Esta publicación no tiene archivo disponible.
        </p>
        <button className={styles.cancelBtn} style={{ width:'100%' }} onClick={handleClose}>Cerrar</button>
      </div>
    </div>
  )

  const fileSize = post?.size || null
  const serverLabel = isArchive(rawUrl)
    ? 'archive.org'
    : isMediafire(rawUrl) && PROXY_BASE ? 'AsmodeoDev'
    : isMediafire(rawUrl) ? 'MediaFire'
    : 'servidor externo'

  const pct = phase === 'ready' ? 0
    : phase === 'countdown' ? Math.round(((4 - countdown) / 4) * 65)
    : phase === 'triggered' ? 88
    : 100

  return (
    <div className={styles.overlay} onClick={handleOverlay}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>⬇</div>
            <div>
              <div className={styles.headerTitle}>Descarga directa</div>
              <div className={styles.headerSub}>Desde {serverLabel}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Info archivo */}
        <div className={styles.fileCard}>
          {post?.imageUrl
            ? <img src={post.imageUrl} alt={post?.name} className={styles.fileThumb} />
            : <div className={styles.fileThumbFb}>
                {post?.category === 'games' ? '🎮' : post?.category === 'script' ? '⚙️' : '📱'}
              </div>
          }
          <div className={styles.fileInfo}>
            <div className={styles.fileName}>{post?.name || 'Archivo'}</div>
            <div className={styles.fileMeta}>
              {post?.version && <span>📦 v{post.version}</span>}
              {fileSize      && <span>💾 {fileSize}</span>}
              {post?.category && (
                <span>{post.category === 'apk' ? '📱 APK' : post.category === 'games' ? '🎮 Juego' : '📄 Archivo'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Aviso legal */}
        <div className={styles.warning}>
          <span className={styles.warningIcon}>⚠️</span>
          <div className={styles.warningText}>
            <strong>Solo para uso educativo.</strong> No es legal ni ético. Úsalo bajo tu propio riesgo.
            Verifica en{' '}
            <a href={`https://www.virustotal.com/gui/search/${encodeURIComponent(post?.name || '')}`}
              target="_blank" rel="noopener noreferrer" className={styles.vtLink}>
              VirusTotal
            </a>{' '}
            antes de instalar. Si algo es raro,{' '}
            <button className={styles.reportInline} onClick={handleClose}>reporta la publicación</button>.
          </div>
        </div>

        {/* Estado */}
        <div className={styles.stateBox}>
          {phase === 'ready' && (
            <><div className={styles.stateIcon}>📥</div><p className={styles.stateText}>Listo para descargar</p></>
          )}
          {phase === 'countdown' && (
            <>
              <div className={styles.countdownRing}>
                <svg viewBox="0 0 64 64" className={styles.ringSvg}>
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="#c0002a" />
                      <stop offset="50%"  stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#ff0044" />
                    </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="28" className={styles.ringBg} />
                  <circle cx="32" cy="32" r="28" className={styles.ringFill}
                    style={{ strokeDashoffset: 176 - (176 * ((4 - countdown) / 4)) }} />
                </svg>
                <span className={styles.countdownNum}>{countdown}</span>
              </div>
              <p className={styles.stateText}>Iniciando descarga...</p>
            </>
          )}
          {phase === 'triggered' && (
            <><div className={`${styles.stateIcon} ${styles.bounce}`}>⬇️</div><p className={styles.stateText}>Abriendo descarga...</p></>
          )}
          {phase === 'done' && (
            <><div className={styles.stateIcon}>✅</div><p className={styles.stateText}>¡Descarga iniciada! Revisa tus notificaciones.</p></>
          )}
        </div>

        {/* Progreso */}
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width:`${pct}%` }} />
        </div>

        {/* Botones */}
        <div className={styles.actions}>
          {phase === 'ready' && (
            <button className={styles.dlBtn} onClick={startCountdown}>
              ⬇ Descargar{fileSize ? ` — ${fileSize}` : ''}
            </button>
          )}
          {phase === 'countdown' && (
            <button className={`${styles.dlBtn} ${styles.dlBtnSkip}`} onClick={skipCountdown}>
              ⚡ Descargar ahora
            </button>
          )}
          {(phase === 'triggered' || phase === 'done') && (
            <button className={styles.dlBtn} onClick={retry}>
              🔄 Descargar de nuevo
            </button>
          )}
          <button className={styles.cancelBtn} onClick={handleClose}>Cerrar</button>
        </div>

        <div className={styles.footerNote}>
          {isArchive(rawUrl)
            ? '🔒 Archivo en archive.org · abre en nueva pestaña'
            : isMediafire(rawUrl) && PROXY_BASE
              ? '⚡ Via AsmodeoDev · abre en nueva pestaña'
              : '📂 Abre en nueva pestaña'}
        </div>

      </div>
    </div>
  )
}
