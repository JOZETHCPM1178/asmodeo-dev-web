// src/components/ui/MusicPlayer.jsx
import { useState, useRef, useEffect } from 'react'
import styles from './MusicPlayer.module.css'

const TRACKS = [
  { title: 'Neon Pulse',      artist: 'ASMODEO DEV', src: 'https://cdn.pixabay.com/audio/2024/02/15/audio_6ecd18df9e.mp3' },
  { title: 'Cyber Drive',     artist: 'ASMODEO DEV', src: 'https://cdn.pixabay.com/audio/2023/10/30/audio_6f44af4e32.mp3' },
  { title: 'Dark Matter',     artist: 'ASMODEO DEV', src: 'https://cdn.pixabay.com/audio/2023/06/14/audio_5e3929b2f5.mp3' },
  { title: 'Synthwave Night', artist: 'ASMODEO DEV', src: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3' },
]

export default function MusicPlayer() {
  const [open,       setOpen]       = useState(false)
  const [playing,    setPlaying]    = useState(false)
  const [trackIdx,   setTrackIdx]   = useState(0)
  const [volume,     setVolume]     = useState(0.4)
  const [progress,   setProgress]   = useState(0)
  const [duration,   setDuration]   = useState(0)
  const [loading,    setLoading]    = useState(false)
  const audioRef = useRef(null)

  const track = TRACKS[trackIdx]

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.volume = volume
    a.loop = false
    const onTime    = () => setProgress(a.currentTime)
    const onMeta    = () => setDuration(a.duration)
    const onEnded   = () => next()
    const onWaiting = () => setLoading(true)
    const onPlaying = () => setLoading(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnded)
    a.addEventListener('waiting', onWaiting)
    a.addEventListener('playing', onPlaying)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('ended', onEnded)
      a.removeEventListener('waiting', onWaiting)
      a.removeEventListener('playing', onPlaying)
    }
  }, [trackIdx])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  async function togglePlay() {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { try { await a.play(); setPlaying(true) } catch {} }
  }

  function next() {
    const idx = (trackIdx + 1) % TRACKS.length
    setTrackIdx(idx)
    setProgress(0)
    if (playing) setTimeout(() => audioRef.current?.play().catch(()=>{}), 100)
  }

  function prev() {
    const idx = (trackIdx - 1 + TRACKS.length) % TRACKS.length
    setTrackIdx(idx)
    setProgress(0)
    if (playing) setTimeout(() => audioRef.current?.play().catch(()=>{}), 100)
  }

  function seek(e) {
    const a = audioRef.current
    if (!a || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    a.currentTime = (x / rect.width) * duration
  }

  function fmt(s) {
    if (!s || !isFinite(s)) return '0:00'
    return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`
  }

  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <>
      <audio ref={audioRef} src={track.src} preload="metadata" />

      {/* Botón flotante */}
      <button
        className={`${styles.fab} ${playing ? styles.fabPlaying : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Música"
      >
        {playing
          ? <span className={styles.bars}><span/><span/><span/><span/></span>
          : <span className={styles.fabIcon}>🎵</span>
        }
      </button>

      {/* Panel */}
      <div className={`${styles.panel} ${open ? styles.panelOpen : ''}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>🎵 Música</span>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
        </div>

        {/* Track info */}
        <div className={styles.trackInfo}>
          <div className={`${styles.disc} ${playing ? styles.discSpin : ''}`}>⚡</div>
          <div className={styles.trackText}>
            <div className={styles.trackName}>{track.title}</div>
            <div className={styles.trackArtist}>{track.artist}</div>
          </div>
        </div>

        {/* Progress */}
        <div className={styles.progressWrap} onClick={seek}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
            <div className={styles.progressThumb} style={{ left: `${pct}%` }} />
          </div>
          <div className={styles.times}>
            <span>{fmt(progress)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button className={styles.ctrl} onClick={prev}>⏮</button>
          <button className={`${styles.ctrl} ${styles.ctrlMain}`} onClick={togglePlay}>
            {loading ? <span className={styles.miniSpinner}/> : playing ? '⏸' : '▶'}
          </button>
          <button className={styles.ctrl} onClick={next}>⏭</button>
        </div>

        {/* Volume */}
        <div className={styles.volRow}>
          <span className={styles.volIcon}>{volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</span>
          <input
            type="range" min="0" max="1" step="0.05"
            value={volume} onChange={e => setVolume(+e.target.value)}
            className={styles.volSlider}
          />
        </div>

        {/* Playlist */}
        <div className={styles.playlist}>
          {TRACKS.map((t, i) => (
            <button
              key={i}
              className={`${styles.plItem} ${trackIdx === i ? styles.plActive : ''}`}
              onClick={() => { setTrackIdx(i); setProgress(0); if (playing) setTimeout(() => audioRef.current?.play().catch(()=>{}), 100) }}
            >
              <span className={styles.plNum}>{trackIdx === i && playing ? '♪' : i+1}</span>
              <span className={styles.plName}>{t.title}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
