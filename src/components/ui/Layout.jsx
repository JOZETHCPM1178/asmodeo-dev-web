// src/components/ui/Layout.jsx
import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import SplashScreen from './SplashScreen'
import MusicPlayer from './MusicPlayer'
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

export default function Layout() {
  const { user, maintenance, loading } = useAuth()
  const [showSplash, setShowSplash] = useState(true)

  // Timeout de seguridad: si el splash falla por cualquier error,
  // la página no queda permanentemente en opacity 0 (pantalla negra)
  useEffect(() => {
    const safeTimeout = setTimeout(() => setShowSplash(false), 7000)
    return () => clearTimeout(safeTimeout)
  }, [])

  if (!loading && maintenance && !user?.isOwner) {
    return <MaintenancePage />
  }

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <div className={styles.layout} style={{ opacity: showSplash ? 0 : 1, transition: 'opacity 0.5s ease' }}>
        <BenefitsBar />
        <Navbar />
        <main className={styles.main}>
          <Outlet />
        </main>
        <MusicPlayer />
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
