// src/components/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react'
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

// Tabs por rol
const ALL_TABS = [
  { label: '👑 Owner',       role: 'owner' },
  { label: '📊 Stats',       role: 'admin' },
  { label: '👥 Usuarios',    role: 'admin' },
  { label: '📝 Posts',       role: 'staff' },
  { label: '⚠️ Reportes',    role: 'staff' },
  { label: '🤖 Seguidores',  role: 'admin' },
  { label: '📋 Logs',        role: 'admin' },
  { label: '⚙️ Config',      role: 'admin' },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const [tab, setTab]   = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const visibleTabs = ALL_TABS.filter(t => {
    if (t.role === 'owner') return user.isOwner
    if (t.role === 'admin') return user.isAdmin
    if (t.role === 'staff') return user.isStaff
    return false
  })

  useEffect(() => { loadTab(tab) }, [tab])

  async function loadTab(i) {
    setLoading(true); setData(null)
    try {
      const label = visibleTabs[i]?.label || ''
      if (label.includes('Stats'))      setData(await getStats())
      else if (label.includes('Usuarios')) setData(await getAllUsers())
      else if (label.includes('Posts'))    setData(await getPendingPosts())
      else if (label.includes('Reportes')) setData(await getReports())
      else if (label.includes('Seguidores')) setData(await getAllUsers())
      else if (label.includes('Logs'))     setData(await getAdminLogs())
      else setData({})
    } catch (e) { toast.error('Error: ' + e.message) }
    finally { setLoading(false) }
  }

  const label = visibleTabs[tab]?.label || ''

  const roleBadge = user.isOwner
    ? { text: '👑 OWNER', cls: 'badge-gold' }
    : user.isAdmin
      ? { text: '🛡️ ADMIN', cls: 'badge-purple' }
      : { text: '🔰 ADMIN JR', cls: 'badge-cyan' }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Panel de Control</h1>
        <span className={`badge ${roleBadge.cls}`}>{roleBadge.text}</span>
      </div>

      <div className={styles.tabs}>
        {visibleTabs.map((t, i) => (
          <button key={i}
            className={`${styles.tab} ${tab === i ? styles.active : ''}`}
            onClick={() => setTab(i)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.center}><span className="spinner spinner-lg" /></div>
        ) : (
          <>
            {label.includes('Owner')      && <OwnerPanel user={user} />}
            {label.includes('Stats')      && <StatsPanel stats={data} />}
            {label.includes('Usuarios')   && <UsersPanel users={data || []} me={user} onRefresh={() => loadTab(tab)} />}
            {label.includes('Posts')      && <PostsPanel posts={data || []} onRefresh={() => loadTab(tab)} />}
            {label.includes('Reportes')   && <ReportsPanel reports={data || []} user={user} onRefresh={() => loadTab(tab)} />}
            {label.includes('Seguidores') && <BotsPanel users={data || []} user={user} />}
            {label.includes('Logs')       && <LogsPanel logs={data || []} />}
            {label.includes('Config')     && <ConfigPanel />}
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════
//  OWNER PANEL — Solo para el dueño
// ══════════════════════════════════
function OwnerPanel({ user }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllUsers({ pageSize: 100 }).then(setUsers).finally(() => setLoading(false))
  }, [])

  async function handleRole(uid, role) {
    // No permitir cambiar rol del owner
    if (uid === user.uid) { toast.error('No puedes cambiar tu propio rol'); return }
    try { await setUserRole(uid, role); toast.success('Rol actualizado'); setUsers(u => u.map(x => x.id === uid ? { ...x, role } : x)) }
    catch (e) { toast.error(e.message) }
  }

  async function handleVerify(uid, verified) {
    try { await verifyUser(uid, !verified); toast.success(verified ? 'Verificación quitada' : '✓ Verificado'); setUsers(u => u.map(x => x.id === uid ? { ...x, verified: !verified } : x)) }
    catch (e) { toast.error(e.message) }
  }

  async function handleBan(uid, banned) {
    if (uid === user.uid) { toast.error('No puedes banearte a ti mismo'); return }
    try {
      if (banned) { await unbanUser(uid); toast.success('Desbaneado') }
      else { const r = prompt('Razón:') || ''; await banUser(uid, r); toast.success('Baneado') }
      setUsers(u => u.map(x => x.id === uid ? { ...x, banned: !banned } : x))
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className={styles.ownerPanel}>
      {/* Banner owner */}
      <div className={styles.ownerBanner}>
        <div className={styles.ownerBannerInner}>
          <span className={styles.ownerCrown}>👑</span>
          <div>
            <div className={styles.ownerTitle}>Panel Owner</div>
            <div className={styles.ownerSub}>Control total de la plataforma · {user.displayName}</div>
          </div>
        </div>
        <div className={styles.ownerStats}>
          <div className={styles.ownerStat}><span>{users.length}</span><span>Usuarios</span></div>
          <div className={styles.ownerStat}><span>{users.filter(u => u.role === 'admin').length}</span><span>Admins</span></div>
          <div className={styles.ownerStat}><span>{users.filter(u => u.verified).length}</span><span>Verificados</span></div>
          <div className={styles.ownerStat}><span>{users.filter(u => u.banned).length}</span><span>Baneados</span></div>
        </div>
      </div>

      {/* Gestión completa de usuarios */}
      <div className={styles.sectionTitle}>👥 Gestión de usuarios</div>
      {loading ? <div className={styles.center}><span className="spinner" /></div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={u.id === user.uid ? styles.selfRow : u.banned ? styles.rowBanned : ''}>
                  <td>
                    <div className={styles.userCell}>
                      {u.photoURL
                        ? <img src={u.photoURL} alt="" className="avatar avatar-sm" />
                        : <div className={styles.avatarFb}>{(u.displayName || 'U')[0]}</div>
                      }
                      <span>{u.displayName || u.username}</span>
                      {u.verified && <span style={{ color: '#8b0000', fontSize: '0.9rem' }}>✓</span>}
                      {u.id === user.uid && <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>TÚ</span>}
                    </div>
                  </td>
                  <td className={styles.muted}>{u.email}</td>
                  <td>
                    {u.id === user.uid
                      ? <span className="badge badge-gold">👑 OWNER</span>
                      : <select className={styles.roleSelect} value={u.role}
                          onChange={e => handleRole(u.id, e.target.value)}>
                          <option value="user">User</option>
                          <option value="admin_jr">Admin Jr</option>
                          <option value="admin">Admin</option>
                        </select>
                    }
                  </td>
                  <td>
                    <span className={`badge ${u.banned ? 'badge-red' : 'badge-green'}`}>
                      {u.banned ? 'Baneado' : 'Activo'}
                    </span>
                  </td>
                  <td>
                    {u.id !== user.uid && (
                      <div className={styles.actionBtns}>
                        <button className="btn btn-sm btn-ghost"
                          onClick={() => handleVerify(u.id, u.verified)}>
                          {u.verified ? '✓ Quitar' : '✓ Verificar'}
                        </button>
                        <button className={`btn btn-sm ${u.banned ? 'btn-secondary' : 'btn-danger'}`}
                          onClick={() => handleBan(u.id, u.banned)}>
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
      )}
    </div>
  )
}

// ══════════════════════
//  STATS
// ══════════════════════
function StatsPanel({ stats }) {
  if (!stats) return <Empty icon="📊" text="Sin datos" />
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
            <div className={styles.statVal} style={{ color: c.color }}>{c.value?.toLocaleString() ?? '—'}</div>
            <div className={styles.statLbl}>{c.label}</div>
          </div>
        ))}
      </div>
      {stats.topPosts?.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className={styles.sectionTitle}>🏆 Top 5</div>
          {stats.topPosts.map((p, i) => (
            <div key={p.id} className={styles.topRow}>
              <span className={styles.topRank}>#{i+1}</span>
              <span style={{ flex: 1, fontSize: '0.85rem' }}>{p.name}</span>
              <span className={styles.muted}>❤️ {p.likes || 0}</span>
              <span className={styles.muted}>⬇️ {p.downloads || 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════
//  USUARIOS
// ══════════════════════
function UsersPanel({ users, me, onRefresh }) {
  async function act(fn, msg) {
    try { await fn(); toast.success(msg); onRefresh() }
    catch (e) { toast.error(e.message) }
  }
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className={u.banned ? styles.rowBanned : ''}>
              <td>
                <div className={styles.userCell}>
                  {u.photoURL ? <img src={u.photoURL} alt="" className="avatar avatar-sm" /> : <div className={styles.avatarFb}>{(u.displayName||'U')[0]}</div>}
                  <span>{u.displayName || u.username}</span>
                  {u.verified && <span style={{ color: '#8b0000' }}>✓</span>}
                </div>
              </td>
              <td className={styles.muted}>{u.email}</td>
              <td><span className={`badge ${u.role === 'owner' ? 'badge-gold' : u.role === 'admin' ? 'badge-purple' : u.role === 'admin_jr' ? 'badge-cyan' : 'badge-green'}`}>{u.role}</span></td>
              <td><span className={`badge ${u.banned ? 'badge-red' : 'badge-green'}`}>{u.banned ? 'Baneado' : 'Activo'}</span></td>
              <td>
                {u.id !== me.uid && u.role !== 'owner' && (
                  <div className={styles.actionBtns}>
                    <button className="btn btn-sm btn-ghost"
                      onClick={() => act(() => verifyUser(u.id, !u.verified), u.verified ? 'Verificación quitada' : '✓ Verificado')}>
                      {u.verified ? '✓ Quitar' : '✓ Verificar'}
                    </button>
                    <button className={`btn btn-sm ${u.banned ? 'btn-secondary' : 'btn-danger'}`}
                      onClick={() => {
                        if (u.banned) act(() => unbanUser(u.id), 'Desbaneado')
                        else { const r = prompt('Razón:') || ''; act(() => banUser(u.id, r), 'Baneado') }
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
  )
}

// ══════════════════════
//  POSTS
// ══════════════════════
function PostsPanel({ posts, onRefresh }) {
  async function act(id, action) {
    try {
      if (action === 'approve') await setPostStatus(id, 'active')
      else if (action === 'delete') { if (!confirm('¿Eliminar?')) return; await deletePost(id) }
      else if (action === 'feature') await toggleFeatured(id, true)
      else if (action === 'verify') await verifyPost(id, true)
      toast.success('Listo'); onRefresh()
    } catch (e) { toast.error(e.message) }
  }
  if (!posts?.length) return <Empty icon="✅" text="Sin posts pendientes" />
  return (
    <div className={styles.list}>
      {posts.map(p => (
        <div key={p.id} className={`card ${styles.listItem}`}>
          {p.imageUrl && <img src={p.imageUrl} alt="" className={styles.listThumb} />}
          <div className={styles.listInfo}>
            <div className={styles.listName}>{p.name}</div>
            <div style={{ display: 'flex', gap: '0.4rem', margin: '0.3rem 0' }}>
              <span className="badge badge-purple">{p.category}</span>
            </div>
            <p className={styles.muted}>{p.description?.slice(0, 80)}</p>
          </div>
          <div className={styles.listActions}>
            <button className="btn btn-primary btn-sm" onClick={() => act(p.id, 'approve')}>✅ Aprobar</button>
            <button className="btn btn-ghost btn-sm"   onClick={() => act(p.id, 'verify')}>✓ Verificar</button>
            <button className="btn btn-ghost btn-sm"   onClick={() => act(p.id, 'feature')}>⭐ Destacar</button>
            <button className="btn btn-danger btn-sm"  onClick={() => act(p.id, 'delete')}>🗑️ Eliminar</button>
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
  const [sending, setSending]       = useState(false)

  async function handleReply(id) {
    if (!replyMsg.trim()) { toast.error('Escribe un mensaje'); return }
    setSending(true)
    try {
      await replyToReport(id, user.uid, user.displayName, replyMsg.trim(), verdict)
      toast.success('Respuesta enviada ✅')
      setReplyingTo(null); setReplyMsg(''); onRefresh()
    } catch (e) { toast.error(e.message) }
    finally { setSending(false) }
  }

  if (!reports?.length) return <Empty icon="✅" text="Sin reportes pendientes" />
  return (
    <div className={styles.list}>
      {reports.map(r => (
        <div key={r.id} className={`card ${styles.listItem}`} style={{ flexWrap: 'wrap' }}>
          <div className={styles.listInfo}>
            <div className={styles.listName}>Reporte #{r.id.slice(0,8)}</div>
            <span className="badge badge-red">{r.reason}</span>
            <p className={styles.muted} style={{ marginTop: '0.3rem' }}>Por: {r.reportedBy?.slice(0,10)}...</p>
          </div>
          <div className={styles.listActions}>
            <button className="btn btn-primary btn-sm" onClick={() => { setReplyingTo(r.id); setReplyMsg('') }}>💬 Responder</button>
            <button className="btn btn-ghost btn-sm" onClick={() => resolveReport(r.id, 'dismissed').then(onRefresh)}>🚫 Desestimar</button>
          </div>
          {replyingTo === r.id && (
            <div className={styles.replyPanel}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button className={`btn btn-sm ${verdict === 'legitimate' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setVerdict('legitimate')}>✅ Legítimo</button>
                <button className={`btn btn-sm ${verdict === 'not_legitimate' ? 'btn-danger' : 'btn-ghost'}`} onClick={() => setVerdict('not_legitimate')}>❌ No legítimo</button>
              </div>
              <textarea className="inp" placeholder="Mensaje para el usuario..." value={replyMsg}
                onChange={e => setReplyMsg(e.target.value)} rows={2} style={{ resize: 'none', marginBottom: '0.5rem' }} />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setReplyingTo(null)}>Cancelar</button>
                <button className="btn btn-primary btn-sm" onClick={() => handleReply(r.id)} disabled={sending}>
                  {sending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '📨 Enviar'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ══════════════════════
//  SEGUIDORES BOT
// ══════════════════════
function BotsPanel({ users, user: admin }) {
  const [selected, setSelected] = useState('')
  const [amount, setAmount]     = useState(100)
  const [mode, setMode]         = useState('add')
  const [loading, setLoading]   = useState(false)

  async function handle() {
    if (!selected) { toast.error('Selecciona un usuario'); return }
    setLoading(true)
    try {
      if (mode === 'add') { await addFakeFollowers(selected, Number(amount), admin.uid); toast.success(`+${amount} seguidores`) }
      else { await removeFakeFollowers(selected, Number(amount), admin.uid); toast.success(`-${amount} seguidores`) }
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 440 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
        <div className={styles.sectionTitle}>🤖 Seguidores Bot</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn btn-sm ${mode === 'add' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('add')}>➕ Agregar</button>
          <button className={`btn btn-sm ${mode === 'remove' ? 'btn-danger' : 'btn-ghost'}`} onClick={() => setMode('remove')}>➖ Quitar</button>
        </div>
        <div className="inp-group">
          <label className="inp-label">Usuario</label>
          <select className="inp" value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">— Elige —</option>
            {users.filter(u => !u.banned).map(u => (
              <option key={u.id} value={u.id}>{u.displayName || u.username} ({u.followers || 0} seguidores)</option>
            ))}
          </select>
        </div>
        <div className="inp-group">
          <label className="inp-label">Cantidad</label>
          <input className="inp" type="number" min={1} max={10000} value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <button className={`btn btn-lg ${mode === 'add' ? 'btn-primary' : 'btn-danger'}`}
          onClick={handle} disabled={loading || !selected} style={{ width: '100%' }}>
          {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : mode === 'add' ? `➕ Agregar ${amount}` : `➖ Quitar ${amount}`}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════
//  LOGS
// ══════════════════════
function LogsPanel({ logs }) {
  if (!logs?.length) return <Empty icon="📋" text="Sin logs" />
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Acción</th><th>Admin</th><th>Detalles</th><th>Fecha</th></tr></thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id}>
              <td><span className="badge badge-purple">{l.action}</span></td>
              <td className={styles.muted}>{l.adminId?.slice(0,8)}...</td>
              <td className={styles.muted}>{l.amount ? `×${l.amount}` : l.reason || '—'}</td>
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
  const [chatClosed, setChatClosedState] = useState(false)
  async function toggleChat() {
    try { await setChatStatus(!chatClosed); setChatClosedState(c => !c); toast.success(`Chat ${!chatClosed ? 'cerrado' : 'abierto'}`) }
    catch (e) { toast.error(e.message) }
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '1rem' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className={styles.sectionTitle}>💬 Chat Global</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--t2)' }}>Cierra el chat para todos los usuarios.</p>
        <button className={`btn ${chatClosed ? 'btn-primary' : 'btn-danger'}`} onClick={toggleChat}>
          {chatClosed ? '🔓 Abrir chat' : '🔒 Cerrar chat'}
        </button>
      </div>
    </div>
  )
}

function Empty({ icon, text }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{text}</h3>
    </div>
  )
}
