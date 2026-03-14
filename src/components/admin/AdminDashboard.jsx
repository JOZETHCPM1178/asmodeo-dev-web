// src/components/admin/AdminDashboard.jsx
// ════════════════════════════════════════
//  PANEL DE ADMINISTRACIÓN — Robusto, sin crashes
// ════════════════════════════════════════
import { useState, useEffect, Component } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import {
  getStats, getAllUsers, setUserRole, banUser, unbanUser,
  verifyUser, getPendingPosts, getReports, replyToReport,
  resolveReport, getAdminLogs, addFakeFollowers, removeFakeFollowers,
} from '../../services/admin'
import {
  deletePost, toggleFeatured, verifyPost, setPostStatus, migrateOldPosts,
} from '../../services/posts'
import { setChatStatus } from '../../services/social'
import styles from './AdminDashboard.module.css'

// ─── ERROR BOUNDARY para que un panel no rompa toda la web ───
class PanelBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e.message } }
  render() {
    if (this.state.error) {
      return (
        <div className={styles.errorBox}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorTitle}>Error en este panel</div>
          <div className={styles.errorMsg}>{this.state.error}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => this.setState({ error: null })}>
            🔄 Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── DEFINICIÓN DE TABS ───
// role: 'admin' = solo admin, 'staff' = admin + admin_jr
const ALL_TABS = [
  { id: 'stats',     label: '📊 Stats',          role: 'staff' },
  { id: 'users',     label: '👥 Usuarios',        role: 'admin' },
  { id: 'posts',     label: '📝 Posts',           role: 'staff' },
  { id: 'reports',   label: '⚠️ Reportes',        role: 'staff' },
  { id: 'followers', label: '🤖 Seguidores Bot',  role: 'admin' },
  { id: 'logs',      label: '📋 Logs',            role: 'admin' },
  { id: 'config',    label: '⚙️ Config',          role: 'admin' },
]

export default function AdminDashboard() {
  const { user } = useAuth()

  // Filtrar tabs según rol
  const tabs = ALL_TABS.filter(t =>
    t.role === 'staff' ? user.isStaff : user.isAdmin
  )

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'stats')

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>🛡️ Panel Admin</h1>
        <span className={`badge ${user.isAdmin ? 'badge-purple' : 'badge-cyan'}`}>
          {user.isAdmin ? '👑 ADMIN' : '🛡️ ADMIN JR'}
        </span>
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

      {/* Panel activo — envuelto en ErrorBoundary */}
      <PanelBoundary key={activeTab}>
        {activeTab === 'stats'     && <StatsPanel />}
        {activeTab === 'users'     && <UsersPanel currentUser={user} />}
        {activeTab === 'posts'     && <PostsPanel currentUser={user} />}
        {activeTab === 'reports'   && <ReportsPanel currentUser={user} />}
        {activeTab === 'followers' && <FollowersBotPanel currentUser={user} />}
        {activeTab === 'logs'      && <LogsPanel />}
        {activeTab === 'config'    && <ConfigPanel />}
      </PanelBoundary>
    </div>
  )
}

// ═══════════════════════════════════════════
//  STATS
// ═══════════════════════════════════════════
function StatsPanel() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />
  if (error) return <ErrorMsg msg={error} />

  const cards = [
    { label: 'Posts totales',   value: stats?.totalPosts,       icon: '📝', color: 'var(--p2)'  },
    { label: 'Usuarios',        value: stats?.totalUsers,       icon: '👥', color: 'var(--cyan)' },
    { label: 'Likes totales',   value: stats?.totalLikes,       icon: '❤️', color: 'var(--red)'  },
    { label: 'Descargas',       value: stats?.totalDownloads,   icon: '⬇️', color: 'var(--green)'},
    { label: 'Esta semana',     value: stats?.recentPostsCount, icon: '📅', color: 'var(--gold)' },
    { label: 'Reportes pendientes', value: stats?.pendingReports, icon: '⚠️', color: 'var(--red)' },
  ]

  return (
    <div className={styles.section}>
      <div className={styles.statGrid}>
        {cards.map((c, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statIcon}>{c.icon}</div>
            <div className={styles.statVal} style={{ color: c.color }}>
              {c.value?.toLocaleString('es') ?? '—'}
            </div>
            <div className={styles.statLbl}>{c.label}</div>
          </div>
        ))}
      </div>

      {stats?.topPosts?.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className={styles.sectionTitle}>🏆 Top publicaciones</div>
          {stats.topPosts.map((p, i) => (
            <div key={p.id || i} className={styles.topRow}>
              <span className={styles.rank}>#{i + 1}</span>
              <span className={styles.topName}>{p.name}</span>
              <span className={styles.topMeta}>❤️ {p.likes || 0}</span>
              <span className={styles.topMeta}>⬇️ {p.downloads || 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
//  USUARIOS
// ═══════════════════════════════════════════
function UsersPanel({ currentUser }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    getAllUsers({ pageSize: 50 })
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <Loader />
  if (error) return <ErrorMsg msg={error} onRetry={load} />

  async function handleBan(u) {
    try {
      if (u.banned) {
        await unbanUser(u.id)
        toast.success('Usuario desbaneado ✅')
      } else {
        const reason = window.prompt('Razón del baneo (opcional):') ?? ''
        await banUser(u.id, reason)
        toast.success('Usuario baneado 🚫')
      }
      load()
    } catch (e) { toast.error(e.message) }
  }

  async function handleRole(uid, role) {
    try {
      await setUserRole(uid, role)
      toast.success('Rol actualizado ✅')
      load()
    } catch (e) { toast.error(e.message) }
  }

  async function handleVerify(u) {
    try {
      await verifyUser(u.id, !u.verified)
      toast.success(u.verified ? 'Verificación quitada' : 'Usuario verificado ✅')
      load()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>👥 Usuarios ({users.length})</div>
      <div className={styles.userList}>
        {users.map(u => (
          <div key={u.id} className={`${styles.userRow} ${u.banned ? styles.bannedRow : ''}`}>
            {/* Avatar */}
            <div className={styles.userAvatar}>
              {u.photoURL
                ? <img src={u.photoURL} alt="" className="avatar avatar-sm" />
                : <div className={styles.avatarFb}>{(u.displayName || u.username || 'U')[0].toUpperCase()}</div>
              }
            </div>

            {/* Info */}
            <div className={styles.userInfo}>
              <div className={styles.userName}>
                {u.displayName || u.username || 'Sin nombre'}
                {u.verified && <span className={styles.check}>✓</span>}
                {(u.fakeFollowers > 0) && <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>🤖 {u.fakeFollowers}</span>}
              </div>
              <div className={styles.userEmail}>{u.email}</div>
              <div className={styles.userMeta}>
                <span className={`badge ${u.role === 'admin' ? 'badge-purple' : u.role === 'admin_jr' ? 'badge-cyan' : 'badge-green'}`}>
                  {u.role || 'user'}
                </span>
                <span className={`badge ${u.banned ? 'badge-red' : 'badge-green'}`}>
                  {u.banned ? '🚫 Baneado' : '✅ Activo'}
                </span>
              </div>
            </div>

            {/* Acciones — solo si no es el propio admin */}
            {u.id !== currentUser.uid && (
              <div className={styles.userActions}>
                {currentUser.isAdmin && (
                  <select
                    className={styles.roleSelect}
                    value={u.role || 'user'}
                    onChange={e => handleRole(u.id, e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin_jr">Admin Jr</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
                <button
                  className={`btn btn-sm ${u.banned ? 'btn-secondary' : 'btn-danger'}`}
                  onClick={() => handleBan(u)}
                >
                  {u.banned ? '✅ Desbanear' : '🚫 Banear'}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => handleVerify(u)}
                >
                  {u.verified ? 'Quitar ✓' : '✓ Verificar'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  POSTS
// ═══════════════════════════════════════════
function PostsPanel({ currentUser }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    getPendingPosts()
      .then(setPosts)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <Loader />
  if (error) return <ErrorMsg msg={error} onRetry={load} />
  if (!posts.length) return <Empty icon="✅" text="Sin posts pendientes" />

  async function act(postId, action, authorId) {
    try {
      if (action === 'delete') {
        if (!currentUser.isAdmin && authorId !== currentUser.uid) {
          toast.error('Solo puedes eliminar tus propios posts'); return
        }
        if (!window.confirm('¿Eliminar esta publicación permanentemente?')) return
        await deletePost(postId)
      } else if (action === 'approve') await setPostStatus(postId, 'active')
      else if (action === 'reject')  await setPostStatus(postId, 'rejected')
      else if (action === 'verify')  await verifyPost(postId, true)
      else if (action === 'feature') await toggleFeatured(postId, true)
      toast.success('✅ Listo')
      load()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>📝 Posts pendientes ({posts.length})</div>
      <div className={styles.cardList}>
        {posts.map(p => (
          <div key={p.id} className={styles.postCard}>
            {p.imageUrl && (
              <img src={p.imageUrl} alt="" className={styles.postThumb} />
            )}
            <div className={styles.postInfo}>
              <div className={styles.postName}>{p.name}</div>
              <div className={styles.postMeta}>
                <span className="badge badge-purple">{p.category}</span>
                {p.status === 'pending_review' && <span className="badge badge-gold">⏳ Revisión</span>}
              </div>
              <div className={styles.postAuthor}>Por: {p.authorName || '—'}</div>
            </div>
            <div className={styles.postActions}>
              <button className="btn btn-primary btn-sm" onClick={() => act(p.id, 'approve', p.authorId)}>✅ Aprobar</button>
              <button className="btn btn-ghost btn-sm"   onClick={() => act(p.id, 'verify', p.authorId)}>✓ Verificar</button>
              {currentUser.isAdmin && (
                <button className="btn btn-ghost btn-sm" onClick={() => act(p.id, 'feature', p.authorId)}>⭐ Destacar</button>
              )}
              {(currentUser.isAdmin || p.authorId === currentUser.uid) && (
                <button className="btn btn-danger btn-sm" onClick={() => act(p.id, 'delete', p.authorId)}>🗑️ Eliminar</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  REPORTES
// ═══════════════════════════════════════════
function ReportsPanel({ currentUser }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [replyId, setReplyId] = useState(null)
  const [replyMsg, setReplyMsg] = useState('')
  const [verdict, setVerdict] = useState('legitimate')
  const [sending, setSending] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    getReports()
      .then(setReports)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <Loader />
  if (error) return <ErrorMsg msg={error} onRetry={load} />
  if (!reports.length) return <Empty icon="✅" text="Sin reportes pendientes" />

  async function handleReply(reportId) {
    if (!replyMsg.trim()) { toast.error('Escribe un mensaje'); return }
    setSending(true)
    try {
      await replyToReport(reportId, currentUser.uid, currentUser.displayName, replyMsg.trim(), verdict)
      toast.success('Respuesta enviada ✅')
      setReplyId(null); setReplyMsg('')
      load()
    } catch (e) { toast.error(e.message) }
    finally { setSending(false) }
  }

  async function handleDismiss(reportId) {
    try { await resolveReport(reportId, 'dismissed'); toast.success('Reporte desestimado'); load() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>⚠️ Reportes pendientes ({reports.length})</div>
      <div className={styles.cardList}>
        {reports.map(r => (
          <div key={r.id} className={styles.reportCard}>
            <div className={styles.reportInfo}>
              <div className={styles.reportReason}>📋 {r.reason}</div>
              {r.postId && <div className={styles.reportMeta}>Post: {r.postId.slice(0, 12)}...</div>}
              <div className={styles.reportMeta}>Por: {r.reportedBy?.slice(0, 12)}...</div>
            </div>
            <div className={styles.reportActions}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setReplyId(r.id); setReplyMsg(''); setVerdict('legitimate') }}
              >
                💬 Responder
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDismiss(r.id)}>
                🚫 Desestimar
              </button>
            </div>

            {replyId === r.id && (
              <div className={styles.replyBox}>
                <div className={styles.verdictRow}>
                  <button
                    className={`btn btn-sm ${verdict === 'legitimate' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setVerdict('legitimate')}
                  >✅ Legítimo</button>
                  <button
                    className={`btn btn-sm ${verdict === 'not_legitimate' ? 'btn-danger' : 'btn-ghost'}`}
                    onClick={() => setVerdict('not_legitimate')}
                  >❌ No legítimo</button>
                </div>
                <textarea
                  className="inp"
                  placeholder="Mensaje para el usuario..."
                  value={replyMsg}
                  onChange={e => setReplyMsg(e.target.value)}
                  rows={3}
                  maxLength={400}
                  style={{ resize: 'none', marginTop: '0.5rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setReplyId(null)}>Cancelar</button>
                  <button className="btn btn-primary btn-sm" onClick={() => handleReply(r.id)} disabled={sending}>
                    {sending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '📨 Enviar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  SEGUIDORES BOT
// ═══════════════════════════════════════════
function FollowersBotPanel({ currentUser }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState('')
  const [amount, setAmount] = useState(100)
  const [mode, setMode] = useState('add')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAllUsers({ pageSize: 100 })
      .then(u => setUsers(u.filter(x => !x.banned)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />
  if (error) return <ErrorMsg msg={error} />

  const selectedUser = users.find(u => u.id === selected)

  async function handle() {
    if (!selected) { toast.error('Selecciona un usuario'); return }
    const n = Number(amount)
    if (!n || n < 1) { toast.error('Cantidad mínima: 1'); return }
    setSaving(true)
    try {
      if (mode === 'add') {
        await addFakeFollowers(selected, n, currentUser.uid)
        toast.success(`✅ +${n} seguidores agregados`)
      } else {
        await removeFakeFollowers(selected, n, currentUser.uid)
        toast.success(`✅ -${n} seguidores quitados`)
      }
      setSelected('')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>🤖 Seguidores Bot</div>
      <p className={styles.desc}>Agrega o quita seguidores a creadores. Solo visible para admins.</p>

      <div className={styles.botForm}>
        {/* Modo */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn btn-sm ${mode === 'add' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('add')}
          >➕ Agregar</button>
          <button
            className={`btn btn-sm ${mode === 'remove' ? 'btn-danger' : 'btn-ghost'}`}
            onClick={() => setMode('remove')}
          >➖ Quitar</button>
        </div>

        {/* Seleccionar usuario */}
        <div className="inp-group">
          <label className="inp-label">Seleccionar usuario</label>
          <select className="inp" value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">— Elige un usuario —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.displayName || u.username || u.email}
                {' — '}{u.followers || 0} seguidores
                {u.fakeFollowers > 0 ? ` (🤖 ${u.fakeFollowers})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Preview usuario seleccionado */}
        {selectedUser && (
          <div className={styles.userPreview}>
            {selectedUser.photoURL
              ? <img src={selectedUser.photoURL} alt="" className="avatar avatar-sm" />
              : <div className={styles.avatarFb}>{(selectedUser.displayName || 'U')[0]}</div>
            }
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{selectedUser.displayName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--t3)' }}>
                👥 {selectedUser.followers || 0} totales
                {selectedUser.fakeFollowers > 0 && ` · 🤖 ${selectedUser.fakeFollowers} bot`}
              </div>
            </div>
          </div>
        )}

        {/* Cantidad */}
        <div className="inp-group">
          <label className="inp-label">Cantidad</label>
          <input
            className="inp"
            type="number"
            min={1}
            max={10000}
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <button
          className={`btn btn-lg ${mode === 'add' ? 'btn-primary' : 'btn-danger'}`}
          onClick={handle}
          disabled={saving || !selected}
          style={{ width: '100%' }}
        >
          {saving
            ? <span className="spinner" style={{ width: 18, height: 18 }} />
            : mode === 'add'
              ? `➕ Agregar ${amount} seguidores`
              : `➖ Quitar ${amount} seguidores`
          }
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  LOGS
// ═══════════════════════════════════════════
function LogsPanel() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getAdminLogs()
      .then(setLogs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />
  if (error) return <ErrorMsg msg={error} />
  if (!logs.length) return <Empty icon="📋" text="Sin logs" />

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>📋 Logs de administración ({logs.length})</div>
      <div className={styles.logList}>
        {logs.map(l => (
          <div key={l.id} className={styles.logRow}>
            <span className="badge badge-purple">{l.action}</span>
            <span className={styles.logMeta}>Admin: {l.adminId?.slice(0, 8) || '—'}</span>
            {l.targetId && <span className={styles.logMeta}>Target: {l.targetId.slice(0, 8)}</span>}
            {l.amount   && <span className={styles.logMeta}>×{l.amount}</span>}
            {l.reason   && <span className={styles.logMeta}>"{l.reason}"</span>}
            <span className={styles.logDate}>{l.createdAt?.toDate?.().toLocaleString('es') || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════
function ConfigPanel() {
  const [chatClosed, setChatClosedState] = useState(false)
  const [migrating, setMigrating] = useState(false)

  async function toggleChat() {
    try {
      await setChatStatus(!chatClosed)
      setChatClosedState(c => !c)
      toast.success(chatClosed ? 'Chat abierto 🔓' : 'Chat cerrado 🔒')
    } catch (e) { toast.error(e.message) }
  }

  async function handleMigrate() {
    if (!window.confirm('¿Migrar posts antiguos? Solo es necesario hacerlo una vez.')) return
    setMigrating(true)
    try {
      const count = await migrateOldPosts()
      toast.success(`✅ ${count} posts migrados`)
    } catch (e) { toast.error(e.message) }
    finally { setMigrating(false) }
  }

  return (
    <div className={styles.section}>
      <div className={styles.configGrid}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className={styles.sectionTitle}>💬 Chat Global</div>
          <p className={styles.desc}>Cierra el chat para todos temporalmente.</p>
          <button className={`btn ${chatClosed ? 'btn-primary' : 'btn-danger'}`} onClick={toggleChat}>
            {chatClosed ? '🔓 Abrir chat' : '🔒 Cerrar chat'}
          </button>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className={styles.sectionTitle}>🔄 Migrar posts antiguos</div>
          <p className={styles.desc}>
            Actualiza posts antiguos para que aparezcan en el feed. Hazlo solo una vez.
          </p>
          <button className="btn btn-secondary" onClick={handleMigrate} disabled={migrating}>
            {migrating
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Migrando...</>
              : '🔄 Migrar ahora'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  HELPERS UI
// ═══════════════════════════════════════════
function Loader() {
  return <div className={styles.loaderWrap}><span className="spinner spinner-lg" /></div>
}

function Empty({ icon, text }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{text}</h3>
    </div>
  )
}

function ErrorMsg({ msg, onRetry }) {
  return (
    <div className={styles.errorBox}>
      <div className={styles.errorIcon}>⚠️</div>
      <div className={styles.errorTitle}>Error al cargar</div>
      <div className={styles.errorMsg}>{msg}</div>
      {onRetry && (
        <button className="btn btn-ghost btn-sm" onClick={onRetry}>🔄 Reintentar</button>
      )}
    </div>
  )
}
