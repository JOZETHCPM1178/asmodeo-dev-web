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
  const closedRef  = useRef(false)   // true = onClose ya fue llamado, ignorar todo
  const timerRef   = useRef(null)
  const rawUrl     = post?.downloadUrl || ''

  // Montaje: reset. Desmontaje: cleanup.
  useEffect(() => {
    closedRef.current = false
    return () => {
      closedRef.current = true
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    }
  }, []) // eslint-disable-line

  // Abrir links externos directamente y cerrar
  useEffect(() => {
    if (needsNewTab(rawUrl) && rawUrl) {
      window.open(rawUrl, '_blank', 'noopener,noreferrer')
      closeModal()
    }
  }, []) // eslint-disable-line

  // Countdown tick
  useEffect(() => {
    if (phase !== 'countdown' || closedRef.current) return
    if (countdown <= 0) { triggerDownload(); return }
    timerRef.current = setTimeout(() => {
      if (!closedRef.current) setCountdown(c => c - 1)
    }, 1000)
    return () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null } }
  }, [phase, countdown]) // eslint-disable-line

  function closeModal() {
    // Guardia: si ya cerramos, no hacer nada más
    if (closedRef.current) return
    closedRef.current = true
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    // Llamar onClose en el siguiente tick para que React termine el render actual
    Promise.resolve().then(() => onClose())
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) closeModal()
  }

  function startCountdown() {
    if (closedRef.current) return
    setPhase('countdown')
    setCountdown(4)
  }

  function skipCountdown() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    triggerDownload()
  }

  function retryDownload() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setPhase('ready')
    setCountdown(4)
  }

  function triggerDownload() {
    if (closedRef.current) return
    setPhase('triggered')

    if (isArchive(rawUrl)) {
      // Archive.org: iframe oculto — el servidor manda Content-Disposition:attachment
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'display:none!important;position:fixed;left:-9999px;top:-9999px;width:0;height:0;border:0;'
      iframe.src = rawUrl
      document.body.appendChild(iframe)
      setTimeout(() => { try { document.body.removeChild(iframe) } catch {} }, 120_000)
    } else {
      // MediaFire u otro: nueva pestaña
      window.open(rawUrl, '_blank', 'noopener,noreferrer')
    }

    timerRef.current = setTimeout(() => {
      if (!closedRef.current) setPhase('done')
    }, 1200)
  }

  // Links tipo Mega: se abren en el useEffect de arriba, no renderizar nada
  if (needsNewTab(rawUrl)) return null

  if (!rawUrl) return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>⬇</div>
            <div><div className={styles.headerTitle}>Sin enlace</div></div>
          </div>
          <button className={styles.closeBtn} onClick={closeModal}>✕</button>
        </div>
        <p style={{ color:'var(--t2)', fontSize:'.85rem', padding:'.5rem 0' }}>
          Esta publicación no tiene archivo disponible.
        </p>
        <button className={styles.cancelBtn} style={{ width:'100%' }} onClick={closeModal}>Cerrar</button>
      </div>
    </div>
  )

  const fileSize    = post?.size || null
  const serverLabel = isArchive(rawUrl)
    ? 'archive.org'
    : isMediafire(rawUrl) ? 'MediaFire'
    : 'servidor externo'

  const pct = phase === 'ready' ? 0
    : phase === 'countdown' ? Math.round(((4 - countdown) / 4) * 65)
    : phase === 'triggered' ? 88
    : 100

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      {/* stopPropagation en el modal para que clicks internos no cierren */}
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>⬇</div>
            <div>
              <div className={styles.headerTitle}>Descarga directa</div>
              <div className={styles.headerSub}>Desde {serverLabel}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={closeModal} aria-label="Cerrar">✕</button>
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
                <span>
                  {post.category === 'apk' ? '📱 APK'
                   : post.category === 'games' ? '🎮 Juego'
                   : post.category === 'tutorials' ? '📺 Tutorial'
                   : '📄 Archivo'}
                </span>
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
            <button className={styles.reportInline} onClick={closeModal}>reporta la publicación</button>.
          </div>
        </div>

        <div className={styles.stateBox}>
          {phase === 'ready' && (
            <><div className={styles.stateIcon}>📥</div>
            <p className={styles.stateText}>Listo para descargar</p></>
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
                : '¡Listo! Busca el archivo en tu gestor de descargas.'}
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
            <button className={styles.dlBtn} onClick={retryDownload}>
              🔄 Descargar de nuevo
            </button>
          )}
          <button className={styles.cancelBtn} onClick={closeModal}>Cerrar</button>
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
