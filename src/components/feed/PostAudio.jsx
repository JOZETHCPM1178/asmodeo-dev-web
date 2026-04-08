// src/components/feed/PostAudio.jsx
// Audio/video automático por post — estilo TikTok
// - Si el post es tutorial: muestra el video de YouTube en pantalla completa con autoplay
// - Si no es tutorial: reproduce solo el audio en segundo plano (sin video visible)

import { useEffect, useRef, useState } from 'react'
import styles from './PostAudio.module.css'

function extractYouTubeId(input) {
  if (!input) return null
  try {
    if (input.includes('youtube.com') || input.includes('youtu.be')) {
      const url = new URL(input)
      if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('?')[0]
      return url.searchParams.get('v')
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim()
  } catch {}
  return null
}

// Solo un player activo a la vez en toda la app
let globalActivePlayer = null

// YT API ready promise
let ytApiReady = null
function loadYtApi() {
  if (ytApiReady) return ytApiReady
  ytApiReady = new Promise(resolve => {
    if (window.YT && window.YT.Player) { resolve(); return }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve() }
    if (!document.getElementById('yt-api-script')) {
      const s = document.createElement('script')
      s.id = 'yt-api-script'
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    }
  })
  return ytApiReady
}

export default function PostAudio({ youtubeUrl, isActive, category }) {
  const containerRef = useRef(null)
  const playerRef    = useRef(null)
  const mountedRef   = useRef(true)
  const [volume, setVolume] = useState(70)
  const [muted, setMuted]   = useState(false)
  const [playing, setPlaying] = useState(false)
  const [userMuted, setUserMuted] = useState(false)

  const videoId   = extractYouTubeId(youtubeUrl)
  const isTutorial = category === 'tutorials'

  // Para tutoriales mostramos el iframe directamente (manejado en TikTokCard)
  // Este componente solo maneja el audio background para non-tutorials
  // Y también para tutoriales pero en modo audio
  // En ambos casos el iframe está oculto aquí

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      destroyPlayer()
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!videoId || !containerRef.current) return
    loadYtApi().then(() => {
      if (!mountedRef.current || !containerRef.current) return
      createPlayer()
    })
  }, [videoId]) // eslint-disable-line

  function createPlayer() {
    if (playerRef.current) return
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      width: '1', height: '1',
      playerVars: {
        autoplay:       1,   // intenta autoplay
        controls:       0,
        disablekb:      1,
        fs:             0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline:    1,
        rel:            0,
        mute:           0,
      },
      events: {
        onReady(e) {
          if (!mountedRef.current) return
          e.target.setVolume(volume)
          if (isActive) startPlay(e.target)
          else e.target.pauseVideo()
        },
        onStateChange(e) {
          if (!mountedRef.current) return
          setPlaying(e.data === window.YT.PlayerState.PLAYING)
          // Si termina el video, reiniciar (loop de audio)
          if (e.data === window.YT.PlayerState.ENDED) {
            e.target.seekTo(0)
            e.target.playVideo()
          }
        },
        onError() {
          // Error silencioso — no romper la UI
        }
      }
    })
  }

  function startPlay(p) {
    const player = p || playerRef.current
    if (!player) return
    // Parar el player anterior
    if (globalActivePlayer && globalActivePlayer !== player) {
      try { globalActivePlayer.pauseVideo() } catch {}
    }
    globalActivePlayer = player
    try { player.playVideo() } catch {}
  }

  function pausePlay() {
    try { playerRef.current?.pauseVideo() } catch {}
    if (globalActivePlayer === playerRef.current) globalActivePlayer = null
  }

  function destroyPlayer() {
    pausePlay()
    try { playerRef.current?.destroy() } catch {}
    playerRef.current = null
  }

  // Reaccionar a isActive
  useEffect(() => {
    if (!playerRef.current) return
    if (isActive && !userMuted) startPlay()
    else pausePlay()
  }, [isActive]) // eslint-disable-line

  function toggleMute() {
    if (!playerRef.current) return
    if (muted) {
      playerRef.current.unMute()
      playerRef.current.setVolume(volume)
      setUserMuted(false)
    } else {
      playerRef.current.mute()
      setUserMuted(true)
    }
    setMuted(m => !m)
  }

  function handleVolume(e) {
    const v = Number(e.target.value)
    setVolume(v)
    if (!playerRef.current) return
    playerRef.current.setVolume(v)
    if (v > 0 && muted) { playerRef.current.unMute(); setMuted(false); setUserMuted(false) }
    if (v === 0) { setMuted(true) }
  }

  if (!videoId) return null

  return (
    <div className={styles.wrap}>
      {/* Player YT siempre oculto — solo audio */}
      <div ref={containerRef} className={styles.hidden} />

      {/* Control flotante — solo cuando el post es activo */}
      {isActive && (
        <div className={styles.control}>
          {/* Etiqueta: Música o Tutorial */}
          <span className={styles.typeLabel}>
            {isTutorial ? '📺 Tutorial' : '🎵 Música'}
          </span>

          <button className={styles.muteBtn} onClick={toggleMute} title={muted ? 'Activar sonido' : 'Silenciar'}>
            {muted ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
              </svg>
            )}
          </button>

          <input
            type="range" min="0" max="100"
            value={muted ? 0 : volume}
            onChange={handleVolume}
            className={styles.slider}
          />

          {playing && !muted && (
            <div className={styles.bars}>
              <span /><span /><span /><span />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
