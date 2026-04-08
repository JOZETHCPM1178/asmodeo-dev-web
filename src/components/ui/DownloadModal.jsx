// src/components/ui/DownloadModal.jsx
import { useState, useEffect, useRef } from 'react'
import styles from './DownloadModal.module.css'

function isArchive(url)   { return typeof url === 'string' && url.includes('archive.org') }
function isMediafire(url) { return typeof url === 'string' && url.includes('mediafire.com') }
function needsNewTab(url) {
  if (!url) return false
  return ['mega.nz','mega.co.nz','drive.google.com','dropbox.com','gofile.io','pixeldrain.com']
    .some(d => url.includes(d))
}

export default function DownloadModal({ post, onClose }) {
  const [phase, setPhase]         = useState('ready')
  const [countdown, setCountdown] = useState(4)
  // Usamos una ref para saber si ya se llamó onClose — evita doble llamada
  const doneRef  = useRef(false)
  const timerRef = useRef(null)
  const rawUrl   = post?.downloadUrl || ''

  // Reset limpio al montar
  useEffect(() => {
    doneRef.current = false
    setPhase('ready')
    setCountdown(4)
    return () => {
      doneRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, []) // eslint-disable-line

  // Mega/Drive: abrir y cerrar
  useEffect(() => {
    if (needsNewTab(rawUrl)) {
      window.open(rawUrl, '_blank', 'noopener,noreferrer')
      close()
    }
  }, []) // eslint-disable-line

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) { doDownload(); return }
    timerRef.current = setTimeout(() => {
      if (!doneRef.current) setCountdown(c => c - 1)
    }, 1000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [phase, countdown]) // eslint-disable-line

  // Cierre — UNA sola vez, sin importar cuántas veces se llame
  function close() {
    if (doneRef.current) return
    doneRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    // Pequeño delay para que React pueda procesar el estado antes de desmontar
    setTimeout(() => onClose(), 0)
  }

  function handleOverlay(e) {
    if (e.target === e.currentTarget) close()
  }

  function startCountdown() {
    if (doneRef.current) return
    setPhase('countdown')
    setCountdown(4)
  }

  function skipCountdown() {
    if (timerRef.current) clearTimeout(timerRef.current)
    doDownload()
  }

  function retry() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setPhase('ready')
    setCountdown(4)
  }

  function doDownload() {
    if (doneRef.current) return
    setPhase('triggered')

    if (isArchive(rawUrl)) {
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'display:none!important;position:fixed;left:-9999px;top:-9999px;width:0;height:0;border:0;'
      iframe.src = rawUrl
      document.body.appendChild(iframe)
      setTimeout(() => { try { document.body.removeChild(iframe) } catch {} }, 120_000)
    } else {
      window.open(rawUrl, '_blank', 'noopener,noreferrer')
    }

    timerRef.current = setTimeout(() => {
      if (!doneRef.current) setPhase('done')
    }, 1200)
  }

  if (needsNewTab(rawUrl)) return null

  if (!rawUrl) return (
    <div className={styles.overlay} onClick={handleOverlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>⬇</div>
            <div><div className={styles.headerTitle}>Sin enlace</div></div>
          </div>
          <button className={styles.closeBtn} onClick={close}>✕</button>
        </div>
        <p style={{ color:'var(--t2)', fontSize:'.85rem', padding:'.5rem 0' }}>
          Esta publicación no tiene archivo disponible.
        </p>
        <button className={styles.cancelBtn} style={{ width:'100%' }} onClick={close}>Cerrar</button>
      </div>
    </div>
  )

  const fileSize   = post?.size || null
  const serverLabel = isArchive(rawUrl) ? 'archive.org'
    : isMediafire(rawUrl) ? 'MediaFire'
    : 'servidor externo'

  const pct = phase === 'ready' ? 0
    : phase === 'countdown' ? Math.round(((4 - countdown) / 4) * 65)
    : phase === 'triggered' ? 88
    : 100

  return (
    <div className={styles.overlay} onClick={handleOverlay}>
      <div className={styles.modal}>

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>⬇</div>
            <div>
              <div className={styles.headerTitle}>Descarga directa</div>
              <div className={styles.headerSub}>Desde {serverLabel}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={close} aria-label="Cerrar">✕</button>
        </div>

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
            <button className={styles.reportInline} onClick={close}>reporta la publicación</button>.
          </div>
        </div>

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
            <><div className={`${styles.stateIcon} ${styles.bounce}`}>⬇️</div>
            <p className={styles.stateText}>
              {isArchive(rawUrl) ? 'Descargando...' : 'Abriendo en nueva pestaña...'}
            </p></>
          )}
          {phase === 'done' && (
            <><div className={styles.stateIcon}>✅</div>
            <p className={styles.stateText}>
              {isArchive(rawUrl)
                ? '¡Descarga iniciada! Revisa tus notificaciones.'
                : '¡Se abrió! Toca el botón de descarga ahí.'}
            </p></>
          )}
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width:`${pct}%` }} />
        </div>

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
          <button className={styles.cancelBtn} onClick={close}>Cerrar</button>
        </div>

        <div className={styles.footerNote}>
          {isArchive(rawUrl)
            ? '🔒 Descarga directa desde archive.org'
            : '📂 Se abrirá en nueva pestaña'}
        </div>
      </div>
    </div>
  )
}
