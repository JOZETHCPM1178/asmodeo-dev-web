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
  const [visible, setVisible] = useState(false)

  const hideSplash = () => {
    setShowSplash(false)
    setVisible(true)
  }

  // Timeout de seguridad: si el splash falla o se queda colgado
  // por cualquier error de JS, la app se muestra igual a los 6s
  useEffect(() => {
    const safeTimeout = setTimeout(hideSplash, 6000)
    return () => clearTimeout(safeTimeout)
  }, [])

  if (!loading && maintenance && !user?.isOwner) {
    return <MaintenancePage />
  }

  return (
    <>
      {showSplash && <SplashScreen onDone={hideSplash} />}
      <div
        className={styles.layout}
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.5s ease',
          // Garantizar que el layout nunca quede invisible para siempre
          // después de 6.5s forzamos visibility independientemente
        }}
      >
        <Navbar />
        <BenefitsBar />
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
