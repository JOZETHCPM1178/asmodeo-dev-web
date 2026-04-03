// src/components/ui/YouTubeBackground.jsx
// Música de fondo via YouTube IFrame API — completamente oculto
// Maneja autoplay restrictions del navegador con fallback elegante

import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './YouTubeBackground.module.css'

// ID del video configurado en .env (o fallback)
const YT_VIDEO_ID = import.meta.env.VITE_YT_MUSIC_ID || 'jfKfPfyJRdk' // lofi hip hop fallback

// Helper: extrae ID de URL o devuelve el ID directamente
function resolveVideoId(input) {
  if (!input) return null
  if (input.includes('youtube.com') || input.includes('youtu.be')) {
    try {
      const url = new URL(input)
      if (url.hostname.includes('youtu.be')) return url.pathname.slice(1)
      return url.searchParams.get('v')
    } catch { return null }
  }
  return input.trim()
}

export default function YouTubeBackground() {
  const playerRef    = useRef(null)
  const containerRef = useRef(null)
  const [needsTap, setNeedsTap]   = useState(false)
  const [enabled, setEnabled]     = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const resolvedId = resolveVideoId(YT_VIDEO_ID)

  const initPlayer = useCallback(() => {
    if (!resolvedId || !containerRef.current) return

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: resolvedId,
      width: '1',
      height: '1',
      playerVars: {
        autoplay: 1,
        mute: 1,           // Empezar muted para bypass autoplay policy
        loop: 1,
        playlist: resolvedId,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        iv_load_policy: 3,
        modestbranding: 1,
      },
      events: {
        onReady: (e) => {
          e.target.setVolume(35)
          e.target.playVideo()
          // Intentar unmute después de breve delay
          setTimeout(() => {
            try {
              e.target.unMute()
              setEnabled(true)
            } catch {
              // El navegador bloqueó unmute — mostrar aviso
              setNeedsTap(true)
            }
          }, 1200)
        },
        onStateChange: (e) => {
          // Si se pausó por política del navegador, mostrar aviso
          if (e.data === window.YT.PlayerState.PAUSED) {
            setTimeout(() => {
              try { playerRef.current?.playVideo() } catch {}
            }, 500)
          }
        },
        onError: () => {
          // Error de video (privado, eliminado, etc.) — silencio total
          console.warn('[YT Background] Video no disponible:', resolvedId)
        },
      },
    })
  }, [resolvedId])

  useEffect(() => {
    if (!resolvedId) return

    // Si la API ya está cargada
    if (window.YT?.Player) {
      initPlayer()
      return
    }

    // Cargar script de la API
    if (!document.getElementById('yt-iframe-api')) {
      const script = document.createElement('script')
      script.id  = 'yt-iframe-api'
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }

    // Callback global requerido por la API
    const prevCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.()
      initPlayer()
    }

    return () => {
      // Cleanup: destruir player al desmontar
      try { playerRef.current?.destroy() } catch {}
      playerRef.current = null
    }
  }, [resolvedId, initPlayer])

  // Listener global: primer click/tap desbloquea audio
  useEffect(() => {
    if (!needsTap || enabled) return

    const unlock = () => {
      try {
        playerRef.current?.unMute()
        playerRef.current?.setVolume(35)
        setEnabled(true)
        setNeedsTap(false)
      } catch {}
    }

    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('touchstart', unlock, { once: true })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [needsTap, enabled])

  if (!resolvedId) return null

  return (
    <>
      {/* Contenedor oculto del player — posición fuera de pantalla */}
      <div
        style={{
          position: 'fixed',
          width: '1px',
          height: '1px',
          top: '-1px',
          left: '-1px',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
          opacity: 0,
        }}
        aria-hidden="true"
      >
        <div ref={containerRef} />
      </div>

      {/* Aviso premium discreto cuando el navegador bloquea el audio */}
      {needsTap && !dismissed && (
        <div
          className={styles.soundBadge}
          onClick={() => setDismissed(true)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setDismissed(true)}
          aria-label="Toca para activar el sonido"
        >
          <span className={styles.soundIcon}>🎵</span>
          <span className={styles.soundText}>Toca para activar el sonido</span>
          <span className={styles.soundClose} aria-hidden="true">×</span>
        </div>
      )}
    </>
  )
}
