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

          {/* ── IZQUIERDA: Logo ── */}
          <Link to="/" className={styles.logo}>
            ASMODEO<span>DEV</span>
          </Link>

          {/* ── CENTRO: Nav links (desktop) ── */}
          <div className={styles.centerLinks}>
            <NavLink to="/feed"        label="📱 Feed" />
            <NavLink to="/feed/apk"    label="APK" />
            <NavLink to="/feed/games"  label="🎮 Juegos" />
            <NavLink to="/feed/script" label="⚙️ Scripts" />
            <NavLink to="/search"      label="🔍 Buscar" />
          </div>

          {/* ── DERECHA: todo lo demás ── */}
          <div className={styles.rightSection}>

            {/* Redes sociales (desktop) */}
            <div className={styles.socialLinks}>
              {SOCIAL_LINKS.map(s => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialBtn}
                  title={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>

            {/* Separador */}
            <div className={styles.sep} />

            {/* Auth actions */}
            {user ? (
              <>
                {/* Subir (desktop) */}
                <Link to="/upload" className={`btn btn-primary btn-sm ${styles.uploadBtn}`}>
                  + Subir
                </Link>

                {/* Campana notificaciones */}
                <NotificationBell
                  notifications={notifications}
                  unreadCount={unreadCount}
                  onMarkRead={() => markAllNotificationsRead(user.uid)}
                />

                {/* Avatar + dropdown */}
                <div className={styles.avatarWrap} ref={dropRef}>
                  <button
                    className={styles.avatarBtn}
                    onClick={() => setDropOpen(o => !o)}
                    aria-label="Menú de usuario"
                  >
                    {user.photoURL
                      ? <img src={user.photoURL} alt="avatar" className={styles.avatarImg} />
                      : <div className={styles.avatarInitial}>{(user.displayName || 'U')[0].toUpperCase()}</div>
                    }
                    {user.isStaff && <div className={styles.staffDot} />}
                  </button>

                  {dropOpen && (
                    <div className={styles.dropdown}>
                      {/* Info usuario */}
                      <div className={styles.dropHeader}>
                        {user.photoURL
                          ? <img src={user.photoURL} alt="" className={styles.dropAvatar} />
                          : <div className={styles.dropAvatarInitial}>{(user.displayName || 'U')[0].toUpperCase()}</div>
                        }
                        <div className={styles.dropUserInfo}>
                          <div className={styles.dropName}>
                            {user.displayName}
                            {user.verified && <VerifiedBadge size={14} />}
                          </div>
                          <div className={styles.dropEmail}>{user.email}</div>
                          {user.isAdmin   && <span className="badge badge-purple" style={{ marginTop: '3px' }}>👑 ADMIN</span>}
                          {user.isAdminJr && <span className="badge badge-cyan"   style={{ marginTop: '3px' }}>🛡️ ADMIN JR</span>}
                        </div>
                      </div>

                      <div className={styles.dropDivider} />
                      <DropLink to={`/profile/${user.uid}`} icon="👤" label="Mi perfil"         onClose={() => setDropOpen(false)} />
                      <DropLink to="/upload"               icon="📤" label="Subir publicación" onClose={() => setDropOpen(false)} />
                      {user.isStaff && <DropLink to="/admin" icon="🛡️" label="Panel Admin" onClose={() => setDropOpen(false)} />}
                      <div className={styles.dropDivider} />
                      <button className={styles.dropLogout} onClick={handleLogout}>
                        🚪 Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.authBtns}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAuth('login')}>Entrar</button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAuth('register')}>Registrarse</button>
              </div>
            )}

            {/* Burger (mobile) */}
            <button
              className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menú"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>

        {/* ── MENÚ MOBILE ── */}
        {menuOpen && (
          <div className={styles.mobileMenu}>
            <MobileLink to="/feed"        label="📱 Feed"      onClose={() => setMenuOpen(false)} />
            <MobileLink to="/feed/apk"    label="📦 APK Mod"   onClose={() => setMenuOpen(false)} />
            <MobileLink to="/feed/games"  label="🎮 Juegos"    onClose={() => setMenuOpen(false)} />
            <MobileLink to="/feed/script" label="⚙️ Scripts"   onClose={() => setMenuOpen(false)} />
            <MobileLink to="/search"      label="🔍 Buscar"    onClose={() => setMenuOpen(false)} />

            {user && (
              <>
                <div className={styles.mobileDivider} />
                <MobileLink to="/upload"               label="📤 Subir"       onClose={() => setMenuOpen(false)} />
                <MobileLink to={`/profile/${user.uid}`} label="👤 Mi perfil"  onClose={() => setMenuOpen(false)} />
                {user.isStaff && <MobileLink to="/admin" label="🛡️ Admin" onClose={() => setMenuOpen(false)} />}
              </>
            )}

            <div className={styles.mobileDivider} />

            {/* Redes en mobile */}
            <div className={styles.mobileSocial}>
              {SOCIAL_LINKS.map(s => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className={styles.mobileSocialBtn}>
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
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowAuth('login'); setMenuOpen(false) }}>Entrar</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setShowAuth('register'); setMenuOpen(false) }}>Registrarse</button>
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

// ─── SUBCOMPONENTES ───
function NavLink({ to, label }) {
  const location = useLocation()
  const active = location.pathname === to || location.pathname.startsWith(to + '/')
  return (
    <Link to={to} className={`${styles.navLink} ${active ? styles.activeLink : ''}`}>
      {label}
    </Link>
  )
}

function DropLink({ to, icon, label, onClose }) {
  return (
    <Link to={to} className={styles.dropItem} onClick={onClose}>
      <span>{icon}</span> {label}
    </Link>
  )
}

function MobileLink({ to, label, onClose }) {
  return (
    <Link to={to} className={styles.mobileLink} onClick={onClose}>
      {label}
    </Link>
  )
}

// ─── INSIGNIA DE VERIFICADO ───
// Diseño propio: hexágono oscuro rojizo con estrella y animación de brillo
export function VerifiedBadge({ size = 16, className = '' }) {
  return (
    <span
      className={`${styles.verifiedBadge} ${className}`}
      style={{ '--vsize': `${size}px` }}
      title="Cuenta verificada"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.verifiedSvg}
      >
        {/* Hexágono oscuro rojizo */}
        <path
          d="M10 1L13.5 3.5V7.5L17 10L13.5 12.5V16.5L10 19L6.5 16.5V12.5L3 10L6.5 7.5V3.5L10 1Z"
          fill="#6B1A1A"
          stroke="#9B2C2C"
          strokeWidth="0.5"
        />
        {/* Brillo interno */}
        <path
          d="M10 2.5L13 4.5V8L16 10L13 12V15.5L10 17.5L7 15.5V12L4 10L7 8V4.5L10 2.5Z"
          fill="#7B1F1F"
          opacity="0.5"
        />
        {/* Estrella de 4 puntas personalizada (diferente al check de Meta) */}
        <path
          d="M10 5.5L11 8.5H14L11.5 10.5L12.5 13.5L10 11.5L7.5 13.5L8.5 10.5L6 8.5H9L10 5.5Z"
          fill="#F9CDCD"
          className={styles.verifiedStar}
        />
        {/* Destello animado */}
        <circle
          cx="10" cy="10" r="5"
          fill="none"
          stroke="#FF6B6B"
          strokeWidth="0.5"
          opacity="0.4"
          className={styles.verifiedGlow}
        />
      </svg>
    </span>
  )
}
