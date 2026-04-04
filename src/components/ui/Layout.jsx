// src/components/ui/Layout.jsx
import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import IntroOverlay from './IntroOverlay'
import YouTubeBackground from './YouTubeBackground'
import MaintenancePage from '../../pages/MaintenancePage'
import { useAuth } from '../../context/AuthContext'
import styles from './Layout.module.css'

const BENEFITS = [
  { icon: '🔒', text: '100% Seguro',        color: '#00ff88' },
  { icon: '💎', text: 'Full Mod',            color: '#cc88ff' },
  { icon: '🆓', text: 'Totalmente Gratis',   color: '#00f5ff' },
  { icon: '⚡', text: 'Sin Anuncios',        color: '#ffaa00' },
  { icon: '🚀', text: 'Siempre Actualizado', color: '#ff3366' },
  { icon: '🛡️', text: 'Anti-Ban',           color: '#aa44ff' },
  { icon: '📲', text: 'Fácil de Instalar',   color: '#00ff88' },
  { icon: '🎮', text: 'Todo Desbloqueado',   color: '#ff0040' },
]

const INTRO_KEY = 'asmodeo_hasSeenIntro_v1'

export default function Layout() {
  const { user, maintenance, loading } = useAuth()

  const alreadySeen = typeof window !== 'undefined'
    ? !!localStorage.getItem(INTRO_KEY)
    : false

  const [showIntro, setShowIntro]   = useState(!alreadySeen)
  const [appVisible, setAppVisible] = useState(alreadySeen)

  const handleIntroDone = () => { setShowIntro(false); setAppVisible(true) }

  useEffect(() => {
    if (alreadySeen) return
    const safety = setTimeout(handleIntroDone, 7000)
    return () => clearTimeout(safety)
  }, [alreadySeen])

  if (!loading && maintenance && !user?.isOwner) return <MaintenancePage />

  return (
    <>
      {showIntro && <IntroOverlay onDone={handleIntroDone} />}
      <YouTubeBackground />
      <div className={styles.layout} style={{ opacity: appVisible ? 1 : 0, transition: 'opacity 0.6s ease' }}>
        <Navbar />
        <BenefitsBar />
        <main className={styles.main}>
          <Outlet />
        </main>
        <BottomBar user={user} />
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
            <span className={styles.dot}>·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function BottomBar({ user }) {
  const navigate   = useNavigate()
  const location   = useLocation()
  const isActive   = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <nav className={styles.bottomBar}>
      {/* Inicio */}
      <NavItem
        icon={<HomeIcon active={isActive('/') && location.pathname === '/'} />}
        label="Inicio"
        active={location.pathname === '/'}
        onClick={() => navigate('/')}
      />

      {/* Seguidos */}
      <NavItem
        icon={<FollowingIcon active={isActive('/seguidos')} />}
        label="Seguidos"
        active={isActive('/seguidos')}
        onClick={() => navigate('/seguidos')}
      />

      {/* + Subir — botón central destacado */}
      <button
        className={styles.uploadBtn}
        onClick={() => navigate(user ? '/upload' : '/')}
        aria-label="Subir publicación"
      >
        <span className={styles.uploadIcon}>+</span>
      </button>

      {/* Mensajes */}
      <NavItem
        icon={<MessagesIcon active={isActive('/messages')} />}
        label="Mensajes"
        active={isActive('/messages')}
        onClick={() => navigate('/messages')}
      />

      {/* Perfil */}
      <NavItem
        icon={
          user?.photoURL
            ? <img src={user.photoURL} alt="" className={`${styles.navAvatar} ${isActive(`/profile/${user?.uid}`) ? styles.navAvatarActive : ''}`} />
            : <ProfileIcon active={isActive(`/profile/${user?.uid}`)} />
        }
        label="Perfil"
        active={isActive(`/profile/${user?.uid}`)}
        onClick={() => navigate(user ? `/profile/${user.uid}` : '/')}
      />
    </nav>
  )
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button className={`${styles.navItem} ${active ? styles.navItemActive : ''}`} onClick={onClick}>
      <span className={styles.navIcon}>{icon}</span>
      <span className={styles.navLabel}>{label}</span>
    </button>
  )
}

/* ── Iconos SVG ── */
function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function FollowingIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}
function MessagesIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}
function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
