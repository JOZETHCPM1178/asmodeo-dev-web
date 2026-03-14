// src/components/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import {
  getStats, getAllUsers, setUserRole, banUser, unbanUser,
  verifyUser, getPendingPosts, getReports, resolveReport, getAdminLogs
} from '../../services/admin'
import { deletePost, toggleFeatured, verifyPost, setPostStatus } from '../../services/posts'
import { setChatStatus } from '../../services/social'
import styles from './AdminDashboard.module.css'

const TABS = ['📊 Stats', '👥 Usuarios', '📝 Posts', '⚠️ Reportes', '📋 Logs', '⚙️ Config']

export default function AdminDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState(0)
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [pendingPosts, setPendingPosts] = useState([])
  const [reports, setReports] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData(tab)
  }, [tab])

  async function loadData(t) {
    setLoading(true)
    try {
      if (t === 0) setStats(await getStats())
      else if (t === 1) setUsers(await getAllUsers())
      else if (t === 2) setPendingPosts(await getPendingPosts())
      else if (t === 3) setReports(await getReports())
      else if (t === 4) setLogs(await getAdminLogs())
    } catch (e) {
      toast.error('Error cargando datos: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>🛡️ Panel de Administración</h1>
        <div className={styles.badge}>
          {user.isAdmin ? '👑 ADMIN' : '🛡️ ADMIN JR'}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((t, i) => {
          // ADMIN JR solo ve: Posts, Reportes
          if (!user.isAdmin && i !== 2 && i !== 3) return null
          return (
            <button
              key={i}
              className={`${styles.tab} ${tab === i ? styles.active : ''}`}
              onClick={() => setTab(i)}
            >
              {t}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <span className="spinner spinner-lg" />
        </div>
      ) : (
        <div className={styles.content}>
          {tab === 0 && <StatsPanel stats={stats} />}
          {tab === 1 && <UsersPanel users={users} currentUser={user} onRefresh={() => loadData(1)} />}
          {tab === 2 && <PostsPanel posts={pendingPosts} onRefresh={() => loadData(2)} />}
          {tab === 3 && <ReportsPanel reports={reports} onRefresh={() => loadData(3)} />}
          {tab === 4 && <LogsPanel logs={logs} />}
          {tab === 5 && <ConfigPanel />}
        </div>
      )}
    </div>
  )
}

// ─── STATS ───
function StatsPanel({ stats }) {
  if (!stats) return <div className="empty"><div className="empty-icon">📊</div><h3>Cargando stats...</h3></div>
  const cards = [
    { label: 'Total Posts', value: stats.totalPosts, icon: '📝', color: 'var(--p2)' },
    { label: 'Total Usuarios', value: stats.totalUsers, icon: '👥', color: 'var(--cyan)' },
    { label: 'Total Likes', value: stats.totalLikes, icon: '❤️', color: 'var(--red)' },
    { label: 'Descargas', value: stats.totalDownloads, icon: '⬇️', color: 'var(--green)' },
    { label: 'Posts esta semana', value: stats.recentPostsCount, icon: '📅', color: 'var(--gold)' },
    { label: 'Reportes pendientes', value: stats.pendingReports, icon: '⚠️', color: 'var(--red)' },
  ]

  return (
    <div className={styles.statsWrap}>
      <div className={styles.statCards}>
        {cards.map((c, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: c.color }}>{c.icon}</div>
            <div className={styles.statValue}>{c.value?.toLocaleString() ?? '...'}</div>
            <div className={styles.statLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Top Posts */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🏆 Top 5 más populares</h3>
        <div className={styles.topList}>
          {stats.topPosts?.map((p, i) => (
            <div key={p.id} className={styles.topItem}>
              <span className={styles.topRank}>#{i + 1}</span>
              <span className={styles.topName}>{p.name}</span>
              <span className={styles.topStat}>❤️ {p.likes || 0}</span>
              <span className={styles.topStat}>⬇️ {p.downloads || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Por categoría */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>📁 Posts por categoría</h3>
        <div className={styles.catStats}>
          {Object.entries(stats.byCategory || {}).map(([cat, count]) => (
            <div key={cat} className={styles.catStat}>
              <span>{cat}</span>
              <span className={styles.catCount}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── USUARIOS ───
function UsersPanel({ users, currentUser, onRefresh }) {
  async function handleRole(uid, role) {
    try { await setUserRole(uid, role); toast.success('Rol actualizado'); onRefresh() }
    catch (e) { toast.error(e.message) }
  }
  async function handleBan(uid, banned) {
    const reason = banned ? '' : prompt('Razón del baneo:') || ''
    try {
      if (banned) await unbanUser(uid)
      else await banUser(uid, reason)
      toast.success(banned ? 'Usuario desbaneado' : 'Usuario baneado')
      onRefresh()
    } catch (e) { toast.error(e.message) }
  }
  async function handleVerify(uid, verified) {
    try { await verifyUser(uid, !verified); toast.success('Verificación actualizada'); onRefresh() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className={u.banned ? styles.banned : ''}>
              <td>
                <div className={styles.userCell}>
                  {u.photoURL
                    ? <img src={u.photoURL} alt="" className="avatar avatar-sm" />
                    : <div className={styles.avatarFb}>{(u.username || 'U')[0]}</div>}
                  <span>{u.username || u.displayName}</span>
                  {u.verified && <span title="Verificado" style={{ color: 'var(--cyan)' }}>✓</span>}
                </div>
              </td>
              <td className={styles.tdMuted}>{u.email}</td>
              <td>
                <span className={`badge ${u.role === 'admin' ? 'badge-purple' : u.role === 'admin_jr' ? 'badge-cyan' : 'badge-green'}`}>
                  {u.role}
                </span>
              </td>
              <td>
                <span className={`badge ${u.banned ? 'badge-red' : 'badge-green'}`}>
                  {u.banned ? 'Baneado' : 'Activo'}
                </span>
              </td>
              <td>
                {u.id !== currentUser.uid && (
                  <div className={styles.actionBtns}>
                    {currentUser.isAdmin && (
                      <select
                        className={styles.roleSelect}
                        value={u.role}
                        onChange={e => handleRole(u.id, e.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="admin_jr">Admin Jr</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    <button
                      className={`btn btn-sm ${u.banned ? 'btn-secondary' : 'btn-danger'}`}
                      onClick={() => handleBan(u.id, u.banned)}
                    >
                      {u.banned ? 'Desbanear' : 'Banear'}
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleVerify(u.id, u.verified)}
                    >
                      {u.verified ? '✓ Quitar verificado' : '✓ Verificar'}
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

// ─── POSTS PENDIENTES ───
function PostsPanel({ posts, onRefresh }) {
  async function handleAction(postId, action) {
    try {
      if (action === 'approve') await setPostStatus(postId, 'active')
      else if (action === 'reject') await setPostStatus(postId, 'rejected')
      else if (action === 'delete') { if (!confirm('¿Eliminar?')) return; await deletePost(postId) }
      else if (action === 'feature') await toggleFeatured(postId, true)
      else if (action === 'verify') await verifyPost(postId, true)
      toast.success('Acción realizada')
      onRefresh()
    } catch (e) { toast.error(e.message) }
  }

  if (posts.length === 0) return (
    <div className="empty">
      <div className="empty-icon">✅</div>
      <h3>Sin posts pendientes</h3>
      <p>Todo el contenido está revisado.</p>
    </div>
  )

  return (
    <div className={styles.postList}>
      {posts.map(p => (
        <div key={p.id} className={`card ${styles.postItem}`}>
          {p.imageUrl && <img src={p.imageUrl} alt="" className={styles.postThumb} />}
          <div className={styles.postInfo}>
            <div className={styles.postName}>{p.name}</div>
            <div className={styles.postMeta}>
              <span className="badge badge-purple">{p.category}</span>
              {p.safetyScore < 70 && <span className="badge badge-red">⚠️ Score: {p.safetyScore}</span>}
              {p.safetyIssues?.length > 0 && (
                <span className={styles.issues}>{p.safetyIssues.join(', ')}</span>
              )}
            </div>
            <p className={styles.postDesc}>{p.description?.slice(0, 120)}</p>
          </div>
          <div className={styles.postActions}>
            <button className="btn btn-primary btn-sm" onClick={() => handleAction(p.id, 'approve')}>✅ Aprobar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleAction(p.id, 'verify')}>✓ Verificar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleAction(p.id, 'feature')}>⭐ Destacar</button>
            <button className="btn btn-danger btn-sm" onClick={() => handleAction(p.id, 'reject')}>❌ Rechazar</button>
            <button className="btn btn-danger btn-sm" onClick={() => handleAction(p.id, 'delete')}>🗑️ Eliminar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── REPORTES ───
function ReportsPanel({ reports, onRefresh }) {
  async function handleResolve(id, action) {
    try { await resolveReport(id, action); toast.success('Reporte resuelto'); onRefresh() }
    catch (e) { toast.error(e.message) }
  }

  if (reports.length === 0) return (
    <div className="empty">
      <div className="empty-icon">✅</div>
      <h3>Sin reportes pendientes</h3>
    </div>
  )

  return (
    <div className={styles.postList}>
      {reports.map(r => (
        <div key={r.id} className={`card ${styles.postItem}`}>
          <div className={styles.postInfo}>
            <div className={styles.postName}>Post ID: {r.postId}</div>
            <div className={styles.postMeta}>
              <span className="badge badge-red">Razón: {r.reason}</span>
            </div>
          </div>
          <div className={styles.postActions}>
            <button className="btn btn-primary btn-sm" onClick={() => handleResolve(r.id, 'resolved')}>✅ Resolver</button>
            <button className="btn btn-danger btn-sm" onClick={() => handleResolve(r.id, 'dismissed')}>🚫 Desestimar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── LOGS ───
function LogsPanel({ logs }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Acción</th><th>Admin</th><th>Target</th><th>Fecha</th></tr></thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id}>
              <td><span className="badge badge-purple">{l.action}</span></td>
              <td className={styles.tdMuted}>{l.adminId?.slice(0, 8)}...</td>
              <td className={styles.tdMuted}>{l.targetId?.slice(0, 8) || '—'}...</td>
              <td className={styles.tdMuted}>{l.createdAt?.toDate?.().toLocaleString('es') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── CONFIG ───
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
    <div className={styles.configPanel}>
      <div className={`card ${styles.configCard}`}>
        <h3>💬 Chat Global</h3>
        <p>Controla si los usuarios pueden chatear en tiempo real.</p>
        <button className={`btn ${chatClosed ? 'btn-primary' : 'btn-danger'}`} onClick={toggleChat}>
          {chatClosed ? '🔓 Abrir Chat' : '🔒 Cerrar Chat'}
        </button>
      </div>
    </div>
  )
}
