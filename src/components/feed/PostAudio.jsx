// src/components/feed/PostAudio.jsx
// Reproduce el audio de YouTube de un post de forma oculta.
// Se monta cuando el post es visible (isActive=true) y se para al desmontarse.

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
    // Si ya es un ID directo (11 chars alfanuméricos)
    if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim()
  } catch {}
  return null
}

// Singleton: solo un player YT activo a la vez
let activePlayer = null

export default function PostAudio({ youtubeUrl, isActive, postId }) {
  const containerRef = useRef(null)
  const playerRef    = useRef(null)
  const [volume, setVolume]     = useState(60)
  const [muted, setMuted]       = useState(false)
  const [ready, setReady]       = useState(false)
  const [playing, setPlaying]   = useState(false)

  const videoId = extractYouTubeId(youtubeUrl)

  // Cargar YT IFrame API si no está cargada
  useEffect(() => {
    if (!videoId) return
    if (window.YT && window.YT.Player) {
      initPlayer()
      return
    }
    if (!document.getElementById('yt-api-script')) {
      const script = document.createElement('script')
      script.id = 'yt-api-script'
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }
    window.onYouTubeIframeAPIReady = () => {
      if (containerRef.current) initPlayer()
    }
    return () => {}
  }, [videoId]) // eslint-disable-line

  function initPlayer() {
    if (!containerRef.current || !videoId) return
    if (playerRef.current) return // ya inicializado

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      width: '1', height: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady: (e) => {
          e.target.setVolume(volume)
          setReady(true)
          if (isActive) play(e.target)
        },
        onStateChange: (e) => {
          setPlaying(e.data === window.YT.PlayerState.PLAYING)
        },
      },
    })
  }

  function play(p) {
    const player = p || playerRef.current
    if (!player) return
    // Parar el player anterior si existe
    if (activePlayer && activePlayer !== player) {
      try { activePlayer.pauseVideo() } catch {}
    }
    activePlayer = player
    try { player.playVideo() } catch {}
  }

  function pause() {
    try { playerRef.current?.pauseVideo() } catch {}
    if (activePlayer === playerRef.current) activePlayer = null
  }

  // Reaccionar a isActive
  useEffect(() => {
    if (!ready) return
    if (isActive) play()
    else pause()
  }, [isActive, ready]) // eslint-disable-line

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      pause()
      try { playerRef.current?.destroy() } catch {}
      playerRef.current = null
    }
  }, []) // eslint-disable-line

  function toggleMute() {
    if (!playerRef.current) return
    if (muted) {
      playerRef.current.unMute()
      playerRef.current.setVolume(volume)
    } else {
      playerRef.current.mute()
    }
    setMuted(m => !m)
  }

  function handleVolume(e) {
    const v = Number(e.target.value)
    setVolume(v)
    playerRef.current?.setVolume(v)
    if (v > 0 && muted) { playerRef.current?.unMute(); setMuted(false) }
    if (v === 0) setMuted(true)
  }

  if (!videoId) return null

  return (
    <div className={styles.wrap}>
      {/* Player YT oculto */}
      <div ref={containerRef} className={styles.hidden} />

      {/* Control de audio visible en el post */}
      {isActive && (
        <div className={styles.control}>
          <button className={styles.muteBtn} onClick={toggleMute}>
            {muted || volume === 0 ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
              </svg>
            )}
          </button>
          <input
            type="range" min="0" max="100" value={muted ? 0 : volume}
            onChange={handleVolume}
            className={styles.slider}
          />
          {playing && <span className={styles.note}>♪</span>}
        </div>
      )}
    </div>
  )
}
