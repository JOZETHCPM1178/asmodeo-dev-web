// src/components/ui/Navbar.jsx
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../services/auth'
import { subscribeToNotifications } from '../../services/social'
import { subscribeToConversations, getTotalUnread } from '../../services/dm'
import AuthModal from './AuthModal'
import InboxPanel from './InboxPanel'
import styles from './Navbar.module.css'

const SOCIAL_LINKS = [
  { icon: '▶️', label: 'YouTube',  url: 'https://youtube.com/@asmodeodev' },
  { icon: '✈️', label: 'Telegram', url: 'https://t.me/asmodeodev' },
  { icon: '🎵', label: 'TikTok',   url: 'https://tiktok.com/@asmodeodev' },
  { icon: '💬', label: 'Discord',  url: 'https://discord.gg/asmodeodev' },
]

export default function Navbar() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const dropRef   = useRef(null)

  const [showAuth, setShowAuth]           = useState(false)
  const [menuOpen, setMenuOpen]           = useState(false)
  const [dropOpen, setDropOpen]           = useState(false)
  const [inboxOpen, setInboxOpen]         = useState(false)
  const [notifications, setNotifications] = useState([])
  const [conversations, setConversations] = useState([])

  // Cerrar todo al cambiar de ruta
  useEffect(() => {
    setMenuOpen(false)
    setDropOpen(false)
    setInboxOpen(false)
  }, [location.pathname])

  // Suscribir notificaciones y DMs
  useEffect(() => {
    if (!user?.uid) return
    const unsubN = subscribeToNotifications(user.uid, setNotifications)
    const unsubD = subscribeToConversations(user.uid, setConversations)
    return () => { unsubN(); unsubD() }
  }, [user?.uid])

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const unreadNotifs = notifications.filter(n => !n.read).length
  const unreadDMs    = getTotalUnread(conversations, user?.uid || '')
  const totalInbox   = unreadNotifs + unreadDMs

  async function handleLogout() {
    setDropOpen(false); setMenuOpen(false)
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
                className={styles.socialBtn} title={s.label}>{s.icon}</a>
            ))}
          </div>

          {/* Acciones */}
          <div className={styles.actions}>
            {user ? (
              <>
                {/* Subir */}
                <Link to="/upload" className={`btn btn-primary btn-sm ${styles.hideOnMobile}`}>
                  + Subir
                </Link>

                {/* Campana inbox */}
                <button
                  className={styles.inboxBtn}
                  onClick={() => setInboxOpen(o => !o)}
                  title="Bandeja de entrada"
                >
                  🔔
                  {totalInbox > 0 && (
                    <span className={styles.inboxBadge}>
                      {totalInbox > 9 ? '9+' : totalInbox}
                    </span>
                  )}
                </button>

                {/* Avatar dropdown */}
                <div className={styles.avatarWrap} ref={dropRef}>
                  <button
                    className={styles.avatarBtn}
                    onClick={() => setDropOpen(o => !o)}
                  >
                    {user.photoURL
                      ? <img src={user.photoURL} alt="" className="avatar avatar-sm" />
                      : <div className={styles.avatarPlaceholder}>{(user.displayName || 'U')[0].toUpperCase()}</div>
                    }
                    {user.isStaff && <span className={styles.staffDot} />}
                  </button>

                  {dropOpen && (
                    <div className={styles.dropdown}>
                      <div className={styles.dropUser}>
                        {user.photoURL
                          ? <img src={user.photoURL} alt="" className="avatar avatar-md" />
                          : <div className={styles.avatarPlaceholderMd}>{(user.displayName || 'U')[0].toUpperCase()}</div>
                        }
                        <div className={styles.dropUserInfo}>
                          <div className={styles.dropName}>{user.displayName}</div>
                          <div className={styles.dropEmail}>{user.email}</div>
                          {user.isOwner   && <span className="badge badge-gold">👑 OWNER</span>}
                          {!user.isOwner && user.isAdmin   && <span className="badge badge-purple">👑 ADMIN</span>}
                          {user.isAdminJr && <span className="badge badge-cyan">🛡️ MOD</span>}
                        </div>
                      </div>
                      <div className={styles.dropDivider} />
                      <Link to={`/profile/${user.uid}`} className={styles.dropItem} onClick={() => setDropOpen(false)}>
                        👤 Mi perfil
                      </Link>
                      <Link to="/messages" className={styles.dropItem} onClick={() => setDropOpen(false)}>
                        ✉️ Mensajes
                      </Link>
                      <Link to="/upload" className={styles.dropItem} onClick={() => setDropOpen(false)}>
                        📤 Subir publicación
                      </Link>
                      {(user.isStaff || user.isOwner) && (
                        <Link to="/admin" className={styles.dropItem} onClick={() => setDropOpen(false)}>
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
                <Link to="/messages"             className={styles.mobileLink}>✉️ Mensajes</Link>
                <Link to={`/profile/${user.uid}`} className={styles.mobileLink}>👤 Mi perfil</Link>
                {(user.isStaff || user.isOwner) && <Link to="/admin" className={styles.mobileLink}>🛡️ Panel Admin</Link>}
              </>
            )}
            <div className={styles.mobileDivider} />
            <div className={styles.mobileSocial}>
              {SOCIAL_LINKS.map(s => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                  className={styles.mobileSocialBtn}>{s.icon} {s.label}</a>
              ))}
            </div>
            <div className={styles.mobileDivider} />
            {user
              ? <button className={styles.mobileLogout} onClick={handleLogout}>🚪 Cerrar sesión</button>
              : <div className={styles.mobileAuthBtns}>
                  <button className="btn btn-ghost" style={{ flex: 1 }}
                    onClick={() => { setShowAuth('login'); setMenuOpen(false) }}>Entrar</button>
                  <button className="btn btn-primary" style={{ flex: 1 }}
                    onClick={() => { setShowAuth('register'); setMenuOpen(false) }}>Registrarse</button>
                </div>
            }
          </div>
        )}
      </nav>

      {/* InboxPanel como PORTAL — fuera del nav, sin overflow hidden */}
      {inboxOpen && createPortal(
        <InboxPanel
          notifications={notifications}
          onClose={() => setInboxOpen(false)}
        />,
        document.body
      )}

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
