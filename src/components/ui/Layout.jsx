// src/components/ui/Layout.jsx
import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import IntroOverlay from './IntroOverlay'
import YouTubeBackground from './YouTubeBackground'
import MaintenancePage from '../../pages/MaintenancePage'
import { useAuth } from '../../context/AuthContext'
import styles from './Layout.module.css'

const BENEFITS = [
  { icon: '🔒', text: '100% Seguro',        color: '#34d399' },
  { icon: '💎', text: 'Full Mod',            color: '#c084fc' },
  { icon: '🆓', text: 'Totalmente Gratis',   color: '#22d3ee' },
  { icon: '⚡', text: 'Sin Anuncios',        color: '#fbbf24' },
  { icon: '🚀', text: 'Siempre Actualizado', color: '#f87171' },
  { icon: '🛡️', text: 'Anti-Ban',           color: '#a78bfa' },
  { icon: '📲', text: 'Fácil de Instalar',   color: '#34d399' },
  { icon: '🎮', text: 'Todo Desbloqueado',   color: '#fb923c' },
]

const INTRO_KEY = 'asmodeo_hasSeenIntro_v1'

export default function Layout() {
  const { user, maintenance, loading } = useAuth()

  const alreadySeen = typeof window !== 'undefined'
    ? !!localStorage.getItem(INTRO_KEY)
    : false

  const [showIntro, setShowIntro] = useState(!alreadySeen)
  const [appVisible, setAppVisible] = useState(alreadySeen)

  const handleIntroDone = () => {
    setShowIntro(false)
    setAppVisible(true)
  }

  useEffect(() => {
    if (alreadySeen) return
    const safety = setTimeout(handleIntroDone, 7000)
    return () => clearTimeout(safety)
  }, [alreadySeen])

  if (!loading && maintenance && !user?.isOwner) {
    return <MaintenancePage />
  }

  return (
    <>
      {showIntro && <IntroOverlay onDone={handleIntroDone} />}
      <YouTubeBackground />
      <div
        className={styles.layout}
        style={{
          opacity: appVisible ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}
      >
        <Navbar />
        <BenefitsBar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </>
  )
}

function BenefitsBar() {
  return (
    <div className={styles.benefitsBar}>
      <div className={styles.benefitsTrack}>
        {[...BENEFITS, ...BENEFITS].map((b, i) => (
          <span key={i} className={styles.benefit}>
            <span className={styles.benefitIcon}>{b.icon}</span>
            <span className={styles.benefitText} style={{ color: b.color }}>{b.text}</span>
            <span className={styles.dot}>•</span>
          </span>
        ))}
      </div>
    </div>
  )
}
