// src/components/ui/Navbar.jsx
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../services/auth'
import { subscribeToNotifications, markAllNotificationsRead } from '../../services/social'
import AuthModal from '../ui/AuthModal'
import NotificationBell from './NotificationBell'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showAuth, setShowAuth] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const menuRef = useRef(null)

  // Cerrar menú al cambiar ruta
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Suscribir a notificaciones
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToNotifications(user.uid, setNotifications)
    return unsub
  }, [user?.uid])

  // Cerrar menú al click fuera
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  async function handleLogout() {
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

          {/* Nav links - desktop */}
          <div className={styles.links}>
            <NavLink to="/feed" label="📱 Feed" />
            <NavLink to="/feed/apk" label="APK Mod" />
            <NavLink to="/feed/games" label="🎮 Juegos" />
            <NavLink to="/feed/script" label="⚙️ Scripts" />
            <NavLink to="/search" label="🔍 Buscar" />
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            {user ? (
              <>
                {/* Subir */}
                <Link to="/upload" className="btn btn-primary btn-sm hide-mobile">
                  + Subir
                </Link>

                {/* Notificaciones */}
                <NotificationBell
                  notifications={notifications}
                  unreadCount={unreadCount}
                  onMarkRead={() => markAllNotificationsRead(user.uid)}
                />

                {/* Avatar / menú */}
                <div className={styles.avatarWrap} ref={menuRef}>
                  <button
                    className={styles.avatarBtn}
                    onClick={() => setMenuOpen(o => !o)}
                  >
                    {user.photoURL
                      ? <img src={user.photoURL} alt="avatar" className="avatar avatar-sm" />
                      : <div className={styles.avatarPlaceholder}>{(user.displayName||'U')[0].toUpperCase()}</div>
                    }
                    {user.isStaff && <span className={styles.staffDot} />}
                  </button>

                  {menuOpen && (
                    <div className={styles.dropdown}>
                      <div className={styles.dropUser}>
                        <div className={styles.dropName}>
                          {user.displayName}
                          {user.verified && <span title="Verificado">✓</span>}
                        </div>
                        <div className={styles.dropEmail}>{user.email}</div>
                        {user.isAdmin && <span className="badge badge-purple">ADMIN</span>}
                        {user.isAdminJr && <span className="badge badge-cyan">ADMIN JR</span>}
                      </div>
                      <div className={styles.dropDivider} />
                      <DropItem to={`/profile/${user.uid}`} icon="👤" label="Mi perfil" />
                      <DropItem to="/upload" icon="📤" label="Subir publicación" />
                      {user.isStaff && <DropItem to="/admin" icon="🛡️" label="Panel admin" />}
                      <div className={styles.dropDivider} />
                      <button className={styles.dropBtn} onClick={handleLogout}>
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

            {/* Burger mobile */}
            <button className={styles.burger} onClick={() => setMenuOpen(o => !o)}>
              <span /><span /><span />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className={styles.mobileMenu}>
            <Link to="/feed" className={styles.mobileLink}>📱 Feed</Link>
            <Link to="/feed/apk" className={styles.mobileLink}>📦 APK Mod</Link>
            <Link to="/feed/games" className={styles.mobileLink}>🎮 Juegos</Link>
            <Link to="/feed/script" className={styles.mobileLink}>⚙️ Scripts</Link>
            <Link to="/search" className={styles.mobileLink}>🔍 Buscar</Link>
            {user && <Link to="/upload" className={styles.mobileLink}>📤 Subir</Link>}
            {user?.isStaff && <Link to="/admin" className={styles.mobileLink}>🛡️ Admin</Link>}
            {!user && (
              <div className={styles.mobileAuthBtns}>
                <button className="btn btn-ghost" onClick={() => { setShowAuth('login'); setMenuOpen(false) }}>Entrar</button>
                <button className="btn btn-primary" onClick={() => { setShowAuth('register'); setMenuOpen(false) }}>Registrarse</button>
              </div>
            )}
          </div>
        )}
      </nav>

      {showAuth && (
        <AuthModal
          initialMode={showAuth}
          onClose={() => setShowAuth(false)}
        />
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

function DropItem({ to, icon, label }) {
  return (
    <Link to={to} className={styles.dropItem}>
      <span>{icon}</span> {label}
    </Link>
  )
}
