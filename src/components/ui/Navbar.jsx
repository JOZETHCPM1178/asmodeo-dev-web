// src/components/ui/Navbar.jsx
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../services/auth'
import { subscribeToNotifications, markAllNotificationsRead } from '../../services/social'
import AuthModal from '../ui/AuthModal'
import NotificationBell from './NotificationBell'
import styles from './Navbar.module.css'

// ─── REDES SOCIALES — edita aquí tus links ───
const SOCIAL_LINKS = [
  { icon: '▶️', label: 'YouTube',  url: 'https://youtube.com/@asmodeodev' },
  { icon: '✈️', label: 'Telegram', url: 'https://t.me/asmodeodev' },
  { icon: '🎵', label: 'TikTok',   url: 'https://tiktok.com/@asmodeodev' },
  { icon: '💬', label: 'Discord',  url: 'https://discord.gg/asmodeodev' },
]

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showAuth, setShowAuth] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const dropRef = useRef(null)

  useEffect(() => { setMenuOpen(false); setDropOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToNotifications(user.uid, setNotifications)
    return unsub
  }, [user?.uid])

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  async function handleLogout() {
    setDropOpen(false)
    setMenuOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.inner}>

          {/* Logo */}
          <Link to="/" className={styles.logo}>
            ASMODEO<span>DEV</span>
          </Link>

          {/* Links desktop */}
          <div className={styles.links}>
            <NavLink to="/feed"        label="📱 Feed" />
            <NavLink to="/feed/apk"    label="APK" />
            <NavLink to="/feed/games"  label="🎮 Juegos" />
            <NavLink to="/feed/script" label="⚙️ Scripts" />
            <NavLink to="/search"      label="🔍 Buscar" />
          </div>

          {/* Redes sociales desktop */}
          <div className={styles.socialLinks}>
            {SOCIAL_LINKS.map(s => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                className={styles.socialBtn} title={s.label}>
                {s.icon}
              </a>
            ))}
          </div>

          {/* Acciones */}
          <div className={styles.actions}>
            {user ? (
              <>
                <Link to="/upload" className={`btn btn-primary btn-sm ${styles.hideOnMobile}`}>
                  + Subir
                </Link>

                <NotificationBell
                  notifications={notifications}
                  unreadCount={unreadCount}
                  onMarkRead={() => markAllNotificationsRead(user.uid)}
                />

                {/* Avatar dropdown */}
                <div className={styles.avatarWrap} ref={dropRef}>
                  <button className={styles.avatarBtn} onClick={() => setDropOpen(o => !o)}>
                    {user.photoURL
                      ? <img src={user.photoURL} alt="avatar" className="avatar avatar-sm" />
                      : <div className={styles.avatarPlaceholder}>{(user.displayName || 'U')[0].toUpperCase()}</div>
                    }
                    {user.isStaff && <span className={styles.staffDot} />}
                  </button>

                  {dropOpen && (
                    <div className={styles.dropdown}>
                      {/* Cabecera usuario */}
                      <div className={styles.dropUser}>
                        {user.photoURL
                          ? <img src={user.photoURL} alt="" className="avatar avatar-md" />
                          : <div className={styles.avatarPlaceholderMd}>{(user.displayName || 'U')[0].toUpperCase()}</div>
                        }
                        <div className={styles.dropUserInfo}>
                          <div className={styles.dropName}>
                            {user.displayName}
                            {user.verified && <span className={styles.checkMark}>✓</span>}
                          </div>
                          <div className={styles.dropEmail}>{user.email}</div>
                          {user.isAdmin   && <span className="badge badge-purple">👑 ADMIN</span>}
                          {user.isAdminJr && <span className="badge badge-cyan">🛡️ ADMIN JR</span>}
                        </div>
                      </div>

                      <div className={styles.dropDivider} />

                      <Link to={`/profile/${user.uid}`} className={styles.dropItem}
                        onClick={() => setDropOpen(false)}>
                        👤 Mi perfil
                      </Link>
                      <Link to="/upload" className={styles.dropItem}
                        onClick={() => setDropOpen(false)}>
                        📤 Subir publicación
                      </Link>
                      {user.isStaff && (
                        <Link to="/admin" className={styles.dropItem}
                          onClick={() => setDropOpen(false)}>
                          🛡️ Panel de Admin
                        </Link>
                      )}

                      <div className={styles.dropDivider} />

                      <button className={styles.dropLogout} onClick={handleLogout}>
                        🚪 Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAuth('login')}>
                  Entrar
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAuth('register')}>
                  Registrarse
                </button>
              </>
            )}

            {/* Burger */}
            <button className={styles.burger} onClick={() => setMenuOpen(o => !o)}>
              <span /><span /><span />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className={styles.mobileMenu}>
            <Link to="/feed"        className={styles.mobileLink}>📱 Feed</Link>
            <Link to="/feed/apk"    className={styles.mobileLink}>📦 APK Mod</Link>
            <Link to="/feed/games"  className={styles.mobileLink}>🎮 Juegos</Link>
            <Link to="/feed/script" className={styles.mobileLink}>⚙️ Scripts</Link>
            <Link to="/search"      className={styles.mobileLink}>🔍 Buscar</Link>

            {user && (
              <>
                <div className={styles.mobileDivider} />
                <Link to="/upload"               className={styles.mobileLink}>📤 Subir</Link>
                <Link to={`/profile/${user.uid}`} className={styles.mobileLink}>👤 Mi perfil</Link>
                {user.isStaff && (
                  <Link to="/admin" className={styles.mobileLink}>🛡️ Panel Admin</Link>
                )}
              </>
            )}

            <div className={styles.mobileDivider} />

            {/* Redes sociales */}
            <div className={styles.mobileSocial}>
              {SOCIAL_LINKS.map(s => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                  className={styles.mobileSocialBtn}>
                  {s.icon} {s.label}
                </a>
              ))}
            </div>

            <div className={styles.mobileDivider} />

            {user ? (
              <button className={styles.mobileLogout} onClick={handleLogout}>
                🚪 Cerrar sesión
              </button>
            ) : (
              <div className={styles.mobileAuthBtns}>
                <button className="btn btn-ghost" style={{flex:1}}
                  onClick={() => { setShowAuth('login'); setMenuOpen(false) }}>
                  Entrar
                </button>
                <button className="btn btn-primary" style={{flex:1}}
                  onClick={() => { setShowAuth('register'); setMenuOpen(false) }}>
                  Registrarse
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {showAuth && (
        <AuthModal initialMode={showAuth} onClose={() => setShowAuth(false)} />
      )}
    </>
  )
}

function NavLink({ to, label }) {
  const location = useLocation()
  const active = location.pathname === to || location.pathname.startsWith(to + '/')
  return (
    <Link to={to} className={`${styles.navLink} ${active ? styles.active : ''}`}>
      {label}
    </Link>
  )
}
