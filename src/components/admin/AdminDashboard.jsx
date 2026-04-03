// src/components/admin/AdminDashboard.jsx — REDISEÑO PREMIUM
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import {
  getStats, getAllUsers, setUserRole, banUser, unbanUser,
  verifyUser, getPendingPosts, getAllPosts, getReports, replyToReport,
  resolveReport, getAdminLogs, addFakeFollowers, removeFakeFollowers,
  banInactiveUsers, resetAllBotFollowers, notifyAllUsers,
  addFakePostStats, removeFakePostStats,
  addBotComments, deleteBotComments,
} from '../../services/admin'
import { deletePost, toggleFeatured, verifyPost, setPostStatus } from '../../services/posts'
import { setChatStatus, setMaintenanceMode, getMaintenanceMode } from '../../services/social'
import styles from './AdminDashboard.module.css'

const TABS_CONFIG = [
  { id: 'owner',    label: '👑 Owner',         icon: '👑', minRole: 'owner' },
  { id: 'stats',    label: '📊 Stats',          icon: '📊', minRole: 'admin' },
  { id: 'users',    label: '👥 Usuarios',       icon: '👥', minRole: 'admin' },
  { id: 'allposts', label: '📋 Publicaciones',  icon: '📋', minRole: 'staff' },
  { id: 'posts',    label: '⏳ Pendientes',     icon: '⏳', minRole: 'staff' },
  { id: 'reports',  label: '⚠️ Reportes',      icon: '⚠️', minRole: 'staff' },
  { id: 'bots',     label: '🤖 Bot Tools',      icon: '🤖', minRole: 'admin' },
  { id: 'logs',     label: '📋 Logs',           icon: '📋', minRole: 'admin' },
  { id: 'config',   label: '⚙️ Config',         icon: '⚙️', minRole: 'admin' },
]

function canSeeTab(user, minRole) {
  if (minRole === 'owner') return user?.isOwner
  if (minRole === 'admin') return user?.isAdmin
  if (minRole === 'staff') return user?.isStaff
  return false
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(null)
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const tabs = TABS_CONFIG.filter(t => canSeeTab(user, t.minRole))

  useEffect(() => {
    if (tabs.length > 0 && !activeTab) setActiveTab(tabs[0].id)
  }, [tabs.length])

  const loadTab = useCallback(async (tabId) => {
    if (!tabId) return
    setLoading(true); setData(null); setError(null)
    try {
      let result = null
      if (tabId === 'stats')     result = await getStats()
      else if (tabId === 'users' || tabId === 'owner') result = await getAllUsers()
      else if (tabId === 'allposts') result = await getAllPosts()
      else if (tabId === 'bots') result = await getAllUsers()
      else if (tabId === 'posts') result = await getPendingPosts()
      else if (tabId === 'reports') result = await getReports()
      else if (tabId === 'logs')  result = await getAdminLogs()
      else result = {}
      setData(result)
    } catch (e) {
      console.error('AdminDashboard loadTab error:', e)
      setError(e.message || 'Error al cargar datos')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (activeTab) loadTab(activeTab) }, [activeTab])

  const badge = user?.isOwner
    ? { text: '👑 OWNER', cls: 'badge-gold' }
    : user?.isAdmin
      ? { text: '🛡️ ADMIN', cls: 'badge-purple' }
      : { text: '🔰 MOD', cls: 'badge-cyan' }

  const roleLabel = user?.isOwner ? 'Owner' : user?.isAdmin ? 'Admin' : 'Moderador'

  return (
    <div className={styles.wrap}>
      {/* Header mejorado */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>🛡️</div>
          <div>
            <div className={styles.title}>Panel de Control</div>
            <div className={styles.subtitle}>
              Sesión como {user?.displayName} · {roleLabel}
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={`badge ${badge.cls}`}>{badge.text}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.active : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className={styles.content}>
        {loading && (
          <div className={styles.center}>
            <span className="spinner spinner-lg" />
            <p style={{ color: 'var(--t3)', fontSize: '0.82rem', letterSpacing: '0.05em' }}>Cargando datos...</p>
          </div>
        )}
        {!loading && error && (
          <div className={styles.errorBox}>
            <div style={{ fontSize: '2rem' }}>⚠️</div>
            <p style={{ fontSize: '0.88rem' }}>{error}</p>
            <button className="btn btn-primary btn-sm" onClick={() => loadTab(activeTab)}>🔄 Reintentar</button>
          </div>
        )}
        {!loading && !error && data !== null && (
          <>
            {activeTab === 'owner'    && <OwnerPanel user={user} users={Array.isArray(data) ? data : []} onRefresh={() => loadTab('owner')} />}
            {activeTab === 'stats'    && <StatsPanel stats={data} />}
            {activeTab === 'users'    && <UsersPanel users={Array.isArray(data) ? data : []} me={user} onRefresh={() => loadTab('users')} />}
            {activeTab === 'allposts' && <AllPostsPanel posts={Array.isArray(data) ? data : []} onRefresh={() => loadTab('allposts')} />}
            {activeTab === 'posts'    && <PostsPanel posts={Array.isArray(data) ? data : []} onRefresh={() => loadTab('posts')} />}
            {activeTab === 'reports'  && <ReportsPanel reports={Array.isArray(data) ? data : []} user={user} onRefresh={() => loadTab('reports')} />}
            {activeTab === 'bots'     && <BotToolsPanel users={Array.isArray(data) ? data : []} admin={user} />}
            {activeTab === 'logs'     && <LogsPanel logs={Array.isArray(data) ? data : []} />}
            {activeTab === 'config'   && <ConfigPanel />}
          </>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   👑 OWNER PANEL
══════════════════════════════════════════ */
function OwnerPanel({ user, users, onRefresh }) {
  const [search, setSearch]         = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [activeSection, setActiveSection] = useState('users')

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      (u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  async function handleRole(uid, role) {
    if (uid === user.uid) { toast.error('No puedes cambiar tu propio rol'); return }
    try { await setUserRole(uid, role); toast.success('Rol actualizado ✅'); onRefresh() }
    catch (e) { toast.error(e.message) }
  }
  async function handleVerify(uid, current) {
    try { await verifyUser(uid, !current); toast.success(!current ? '✓ Verificado' : 'Verificación quitada'); onRefresh() }
    catch (e) { toast.error(e.message) }
  }
  async function handleBan(uid, banned, name) {
    if (uid === user.uid) { toast.error('No puedes banearte a ti mismo'); return }
    if (banned) {
      try { await unbanUser(uid); toast.success(`${name} desbaneado`); onRefresh() }
      catch (e) { toast.error(e.message) }
    } else {
      const reason = window.prompt(`¿Razón para banear a ${name}?`)
      if (!reason) return
      try { await banUser(uid, reason); toast.success(`${name} baneado`); onRefresh() }
      catch (e) { toast.error(e.message) }
    }
  }

  const totalAdmins   = users.filter(u => u.role === 'admin').length
  const totalVerified = users.filter(u => u.verified).length
  const totalBanned   = users.filter(u => u.banned).length
  const totalMods     = users.filter(u => u.role === 'admin_jr').length

  const sections = [
    { id: 'users',    label: '👥 Usuarios' },
    { id: 'roles',    label: '🎭 Roles' },
    { id: 'platform', label: '🌐 Plataforma' },
    { id: 'danger',   label: '🔴 Zona peligrosa' },
  ]

  return (
    <div className={styles.ownerWrap}>
      {/* Banner */}
      <div className={styles.ownerBanner}>
        <div className={styles.ownerLeft}>
          <span className={styles.ownerCrown}>👑</span>
          <div>
            <div className={styles.ownerTitle}>Panel Owner</div>
            <div className={styles.ownerSub}>Control total · {user?.displayName}</div>
          </div>
        </div>
        <div className={styles.ownerKpis}>
          <div className={styles.kpi}><span>{users.length}</span><span>Usuarios</span></div>
          <div className={styles.kpi}><span>{totalAdmins}</span><span>Admins</span></div>
          <div className={styles.kpi}><span>{totalMods}</span><span>Mods</span></div>
          <div className={styles.kpi}><span>{totalVerified}</span><span>Verif.</span></div>
          <div className={styles.kpi} style={{ color: 'var(--red)' }}><span>{totalBanned}</span><span>Baneados</span></div>
        </div>
      </div>

      {/* Sub-secciones */}
      <div className={styles.ownerSections}>
        {sections.map(s => (
          <button key={s.id}
            className={`${styles.sectionBtn} ${activeSection === s.id ? styles.sectionActive : ''}`}
            onClick={() => setActiveSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* USUARIOS */}
      {activeSection === 'users' && (
        <div>
          <div className={styles.filterRow}>
            <input className="inp" placeholder="🔍 Buscar por nombre o email..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, fontSize: '0.85rem' }} />
            <select className="inp" value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              style={{ width: 140, fontSize: '0.82rem' }}>
              <option value="all">Todos</option>
              <option value="user">User</option>
              <option value="admin_jr">Mod</option>
              <option value="admin">Admin</option>
            </select>
            <span className={styles.filterCount}>{filtered.length}</span>
          </div>
          <div className={styles.userCards}>
            {filtered.length === 0
              ? <div className={styles.emptyMsg}>Sin usuarios</div>
              : filtered.map(u => (
              <div key={u.id} className={`${styles.userCard} ${u.banned ? styles.userCardBanned : ''} ${u.id === user.uid ? styles.userCardSelf : ''}`}>
                <div className={styles.ucLeft}>
                  {u.photoURL
                    ? <img src={u.photoURL} alt="" className="avatar avatar-sm" />
                    : <div className={styles.avatarFb}>{(u.displayName || 'U')[0]}</div>}
                  <div className={styles.ucInfo}>
                    <div className={styles.ucName}>
                      {u.displayName || u.username}
                      {u.verified && <span className={styles.verifiedDot}>✓</span>}
                      {u.id === user.uid && <span className="badge badge-gold" style={{ fontSize: '0.58rem' }}>TÚ</span>}
                    </div>
                    <div className={styles.ucEmail}>{u.email}</div>
                    <div className={styles.ucMeta}>
                      <span className={`badge ${u.banned ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '0.65rem' }}>
                        {u.banned ? '🚫 Baneado' : '● Activo'}
                      </span>
                      <span className={styles.ucFollowers}>{u.followers || 0} seg.</span>
                    </div>
                  </div>
                </div>
                <div className={styles.ucRight}>
                  {u.id === user.uid || u.role === 'owner'
                    ? <span className="badge badge-gold">👑 Owner</span>
                    : <select className={styles.roleSelect} value={u.role || 'user'}
                        onChange={e => handleRole(u.id, e.target.value)}>
                        <option value="user">User</option>
                        <option value="admin_jr">Mod</option>
                        <option value="admin">Admin</option>
                      </select>}
                  {u.id !== user.uid && u.role !== 'owner' && (
                    <div className={styles.ucActions}>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleVerify(u.id, u.verified)}>
                        {u.verified ? '✓ Quitar' : '✓ Verif.'}
                      </button>
                      <button className={`btn btn-sm ${u.banned ? 'btn-secondary' : 'btn-danger'}`}
                        onClick={() => handleBan(u.id, u.banned, u.displayName || u.username)}>
                        {u.banned ? 'Desbanear' : 'Banear'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROLES */}
      {activeSection === 'roles' && (
        <div className={styles.rolesGrid}>
          <RoleCard role="Admin" icon="👑" color="var(--gold)"
            desc="Acceso completo al panel, gestiona usuarios, posts, reportes y config."
            count={totalAdmins}
            users={users.filter(u => u.role === 'admin')}
            onRemove={uid => handleRole(uid, 'user')} />
          <RoleCard role="Mod" icon="🛡️" color="var(--cyan)"
            desc="Puede moderar posts, responder reportes y verificar contenido."
            count={totalMods}
            users={users.filter(u => u.role === 'admin_jr')}
            onRemove={uid => handleRole(uid, 'user')} />
        </div>
      )}

      {/* PLATAFORMA */}
      {activeSection === 'platform' && (
        <>
          <div className={styles.platformGrid}>
            <InfoCard icon="👥" label="Total usuarios"   value={users.length}       color="var(--p2)" />
            <InfoCard icon="✓"  label="Verificados"      value={totalVerified}       color="var(--cyan)" />
            <InfoCard icon="🛡️" label="Staff total"      value={totalAdmins+totalMods} color="var(--gold)" />
            <InfoCard icon="🚫" label="Baneados"         value={totalBanned}         color="var(--red)" />
            <InfoCard icon="📊" label="Tasa banes"       value={`${users.length>0?((totalBanned/users.length)*100).toFixed(1):0}%`} color="var(--t2)" />
            <InfoCard icon="⭐" label="Tasa verif."      value={`${users.length>0?((totalVerified/users.length)*100).toFixed(1):0}%`} color="var(--green)" />
          </div>
          <MaintenanceToggle />
        </>
      )}

      {/* ZONA PELIGROSA */}
      {activeSection === 'danger' && (
        <div className={styles.dangerZone}>
          <div className={styles.dangerHeader}>
            <span style={{ fontSize: '1.6rem' }}>🔴</span>
            <div>
              <div className={styles.dangerTitle}>Zona peligrosa</div>
              <div className={styles.dangerDesc}>Acciones irreversibles. Úsalas con extremo cuidado.</div>
            </div>
          </div>
          <div className={styles.dangerActions}>
            <DangerAction icon="🧹" title="Banear todos los inactivos"
              desc="Banea usuarios que no han publicado ni interactuado"
              onConfirm={() => toast.error('Función no implementada aún')} />
            <DangerAction icon="📢" title="Notificar a todos"
              desc="Envía una notificación push a todos los usuarios"
              onConfirm={() => toast.error('Función no implementada aún')} />
            <DangerAction icon="🔄" title="Resetear todos los bots de seguidores"
              desc="Elimina todos los seguidores bot de la plataforma"
              onConfirm={() => toast.error('Función no implementada aún')} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   🤖 BOT TOOLS — Panel unificado
══════════════════════════════════════════ */
function BotToolsPanel({ users, admin }) {
  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <div className="section-title" style={{ fontFamily: 'var(--font1)', fontSize: '0.9rem', color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🤖 Bot Tools — Gestión de métricas artificiales
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--t3)', marginTop: '0.3rem' }}>
          Herramientas para gestionar seguidores, estadísticas y comentarios de bots.
        </p>
      </div>
      <div className={styles.botGrid}>
        <BotFollowersCard users={users} admin={admin} />
        <BotPostStatsCard users={users} admin={admin} />
        <BotCommentsCard users={users} admin={admin} />
      </div>
    </div>
  )
}

function BotFollowersCard({ users, admin }) {
  const [selected, setSelected] = useState('')
  const [amount, setAmount]     = useState(100)
  const [mode, setMode]         = useState('add')
  const [loading, setLoading]   = useState(false)

  async function handle() {
    if (!selected) { toast.error('Selecciona un usuario'); return }
    setLoading(true)
    try {
      if (mode === 'add') { await addFakeFollowers(selected, Number(amount), admin.uid); toast.success(`+${amount} seguidores añadidos`) }
      else { await removeFakeFollowers(selected, Number(amount), admin.uid); toast.success(`-${amount} seguidores eliminados`) }
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className={styles.botCard}>
      <div className={styles.botCardHeader}>
        <div className={styles.botCardIcon}>👥</div>
        <div>
          <div className={styles.botCardTitle}>Bot Seguidores</div>
          <div className={styles.botCardSub}>Agregar seguidores a usuarios</div>
        </div>
      </div>
      <div className={styles.modeToggle}>
        <button className={`btn btn-sm ${mode==='add'?'btn-primary':'btn-ghost'}`} onClick={() => setMode('add')}>➕ Agregar</button>
        <button className={`btn btn-sm ${mode==='remove'?'btn-danger':'btn-ghost'}`} onClick={() => setMode('remove')}>➖ Quitar</button>
      </div>
      <div className="inp-group">
        <label className="inp-label">Usuario</label>
        <select className="inp" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">— Elige un usuario —</option>
          {users.filter(u => !u.banned).map(u => (
            <option key={u.id} value={u.id}>{u.displayName || u.username} ({u.followers || 0} seg.)</option>
          ))}
        </select>
      </div>
      <div className="inp-group">
        <label className="inp-label">Cantidad</label>
        <input className="inp" type="number" min={1} max={10000} value={amount} onChange={e => setAmount(e.target.value)} />
      </div>
      <button className={`btn btn-lg ${mode==='add'?'btn-primary':'btn-danger'}`}
        onClick={handle} disabled={loading || !selected} style={{ width:'100%' }}>
        {loading ? <span className="spinner" style={{ width:18, height:18 }} />
          : mode==='add' ? `➕ Agregar ${amount} seguidores` : `➖ Quitar ${amount} seguidores`}
      </button>
    </div>
  )
}

function BotPostStatsCard({ users }) {
  const [posts, setPosts]   = useState([])
  const [selected, setSelected] = useState('')
  const [mode, setMode]     = useState('add')
  const [loading, setLoading] = useState(false)
  const [likes, setLikes]   = useState(50)
  const [dls, setDls]       = useState(20)

  useEffect(() => {
    getAllPosts().then(setPosts).catch(() => {})
  }, [])

  async function handle() {
    if (!selected) { toast.error('Selecciona un post'); return }
    setLoading(true)
    try {
      if (mode === 'add') { await addFakePostStats(selected, { likes: Number(likes), downloads: Number(dls) }); toast.success('Stats añadidas ✅') }
      else { await removeFakePostStats(selected); toast.success('Stats retiradas ✅') }
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className={styles.botCard}>
      <div className={styles.botCardHeader}>
        <div className={styles.botCardIcon}>📊</div>
        <div>
          <div className={styles.botCardTitle}>Bot Stats de Posts</div>
          <div className={styles.botCardSub}>Likes y descargas artificiales</div>
        </div>
      </div>
      <div className={styles.modeToggle}>
        <button className={`btn btn-sm ${mode==='add'?'btn-primary':'btn-ghost'}`} onClick={() => setMode('add')}>➕ Agregar</button>
        <button className={`btn btn-sm ${mode==='remove'?'btn-danger':'btn-ghost'}`} onClick={() => setMode('remove')}>➖ Quitar</button>
      </div>
      <div className="inp-group">
        <label className="inp-label">Publicación</label>
        <select className="inp" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">— Elige un post —</option>
          {posts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {mode === 'add' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
          <div className="inp-group">
            <label className="inp-label">❤️ Likes</label>
            <input className="inp" type="number" min={0} value={likes} onChange={e => setLikes(e.target.value)} />
          </div>
          <div className="inp-group">
            <label className="inp-label">⬇️ Descargas</label>
            <input className="inp" type="number" min={0} value={dls} onChange={e => setDls(e.target.value)} />
          </div>
        </div>
      )}
      <button className={`btn btn-lg ${mode==='add'?'btn-primary':'btn-danger'}`}
        onClick={handle} disabled={loading || !selected} style={{ width:'100%' }}>
        {loading ? <span className="spinner" style={{ width:18, height:18 }} />
          : mode==='add' ? '➕ Agregar stats' : '➖ Quitar stats'}
      </button>
    </div>
  )
}

function BotCommentsCard({ users }) {
  const [posts, setPosts]   = useState([])
  const [selected, setSelected] = useState('')
  const [mode, setMode]     = useState('add')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAllPosts().then(setPosts).catch(() => {})
  }, [])

  async function handle() {
    if (!selected) { toast.error('Selecciona un post'); return }
    setLoading(true)
    try {
      if (mode === 'add') { await addBotComments(selected); toast.success('Comentarios añadidos ✅') }
      else { await deleteBotComments(selected); toast.success('Comentarios eliminados ✅') }
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className={styles.botCard}>
      <div className={styles.botCardHeader}>
        <div className={styles.botCardIcon}>💬</div>
        <div>
          <div className={styles.botCardTitle}>Bot Comentarios</div>
          <div className={styles.botCardSub}>Comentarios automáticos en posts</div>
        </div>
      </div>
      <div className={styles.modeToggle}>
        <button className={`btn btn-sm ${mode==='add'?'btn-primary':'btn-ghost'}`} onClick={() => setMode('add')}>➕ Agregar</button>
        <button className={`btn btn-sm ${mode==='remove'?'btn-danger':'btn-ghost'}`} onClick={() => setMode('remove')}>➖ Quitar</button>
      </div>
      <div className="inp-group">
        <label className="inp-label">Publicación</label>
        <select className="inp" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">— Elige un post —</option>
          {posts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <button className={`btn btn-lg ${mode==='add'?'btn-primary':'btn-danger'}`}
        onClick={handle} disabled={loading || !selected} style={{ width:'100%', marginTop:'auto' }}>
        {loading ? <span className="spinner" style={{ width:18, height:18 }} />
          : mode==='add' ? '💬 Añadir comentarios' : '🗑️ Eliminar comentarios'}
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════
   Helpers reutilizables
══════════════════════════════════════════ */
function RoleCard({ role, icon, color, desc, count, users, onRemove }) {
  return (
    <div className={styles.roleCard}>
      <div className={styles.roleCardHeader}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, color }}>{role} ({count})</div>
          <div style={{ fontSize: '0.77rem', color: 'var(--t3)', marginTop: 2 }}>{desc}</div>
        </div>
      </div>
      {users.length === 0
        ? <p style={{ color: 'var(--t3)', fontSize: '0.82rem', padding: '0.5rem 0' }}>Sin {role.toLowerCase()}s asignados</p>
        : users.map(u => (
          <div key={u.id} className={styles.roleUserRow}>
            <div className={styles.avatarFb} style={{ background: color }}>{(u.displayName || 'U')[0]}</div>
            <span style={{ flex: 1, fontSize: '0.85rem' }}>{u.displayName || u.username}</span>
            <button className="btn btn-sm btn-danger" onClick={() => onRemove(u.id)}>Quitar</button>
          </div>
        ))}
    </div>
  )
}

function InfoCard({ icon, label, value, color }) {
  return (
    <div className={styles.infoCard}>
      <span style={{ fontSize: '1.7rem' }}>{icon}</span>
      <div className={styles.statValue} style={{ color }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  )
}

function DangerAction({ icon, title, desc, onConfirm }) {
  return (
    <div className={styles.dangerAction}>
      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--t3)', marginTop: 2 }}>{desc}</div>
      </div>
      <button className="btn btn-sm btn-danger"
        onClick={() => { if (window.confirm('¿Estás seguro? Esta acción puede ser irreversible.')) onConfirm() }}>
        Ejecutar
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════
   STATS PANEL
══════════════════════════════════════════ */
function StatsPanel({ stats }) {
  if (!stats || typeof stats !== 'object') return <Empty icon="📊" text="Sin datos disponibles" />
  const cards = [
    { label: 'Total Posts',    value: stats.totalPosts,       icon: '📝', color: 'var(--p2)' },
    { label: 'Total Usuarios', value: stats.totalUsers,       icon: '👥', color: 'var(--cyan)' },
    { label: 'Total Likes',    value: stats.totalLikes,       icon: '❤️', color: 'var(--red)' },
    { label: 'Descargas',      value: stats.totalDownloads,   icon: '⬇️', color: 'var(--green)' },
    { label: 'Esta semana',    value: stats.recentPostsCount, icon: '📅', color: 'var(--gold)' },
    { label: 'Reportes',       value: stats.pendingReports,   icon: '⚠️', color: 'var(--red)' },
  ]
  return (
    <div>
      <div className={styles.statCards}>
        {cards.map((c, i) => (
          <div key={i} className={styles.statCard}>
            <div style={{ fontSize: '1.9rem' }}>{c.icon}</div>
            <div className={styles.statValue} style={{ color: c.color }}>{c.value?.toLocaleString() ?? '—'}</div>
            <div className={styles.statLabel}>{c.label}</div>
          </div>
        ))}
      </div>
      {stats.topPosts?.length > 0 && (
        <div className="card" style={{ marginTop: '1rem', padding: '1.1rem' }}>
          <div className={styles.sectionTitle}>🏆 Top Posts</div>
          {stats.topPosts.map((p, i) => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.45rem 0', borderBottom:'1px solid var(--border)', fontSize:'0.83rem' }}>
              <span style={{ fontFamily:'var(--font1)', color:'var(--gold)', fontWeight:700, minWidth:28 }}>#{i+1}</span>
              <span style={{ flex: 1 }}>{p.name}</span>
              <span style={{ color:'var(--t3)' }}>❤️ {p.likes || 0}</span>
              <span style={{ color:'var(--t3)' }}>⬇️ {p.downloads || 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   USERS PANEL (admin normal)
══════════════════════════════════════════ */
function UsersPanel({ users, me, onRefresh }) {
  const [search, setSearch] = useState('')
  if (!users) return <div className={styles.center}><span className="spinner spinner-lg" /></div>
  const filtered = !search ? users : users.filter(u =>
    (u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  )
  async function act(fn, msg) {
    try { await fn(); toast.success(msg); onRefresh() }
    catch (e) { toast.error(e.message) }
  }
  return (
    <div>
      <div className={styles.filterRow}>
        <input className="inp" placeholder="🔍 Buscar usuario..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex:1, fontSize:'0.85rem' }} />
        <span className={styles.filterCount}>{filtered.length} usuarios</span>
      </div>
      <div className={styles.userCards}>
        {filtered.length === 0
          ? <div className={styles.emptyMsg}>Sin usuarios</div>
          : filtered.map(u => (
          <div key={u.id} className={`${styles.userCard} ${u.banned ? styles.userCardBanned : ''}`}>
            <div className={styles.ucLeft}>
              {u.photoURL
                ? <img src={u.photoURL} alt="" className="avatar avatar-sm" />
                : <div className={styles.avatarFb}>{(u.displayName || 'U')[0]}</div>}
              <div className={styles.ucInfo}>
                <div className={styles.ucName}>
                  {u.displayName || u.username}
                  {u.verified && <span className={styles.verifiedDot}>✓</span>}
                </div>
                <div className={styles.ucEmail}>{u.email}</div>
                <div className={styles.ucMeta}>
                  <span className={`badge ${u.role==='owner'?'badge-gold':u.role==='admin'?'badge-purple':u.role==='admin_jr'?'badge-cyan':'badge-green'}`}
                    style={{ fontSize:'0.62rem' }}>{u.role || 'user'}</span>
                  <span className={`badge ${u.banned?'badge-red':'badge-green'}`}
                    style={{ fontSize:'0.62rem' }}>{u.banned ? '🚫 Baneado' : '● Activo'}</span>
                </div>
              </div>
            </div>
            {u.id !== me.uid && u.role !== 'owner' && (
              <div className={styles.ucActions}>
                <button className="btn btn-sm btn-ghost"
                  onClick={() => act(() => verifyUser(u.id, !u.verified), u.verified ? 'Verificación quitada' : '✓ Verificado')}>
                  {u.verified ? '✓ Quitar' : '✓ Verif.'}
                </button>
                <button className={`btn btn-sm ${u.banned?'btn-secondary':'btn-danger'}`}
                  onClick={() => {
                    if (u.banned) act(() => unbanUser(u.id), 'Desbaneado')
                    else { const r = window.prompt('Razón:'); if(r!==null) act(() => banUser(u.id, r||''), 'Baneado') }
                  }}>
                  {u.banned ? 'Desbanear' : 'Banear'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   ALL POSTS PANEL
══════════════════════════════════════════ */
function AllPostsPanel({ posts, onRefresh }) {
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCat, setFilterCat] = useState('all')

  const filtered = posts.filter(p => {
    const matchSearch = !search ||
      (p.name||'').toLowerCase().includes(search.toLowerCase()) ||
      (p.authorName||'').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    const matchCat    = filterCat === 'all' || p.category === filterCat
    return matchSearch && matchStatus && matchCat
  })

  async function act(id, action, extra) {
    try {
      if (action === 'delete')  { if (!window.confirm('¿Eliminar?')) return; await deletePost(id) }
      if (action === 'feature') await toggleFeatured(id, extra)
      if (action === 'verify')  await verifyPost(id, extra)
      if (action === 'status')  await setPostStatus(id, extra)
      toast.success('✅ Listo'); onRefresh()
    } catch (e) { toast.error(e.message) }
  }

  const CATS   = { apk: '📱', games: '🎮', script: '⚙️', tutorials: '📚' }
  const STATUS = { active: '✅ Activo', pending: '⏳ Pendiente', hidden: '👁️ Oculto', rejected: '❌ Rechazado' }

  return (
    <div>
      <div className={styles.filterRow}>
        <input className="inp" placeholder="🔍 Buscar por nombre o autor..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex:1, fontSize:'0.85rem' }} />
        <select className="inp" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ width:150, fontSize:'0.82rem' }}>
          <option value="all">Todos los estados</option>
          <option value="active">✅ Activos</option>
          <option value="pending">⏳ Pendientes</option>
          <option value="hidden">👁️ Ocultos</option>
        </select>
        <select className="inp" value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ width:150, fontSize:'0.82rem' }}>
          <option value="all">Todas las categorías</option>
          <option value="apk">📱 APK Mod</option>
          <option value="games">🎮 Juegos</option>
          <option value="script">⚙️ Scripts</option>
          <option value="tutorials">📚 Tutoriales</option>
        </select>
        <span className={styles.filterCount}>{filtered.length} posts</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>Publicación</th><th>Autor</th><th>Cat.</th><th>Estado</th><th>VirusTotal</th><th>Stats</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={7} style={{ textAlign:'center', padding:'3rem', color:'var(--t3)' }}>Sin publicaciones</td></tr>
              : filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width:40, height:30, objectFit:'cover', borderRadius:6, flexShrink:0 }} />}
                    <div>
                      <div style={{ fontWeight:700, fontSize:'0.83rem' }}>{p.name}</div>
                      {p.featured && <span className="badge badge-gold" style={{ fontSize:'0.6rem' }}>⭐</span>}
                      {p.verified && <span className="badge badge-cyan" style={{ fontSize:'0.6rem', marginLeft:2 }}>✓</span>}
                    </div>
                  </div>
                </td>
                <td className={styles.muted}>{p.authorName || '—'}</td>
                <td><span style={{ fontSize:'1.1rem' }}>{CATS[p.category] || '?'}</span></td>
                <td>
                  <span className={`badge ${p.status==='active'?'badge-green':p.status==='pending'?'badge-gold':'badge-red'}`} style={{ fontSize:'0.67rem' }}>
                    {STATUS[p.status] || p.status}
                  </span>
                </td>
                <td>
                  {p.vtClean===true && !p.vtSkipped
                    ? <span style={{ color:'var(--green)', fontSize:'0.75rem' }}>✅ Limpio</span>
                    : p.vtClean===false
                      ? <span style={{ color:'var(--red)', fontSize:'0.75rem' }}>⚠️ Amenaza</span>
                      : <span style={{ color:'var(--t3)', fontSize:'0.75rem' }}>— Sin escanear</span>}
                </td>
                <td className={styles.muted} style={{ fontSize:'0.77rem' }}>❤️{p.likes||0} ⬇️{p.downloads||0}</td>
                <td>
                  <div className={styles.actionBtns}>
                    {p.status !== 'active' && <button className="btn btn-sm btn-primary" onClick={() => act(p.id,'status','active')}>✅</button>}
                    {p.status === 'active' && <button className="btn btn-sm btn-ghost" onClick={() => act(p.id,'status','hidden')}>👁️</button>}
                    <button className="btn btn-sm btn-ghost" onClick={() => act(p.id,'feature',!p.featured)}>{p.featured?'⭐':'☆'}</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => act(p.id,'verify',!p.verified)}>{p.verified?'✓':'○'}</button>
                    <button className="btn btn-sm btn-danger" onClick={() => act(p.id,'delete')}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   POSTS PENDIENTES
══════════════════════════════════════════ */
function PostsPanel({ posts, onRefresh }) {
  async function act(id, action) {
    try {
      if (action === 'approve')  await setPostStatus(id, 'active')
      else if (action === 'delete') { if (!window.confirm('¿Eliminar?')) return; await deletePost(id) }
      else if (action === 'feature') await toggleFeatured(id, true)
      else if (action === 'verify')  await verifyPost(id, true)
      toast.success('Listo ✅'); onRefresh()
    } catch (e) { toast.error(e.message) }
  }
  if (!posts?.length) return <Empty icon="✅" text="Sin posts pendientes — ¡todo al día!" />
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
      {posts.map(p => (
        <div key={p.id} className="card" style={{ display:'flex', alignItems:'flex-start', gap:'0.85rem', padding:'0.9rem', flexWrap:'wrap' }}>
          {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width:80, height:60, objectFit:'cover', borderRadius:8, flexShrink:0 }} />}
          <div style={{ flex:1, minWidth:180 }}>
            <div style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:'0.3rem' }}>{p.name}</div>
            <span className="badge badge-purple" style={{ fontSize:'0.7rem' }}>{p.category}</span>
            <p style={{ color:'var(--t3)', fontSize:'0.78rem', marginTop:'0.35rem' }}>{p.description?.slice(0,100)}</p>
          </div>
          <div style={{ display:'flex', gap:'0.35rem', flexWrap:'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => act(p.id,'approve')}>✅ Aprobar</button>
            <button className="btn btn-ghost btn-sm"   onClick={() => act(p.id,'verify')}>✓ Verificar</button>
            <button className="btn btn-ghost btn-sm"   onClick={() => act(p.id,'feature')}>⭐ Destacar</button>
            <button className="btn btn-danger btn-sm"  onClick={() => act(p.id,'delete')}>🗑️</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════
   REPORTS PANEL
══════════════════════════════════════════ */
function ReportsPanel({ reports, user, onRefresh }) {
  const [replyText, setReplyText] = useState({})
  if (!reports?.length) return <Empty icon="⚠️" text="Sin reportes pendientes" />
  async function reply(id) {
    const text = replyText[id]
    if (!text?.trim()) { toast.error('Escribe una respuesta'); return }
    try { await replyToReport(id, text, user.uid); toast.success('Respuesta enviada'); onRefresh() }
    catch (e) { toast.error(e.message) }
  }
  async function resolve(id) {
    try { await resolveReport(id, user.uid); toast.success('Reporte resuelto ✅'); onRefresh() }
    catch (e) { toast.error(e.message) }
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
      {reports.map(r => (
        <div key={r.id} className="card" style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:'0.65rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.5rem' }}>
            <div>
              <div style={{ fontWeight:700, fontSize:'0.88rem' }}>{r.reason}</div>
              <div style={{ fontSize:'0.75rem', color:'var(--t3)', marginTop:'0.2rem' }}>
                Post: {r.postId?.slice(0,12)}... · Por: {r.reporterName || 'Anónimo'}
              </div>
            </div>
            <span className={`badge ${r.status==='resolved'?'badge-green':'badge-gold'}`} style={{ fontSize:'0.68rem' }}>
              {r.status==='resolved' ? '✅ Resuelto' : '⏳ Pendiente'}
            </span>
          </div>
          {r.description && <p style={{ fontSize:'0.8rem', color:'var(--t2)', background:'rgba(0,0,0,.2)', padding:'0.6rem', borderRadius:8 }}>{r.description}</p>}
          {r.status !== 'resolved' && (
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'flex-end' }}>
              <input className="inp" placeholder="Responder al reporte..."
                value={replyText[r.id]||''} onChange={e => setReplyText(t => ({...t,[r.id]:e.target.value}))}
                style={{ flex:1, fontSize:'0.83rem' }} />
              <button className="btn btn-primary btn-sm" onClick={() => reply(r.id)}>Responder</button>
              <button className="btn btn-ghost btn-sm"   onClick={() => resolve(r.id)}>✅ Resolver</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════
   LOGS
══════════════════════════════════════════ */
function LogsPanel({ logs }) {
  if (!logs?.length) return <Empty icon="📋" text="Sin logs registrados" />
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Acción</th><th>Detalles</th><th>Fecha</th></tr></thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id}>
              <td><span className="badge badge-purple" style={{ fontSize:'0.71rem' }}>{l.action}</span></td>
              <td className={styles.muted}>{l.amount ? `×${l.amount}` : l.reason || l.targetId?.slice(0,12) || '—'}</td>
              <td className={styles.muted}>{l.createdAt?.toDate?.().toLocaleString('es') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ══════════════════════════════════════════
   CONFIG
══════════════════════════════════════════ */
function ConfigPanel() {
  const [chatClosed, setChatClosed] = useState(false)
  async function toggleChat() {
    try {
      await setChatStatus(!chatClosed)
      setChatClosed(c => !c)
      toast.success(`Chat ${!chatClosed ? 'cerrado' : 'abierto'}`)
    } catch (e) { toast.error(e.message) }
  }
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
      <div className="card" style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
        <div className={styles.sectionTitle}>💬 Chat Global</div>
        <p style={{ fontSize:'0.85rem', color:'var(--t2)' }}>Desactiva temporalmente el chat para todos los usuarios.</p>
        <button className={`btn ${chatClosed?'btn-primary':'btn-danger'}`} onClick={toggleChat}>
          {chatClosed ? '🔓 Abrir chat' : '🔒 Cerrar chat'}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   MAINTENANCE TOGGLE
══════════════════════════════════════════ */
function MaintenanceToggle() {
  const [active, setActive]   = useState(false)
  const [loading, setLoading] = useState(false)
  useEffect(() => { getMaintenanceMode().then(setActive).catch(() => {}) }, [])
  async function toggle() {
    setLoading(true)
    try {
      await setMaintenanceMode(!active)
      setActive(a => !a)
      toast.success(!active ? '🔧 Mantenimiento ACTIVADO' : '✅ Web restaurada para todos')
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }
  return (
    <div className={styles.maintenanceBox}>
      <div className={styles.maintenanceInfo}>
        <span style={{ fontSize:'1.5rem' }}>🔧</span>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.9rem' }}>Sistema de Mantenimiento</div>
          <div style={{ fontSize:'0.77rem', color:'var(--t3)', marginTop:2 }}>
            Al activar, todos los usuarios verán la página de mantenimiento. Solo el Owner ve la web.
          </div>
        </div>
        <span className={`badge ${active?'badge-red':'badge-green'}`} style={{ flexShrink:0 }}>
          {active ? '🔴 ACTIVO' : '🟢 NORMAL'}
        </span>
      </div>
      <button className={`btn btn-lg ${active?'btn-primary':'btn-danger'}`}
        onClick={toggle} disabled={loading} style={{ width:'100%' }}>
        {loading ? <span className="spinner" style={{ width:18, height:18 }} />
          : active ? '✅ Restaurar web para todos' : '🔧 Activar mantenimiento'}
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════ */
function Empty({ icon, text }) {
  return (
    <div className="empty" style={{ padding:'4rem 2rem' }}>
      <div className="empty-icon">{icon}</div>
      <h3>{text}</h3>
    </div>
  )
}
