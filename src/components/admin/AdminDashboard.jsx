// src/components/admin/AdminDashboard.jsx
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import {
  getStats, getAllUsers, setUserRole, banUser, unbanUser,
  verifyUser, getPendingPosts, getReports, replyToReport,
  resolveReport, getAdminLogs, addFakeFollowers, removeFakeFollowers,
} from '../../services/admin'
import { deletePost, toggleFeatured, verifyPost, setPostStatus } from '../../services/posts'
import { setChatStatus } from '../../services/social'
import styles from './AdminDashboard.module.css'

const TABS_CONFIG = [
  { id: 'owner',      label: '👑 Owner',      minRole: 'owner' },
  { id: 'stats',      label: '📊 Stats',      minRole: 'admin' },
  { id: 'users',      label: '👥 Usuarios',   minRole: 'admin' },
  { id: 'posts',      label: '📝 Posts',      minRole: 'staff' },
  { id: 'reports',    label: '⚠️ Reportes',   minRole: 'staff' },
  { id: 'followers',  label: '🤖 Bot',        minRole: 'admin' },
  { id: 'logs',       label: '📋 Logs',       minRole: 'admin' },
  { id: 'config',     label: '⚙️ Config',     minRole: 'admin' },
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

  // Seleccionar primera tab disponible al montar
  useEffect(() => {
    if (tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0].id)
    }
  }, [tabs.length])

  const loadTab = useCallback(async (tabId) => {
    if (!tabId) return
    setLoading(true)
    setData(null)
    setError(null)
    try {
      let result = null
      if (tabId === 'stats')     result = await getStats()
      else if (tabId === 'users' || tabId === 'owner' || tabId === 'followers')
                                  result = await getAllUsers()
      else if (tabId === 'posts') result = await getPendingPosts()
      else if (tabId === 'reports') result = await getReports()
      else if (tabId === 'logs')  result = await getAdminLogs()
      else result = {}
      setData(result)
    } catch (e) {
      console.error('AdminDashboard loadTab error:', e)
      setError(e.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab) loadTab(activeTab)
  }, [activeTab])

  const badge = user?.isOwner
    ? { text: '👑 OWNER', cls: 'badge-gold' }
    : user?.isAdmin
      ? { text: '🛡️ ADMIN', cls: 'badge-purple' }
      : { text: '🔰 MOD', cls: 'badge-cyan' }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Panel de Control</h1>
        <span className={`badge ${badge.cls}`}>{badge.text}</span>
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
            <p style={{ color: 'var(--t3)', marginTop: '1rem', fontSize: '0.85rem' }}>Cargando...</p>
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorBox}>
            <div style={{ fontSize: '2rem' }}>⚠️</div>
            <p>{error}</p>
            <button className="btn btn-primary btn-sm" onClick={() => loadTab(activeTab)}>
              🔄 Reintentar
            </button>
          </div>
        )}

        {!loading && !error && data !== null && (
          <>
            {activeTab === 'owner'     && <OwnerPanel    user={user} users={Array.isArray(data) ? data : []} onRefresh={() => loadTab('owner')} />}
            {activeTab === 'stats'     && <StatsPanel    stats={data} />}
            {activeTab === 'users'     && <UsersPanel    users={Array.isArray(data) ? data : []} me={user} onRefresh={() => loadTab('users')} />}
            {activeTab === 'posts'     && <PostsPanel    posts={Array.isArray(data) ? data : []} onRefresh={() => loadTab('posts')} />}
            {activeTab === 'reports'   && <ReportsPanel  reports={Array.isArray(data) ? data : []} user={user} onRefresh={() => loadTab('reports')} />}
            {activeTab === 'followers' && <BotsPanel     users={Array.isArray(data) ? data : []} admin={user} />}
            {activeTab === 'logs'      && <LogsPanel     logs={Array.isArray(data) ? data : []} />}
            {activeTab === 'config'    && <ConfigPanel />}
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
//  👑 OWNER PANEL
// ══════════════════════════════════════════════
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
    try {
      await setUserRole(uid, role)
      toast.success('Rol actualizado ✅')
      onRefresh()
    } catch (e) { toast.error(e.message) }
  }

  async function handleVerify(uid, current) {
    try {
      await verifyUser(uid, !current)
      toast.success(!current ? '✓ Usuario verificado' : 'Verificación quitada')
      onRefresh()
    } catch (e) { toast.error(e.message) }
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

  return (
    <div className={styles.ownerWrap}>

      {/* Banner Owner */}
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
          <div className={styles.kpi}><span>{totalVerified}</span><span>Verificados</span></div>
          <div className={styles.kpi} style={{ color: 'var(--red)' }}><span>{totalBanned}</span><span>Baneados</span></div>
        </div>
      </div>

      {/* Secciones del owner */}
      <div className={styles.ownerSections}>
        {[
          { id: 'users',    label: '👥 Usuarios' },
          { id: 'roles',    label: '🎭 Roles' },
          { id: 'platform', label: '🌐 Plataforma' },
          { id: 'danger',   label: '🔴 Zona peligrosa' },
        ].map(s => (
          <button key={s.id}
            className={`${styles.sectionBtn} ${activeSection === s.id ? styles.sectionActive : ''}`}
            onClick={() => setActiveSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── USUARIOS ── */}
      {activeSection === 'users' && (
        <div>
          {/* Buscador + filtro */}
          <div className={styles.filterRow}>
            <input className="inp" placeholder="🔍 Buscar por nombre o email..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, fontSize: '0.85rem' }} />
            <select className="inp" value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              style={{ width: 140, fontSize: '0.82rem' }}>
              <option value="all">Todos los roles</option>
              <option value="user">User</option>
              <option value="admin_jr">Mod</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--t3)' }}>Sin usuarios</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id}
                    className={u.id === user.uid ? styles.selfRow : u.banned ? styles.rowBanned : ''}>
                    <td>
                      <div className={styles.userCell}>
                        {u.photoURL
                          ? <img src={u.photoURL} alt="" className="avatar avatar-sm" />
                          : <div className={styles.avatarFb}>{(u.displayName || 'U')[0]}</div>
                        }
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                            {u.displayName || u.username}
                            {u.verified && <span style={{ color: 'var(--cyan)', marginLeft: 4 }}>✓</span>}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--t3)' }}>
                            {u.followers || 0} seguidores
                          </div>
                        </div>
                        {u.id === user.uid && <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>TÚ</span>}
                      </div>
                    </td>
                    <td className={styles.muted}>{u.email}</td>
                    <td>
                      {u.id === user.uid || u.role === 'owner'
                        ? <span className="badge badge-gold">👑 Owner</span>
                        : <select className={styles.roleSelect} value={u.role || 'user'}
                            onChange={e => handleRole(u.id, e.target.value)}>
                            <option value="user">👤 User</option>
                            <option value="admin_jr">🛡️ Mod</option>
                            <option value="admin">👑 Admin</option>
                          </select>
                      }
                    </td>
                    <td>
                      <span className={`badge ${u.banned ? 'badge-red' : 'badge-green'}`}>
                        {u.banned ? '🚫 Baneado' : '✅ Activo'}
                      </span>
                    </td>
                    <td>
                      {u.id !== user.uid && u.role !== 'owner' && (
                        <div className={styles.actionBtns}>
                          <button className="btn btn-sm btn-ghost"
                            onClick={() => handleVerify(u.id, u.verified)}>
                            {u.verified ? '✓ Quitar' : '✓ Verificar'}
                          </button>
                          <button
                            className={`btn btn-sm ${u.banned ? 'btn-secondary' : 'btn-danger'}`}
                            onClick={() => handleBan(u.id, u.banned, u.displayName || u.username)}>
                            {u.banned ? 'Desbanear' : 'Banear'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ROLES ── */}
      {activeSection === 'roles' && (
        <div className={styles.rolesGrid}>
          <RoleCard
            role="Admin" icon="👑" color="var(--gold)"
            desc="Acceso completo al panel, puede gestionar usuarios, posts, reportes y configuración."
            count={totalAdmins}
            users={users.filter(u => u.role === 'admin')}
            onRemove={uid => handleRole(uid, 'user')}
          />
          <RoleCard
            role="Mod" icon="🛡️" color="var(--cyan)"
            desc="Puede moderar posts, responder reportes y verificar contenido."
            count={totalMods}
            users={users.filter(u => u.role === 'admin_jr')}
            onRemove={uid => handleRole(uid, 'user')}
          />
        </div>
      )}

      {/* ── PLATAFORMA ── */}
      {activeSection === 'platform' && (
        <div className={styles.platformGrid}>
          <InfoCard icon="👥" label="Total usuarios" value={users.length} color="var(--p2)" />
          <InfoCard icon="✓" label="Verificados" value={totalVerified} color="var(--cyan)" />
          <InfoCard icon="🛡️" label="Staff total" value={totalAdmins + totalMods} color="var(--gold)" />
          <InfoCard icon="🚫" label="Baneados" value={totalBanned} color="var(--red)" />
          <InfoCard icon="📊" label="Tasa banes" value={`${users.length > 0 ? ((totalBanned/users.length)*100).toFixed(1) : 0}%`} color="var(--t2)" />
          <InfoCard icon="⭐" label="Tasa verificados" value={`${users.length > 0 ? ((totalVerified/users.length)*100).toFixed(1) : 0}%`} color="var(--green)" />
        </div>
      )}

      {/* ── ZONA PELIGROSA ── */}
      {activeSection === 'danger' && (
        <div className={styles.dangerZone}>
          <div className={styles.dangerHeader}>
            <span>🔴</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--red)' }}>Zona peligrosa</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--t3)' }}>
                Acciones irreversibles. Úsalas con cuidado.
              </div>
            </div>
          </div>
          <div className={styles.dangerActions}>
            <DangerAction
              icon="🧹"
              title="Banear todos los inactivos"
              desc="Banea usuarios que no han publicado ni interactuado"
              onConfirm={() => toast.error('Función no implementada aún')}
            />
            <DangerAction
              icon="📢"
              title="Notificar a todos"
              desc="Envía una notificación a todos los usuarios de la plataforma"
              onConfirm={() => toast.error('Función no implementada aún')}
            />
            <DangerAction
              icon="🔄"
              title="Resetear contador de bots"
              desc="Elimina todos los seguidores bot de todos los usuarios"
              onConfirm={() => toast.error('Función no implementada aún')}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function RoleCard({ role, icon, color, desc, count, users, onRemove }) {
  return (
    <div className={styles.roleCard}>
      <div className={styles.roleCardHeader}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, color }}>{role} ({count})</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--t3)', marginTop: 2 }}>{desc}</div>
        </div>
      </div>
      {users.length === 0
        ? <p style={{ color: 'var(--t3)', fontSize: '0.82rem', padding: '0.5rem 0' }}>Sin {role.toLowerCase()}s asignados</p>
        : users.map(u => (
          <div key={u.id} className={styles.roleUserRow}>
            <div className={styles.avatarFb} style={{ background: color }}>{(u.displayName||'U')[0]}</div>
            <span style={{ flex: 1, fontSize: '0.85rem' }}>{u.displayName || u.username}</span>
            <button className="btn btn-sm btn-danger" onClick={() => onRemove(u.id)}>Quitar</button>
          </div>
        ))
      }
    </div>
  )
}

function InfoCard({ icon, label, value, color }) {
  return (
    <div className={styles.infoCard}>
      <span style={{ fontSize: '1.6rem' }}>{icon}</span>
      <div style={{ fontFamily: 'var(--font1)', fontSize: '1.4rem', fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--t3)' }}>{label}</div>
    </div>
  )
}

function DangerAction({ icon, title, desc, onConfirm }) {
  return (
    <div className={styles.dangerAction}>
      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{title}</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--t3)', marginTop: 2 }}>{desc}</div>
      </div>
      <button className="btn btn-sm btn-danger"
        onClick={() => { if (window.confirm('¿Estás seguro? Esta acción puede ser irreversible.')) onConfirm() }}>
        Ejecutar
      </button>
    </div>
  )
}

// ══════════════════════
//  STATS
// ══════════════════════
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
            <div style={{ fontSize: '1.8rem' }}>{c.icon}</div>
            <div style={{ fontFamily: 'var(--font1)', fontSize: '1.5rem', fontWeight: 900, color: c.color }}>
              {c.value?.toLocaleString() ?? '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--t2)' }}>{c.label}</div>
          </div>
        ))}
      </div>
      {stats.topPosts?.length > 0 && (
        <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
          <div className={styles.sectionTitle}>🏆 Top Posts</div>
          {stats.topPosts.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
              <span style={{ fontFamily: 'var(--font1)', color: 'var(--gold)', fontWeight: 700, minWidth: 28 }}>#{i+1}</span>
              <span style={{ flex: 1 }}>{p.name}</span>
              <span style={{ color: 'var(--t3)' }}>❤️ {p.likes || 0}</span>
              <span style={{ color: 'var(--t3)' }}>⬇️ {p.downloads || 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════
//  USUARIOS (admin normal)
// ══════════════════════
function UsersPanel({ users, me, onRefresh }) {
  const [search, setSearch] = useState('')
  if (!users) return <div className={styles.center}><span className="spinner spinner-lg" /></div>

  const filtered = !search ? users : users.filter(u =>
    (u.displayName||'').toLowerCase().includes(search.toLowerCase()) ||
    (u.email||'').toLowerCase().includes(search.toLowerCase())
  )

  async function act(fn, msg) {
    try { await fn(); toast.success(msg); onRefresh() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <input className="inp" placeholder="🔍 Buscar usuario..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }} />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={5} style={{ textAlign:'center', padding:'2rem', color:'var(--t3)' }}>Sin usuarios</td></tr>
              : filtered.map(u => (
              <tr key={u.id} className={u.banned ? styles.rowBanned : ''}>
                <td>
                  <div className={styles.userCell}>
                    {u.photoURL ? <img src={u.photoURL} alt="" className="avatar avatar-sm" /> : <div className={styles.avatarFb}>{(u.displayName||'U')[0]}</div>}
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{u.displayName || u.username}</span>
                    {u.verified && <span style={{ color: 'var(--cyan)' }}>✓</span>}
                  </div>
                </td>
                <td className={styles.muted}>{u.email}</td>
                <td>
                  <span className={`badge ${u.role==='owner'?'badge-gold':u.role==='admin'?'badge-purple':u.role==='admin_jr'?'badge-cyan':'badge-green'}`}>
                    {u.role || 'user'}
                  </span>
                </td>
                <td><span className={`badge ${u.banned?'badge-red':'badge-green'}`}>{u.banned?'Baneado':'Activo'}</span></td>
                <td>
                  {u.id !== me.uid && u.role !== 'owner' && (
                    <div className={styles.actionBtns}>
                      <button className="btn btn-sm btn-ghost"
                        onClick={() => act(() => verifyUser(u.id, !u.verified), u.verified ? 'Verificación quitada' : '✓ Verificado')}>
                        {u.verified ? '✓ Quitar' : '✓ Verificar'}
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══════════════════════
//  POSTS
// ══════════════════════
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
  if (!posts?.length) return <Empty icon="✅" text="Sin posts pendientes" />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {posts.map(p => (
        <div key={p.id} className="card" style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', padding:'0.85rem', flexWrap:'wrap' }}>
          {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width:72, height:54, objectFit:'cover', borderRadius:8, flexShrink:0 }} />}
          <div style={{ flex:1, minWidth:180 }}>
            <div style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:'0.3rem' }}>{p.name}</div>
            <span className="badge badge-purple" style={{ fontSize:'0.7rem' }}>{p.category}</span>
            <p style={{ color:'var(--t3)', fontSize:'0.78rem', marginTop:'0.3rem' }}>{p.description?.slice(0,80)}</p>
          </div>
          <div style={{ display:'flex', gap:'0.35rem', flexWrap:'wrap' }}>
            <button className="btn btn-primary btn-sm"  onClick={() => act(p.id,'approve')}>✅ Aprobar</button>
            <button className="btn btn-ghost btn-sm"    onClick={() => act(p.id,'verify')}>✓ Verificar</button>
            <button className="btn btn-ghost btn-sm"    onClick={() => act(p.id,'feature')}>⭐ Destacar</button>
            <button className="btn btn-danger btn-sm"   onClick={() => act(p.id,'delete')}>🗑️ Eliminar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════
//  REPORTES
// ══════════════════════
function ReportsPanel({ reports, user, onRefresh }) {
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyMsg, setReplyMsg]     = useState('')
  const [verdict, setVerdict]       = useState('legitimate')

  async function handleReply(id) {
    if (!replyMsg.trim()) { toast.error('Escribe un mensaje'); return }
    try {
      await replyToReport(id, user.uid, user.displayName, replyMsg.trim(), verdict)
      toast.success('Respuesta enviada ✅')
      setReplyingTo(null); setReplyMsg(''); onRefresh()
    } catch (e) { toast.error(e.message) }
  }

  if (!reports?.length) return <Empty icon="✅" text="Sin reportes pendientes" />
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
      {reports.map(r => (
        <div key={r.id} className="card" style={{ padding:'0.85rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.5rem', marginBottom:'0.5rem' }}>
            <div>
              <span style={{ fontWeight:700, fontSize:'0.88rem' }}>Reporte</span>
              <span className="badge badge-red" style={{ marginLeft:8, fontSize:'0.72rem' }}>{r.reason}</span>
            </div>
            <div style={{ display:'flex', gap:'0.4rem' }}>
              <button className="btn btn-primary btn-sm" onClick={() => { setReplyingTo(r.id); setReplyMsg('') }}>💬 Responder</button>
              <button className="btn btn-ghost btn-sm" onClick={() => resolveReport(r.id,'dismissed').then(onRefresh)}>🚫 Desestimar</button>
            </div>
          </div>
          <p style={{ color:'var(--t3)', fontSize:'0.78rem' }}>Por: {r.reportedBy?.slice(0,12)}...</p>
          {replyingTo === r.id && (
            <div style={{ marginTop:'0.75rem', padding:'0.85rem', background:'var(--bg2)', borderRadius:'var(--r)', border:'1px solid var(--border2)' }}>
              <div style={{ display:'flex', gap:'0.4rem', marginBottom:'0.5rem' }}>
                <button className={`btn btn-sm ${verdict==='legitimate'?'btn-primary':'btn-ghost'}`} onClick={() => setVerdict('legitimate')}>✅ Legítimo</button>
                <button className={`btn btn-sm ${verdict==='not_legitimate'?'btn-danger':'btn-ghost'}`} onClick={() => setVerdict('not_legitimate')}>❌ No legítimo</button>
              </div>
              <textarea className="inp" placeholder="Mensaje para el usuario..." value={replyMsg}
                onChange={e => setReplyMsg(e.target.value)} rows={2} style={{ resize:'none', marginBottom:'0.5rem' }} />
              <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setReplyingTo(null)}>Cancelar</button>
                <button className="btn btn-primary btn-sm" onClick={() => handleReply(r.id)}>📨 Enviar</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ══════════════════════
//  BOT SEGUIDORES
// ══════════════════════
function BotsPanel({ users, admin }) {
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
    <div style={{ maxWidth: 440 }}>
      <div className="card" style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'0.85rem' }}>
        <div className={styles.sectionTitle}>🤖 Bot de seguidores</div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
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
          <input className="inp" type="number" min={1} max={10000} value={amount}
            onChange={e => setAmount(e.target.value)} />
        </div>
        <button className={`btn btn-lg ${mode==='add'?'btn-primary':'btn-danger'}`}
          onClick={handle} disabled={loading || !selected} style={{ width:'100%' }}>
          {loading
            ? <span className="spinner" style={{ width:18, height:18 }} />
            : mode==='add' ? `➕ Agregar ${amount} seguidores` : `➖ Quitar ${amount} seguidores`}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════
//  LOGS
// ══════════════════════
function LogsPanel({ logs }) {
  if (!logs?.length) return <Empty icon="📋" text="Sin logs registrados" />
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Acción</th><th>Detalles</th><th>Fecha</th></tr></thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id}>
              <td><span className="badge badge-purple" style={{ fontSize:'0.72rem' }}>{l.action}</span></td>
              <td className={styles.muted}>{l.amount ? `×${l.amount}` : l.reason || l.targetId?.slice(0,12) || '—'}</td>
              <td className={styles.muted}>{l.createdAt?.toDate?.().toLocaleString('es') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ══════════════════════
//  CONFIG
// ══════════════════════
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
      <div className="card" style={{ padding:'1.1rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
        <div className={styles.sectionTitle}>💬 Chat Global</div>
        <p style={{ fontSize:'0.85rem', color:'var(--t2)' }}>Desactiva temporalmente el chat para todos.</p>
        <button className={`btn ${chatClosed?'btn-primary':'btn-danger'}`} onClick={toggleChat}>
          {chatClosed ? '🔓 Abrir chat' : '🔒 Cerrar chat'}
        </button>
      </div>
    </div>
  )
}

function Empty({ icon, text }) {
  return (
    <div className="empty" style={{ padding: '3rem' }}>
      <div className="empty-icon">{icon}</div>
      <h3>{text}</h3>
    </div>
  )
}
