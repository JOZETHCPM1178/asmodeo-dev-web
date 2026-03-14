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

const TABS = [
  { label: '📊 Stats',          role: 'staff'  },  // Admin + Admin Jr
  { label: '👥 Usuarios',       role: 'admin'  },  // Solo Admin
  { label: '📝 Posts',          role: 'staff'  },  // Admin + Admin Jr
  { label: '⚠️ Reportes',       role: 'staff'  },  // Admin + Admin Jr
  { label: '🤖 Seguidores Bot', role: 'admin'  },  // Solo Admin
  { label: '📋 Logs',           role: 'admin'  },  // Solo Admin
  { label: '⚙️ Config',         role: 'admin'  },  // Solo Admin
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState(user.isAdmin ? 0 : 2)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const visibleTabs = TABS.filter(t =>
    t.role === 'staff' ? user.isStaff : user.isAdmin
  )

  useEffect(() => { loadTab(tab) }, [tab])

  async function loadTab(t) {
    setLoading(true)
    setData(null)
    try {
      const label = visibleTabs[t]?.label || ''
      if (label.includes('Stats'))          setData(await getStats())
      else if (label.includes('Usuarios'))  setData(await getAllUsers())
      else if (label.includes('Posts'))     setData(await getPendingPosts())
      else if (label.includes('Reportes'))  setData(await getReports())
      else if (label.includes('Seguidores'))setData(await getAllUsers({ pageSize: 100 }))
      else if (label.includes('Logs'))      setData(await getAdminLogs())
      else setData({})
    } catch (e) {
      toast.error('Error cargando datos: ' + e.message)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const tabLabel = visibleTabs[tab]?.label || ''

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>🛡️ Panel Admin</h1>
        <span className={`badge ${user.isAdmin ? 'badge-purple' : 'badge-cyan'}`}>
          {user.isAdmin ? '👑 ADMIN' : '🛡️ ADMIN JR'}
        </span>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {visibleTabs.map((t, i) => (
          <button
            key={i}
            className={`${styles.tab} ${tab === i ? styles.active : ''}`}
            onClick={() => setTab(i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.center}><span className="spinner spinner-lg" /></div>
        ) : (
          <>
            {tabLabel.includes('Stats')      && <StatsPanel stats={data} />}
            {tabLabel.includes('Usuarios')   && <UsersPanel users={data || []} currentUser={user} onRefresh={() => loadTab(tab)} />}
            {tabLabel.includes('Posts')      && <PostsPanel posts={data || []} onRefresh={() => loadTab(tab)} />}
            {tabLabel.includes('Reportes')   && <ReportsPanel reports={data || []} user={user} onRefresh={() => loadTab(tab)} />}
            {tabLabel.includes('Seguidores') && <FollowersBotPanel users={data || []} user={user} />}
            {tabLabel.includes('Logs')       && <LogsPanel logs={data || []} />}
            {tabLabel.includes('Config')     && <ConfigPanel />}
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════
//  STATS
// ═══════════════════════════════
function StatsPanel({ stats }) {
  if (!stats) return <Empty icon="📊" text="Sin datos" />
  const cards = [
    { label: 'Total Posts',    value: stats.totalPosts,       icon: '📝', color: 'var(--p2)' },
    { label: 'Total Usuarios', value: stats.totalUsers,       icon: '👥', color: 'var(--cyan)' },
    { label: 'Total Likes',    value: stats.totalLikes,       icon: '❤️', color: 'var(--red)' },
    { label: 'Descargas',      value: stats.totalDownloads,   icon: '⬇️', color: 'var(--green)' },
    { label: 'Esta semana',    value: stats.recentPostsCount, icon: '📅', color: 'var(--gold)' },
    { label: 'Reportes pendientes', value: stats.pendingReports, icon: '⚠️', color: 'var(--red)' },
  ]
  return (
    <div className={styles.statsWrap}>
      <div className={styles.statCards}>
        {cards.map((c, i) => (
          <div key={i} className={styles.statCard}>
            <div style={{ fontSize: '1.8rem' }}>{c.icon}</div>
            <div className={styles.statVal} style={{ color: c.color }}>
              {c.value?.toLocaleString() ?? '—'}
            </div>
            <div className={styles.statLbl}>{c.label}</div>
          </div>
        ))}
      </div>
      {stats.topPosts?.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className={styles.sectionTitle}>🏆 Top 5 más populares</div>
          {stats.topPosts.map((p, i) => (
            <div key={p.id} className={styles.topRow}>
              <span className={styles.topRank}>#{i + 1}</span>
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

// ═══════════════════════════════
//  USUARIOS
// ═══════════════════════════════
function UsersPanel({ users, currentUser, onRefresh }) {
  async function act(fn, msg) {
    try { await fn(); toast.success(msg); onRefresh() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className={u.banned ? styles.rowBanned : ''}>
              <td>
                <div className={styles.userCell}>
                  {u.photoURL
                    ? <img src={u.photoURL} alt="" className="avatar avatar-sm" />
                    : <div className={styles.avatarFb}>{(u.displayName || 'U')[0]}</div>
                  }
                  <span>{u.displayName || u.username}</span>
                  {u.verified && <span style={{ color: 'var(--cyan)', fontSize: '0.8rem' }}>✓</span>}
                  {(u.fakeFollowers > 0) && (
                    <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>🤖 {u.fakeFollowers}</span>
                  )}
                </div>
              </td>
              <td className={styles.muted}>{u.email}</td>
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
                      <select className={styles.roleSelect} value={u.role}
                        onChange={e => act(() => setUserRole(u.id, e.target.value), 'Rol actualizado')}>
                        <option value="user">User</option>
                        <option value="admin_jr">Admin Jr</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    <button className={`btn btn-sm ${u.banned ? 'btn-secondary' : 'btn-danger'}`}
                      onClick={() => {
                        if (u.banned) act(() => unbanUser(u.id), 'Desbaneado')
                        else {
                          const r = prompt('Razón del baneo:')
                          if (r !== null) act(() => banUser(u.id, r), 'Baneado')
                        }
                      }}>
                      {u.banned ? '✅ Desbanear' : '🚫 Banear'}
                    </button>
                    <button className="btn btn-sm btn-ghost"
                      onClick={() => act(() => verifyUser(u.id, !u.verified), u.verified ? 'Verificación quitada' : 'Verificado')}>
                      {u.verified ? '✓ Quitar' : '✓ Verificar'}
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

// ═══════════════════════════════
//  SEGUIDORES BOT
// ═══════════════════════════════
function FollowersBotPanel({ users, user: adminUser }) {
  const [selected, setSelected] = useState('')
  const [amount, setAmount] = useState(100)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('add') // 'add' | 'remove'

  async function handle() {
    if (!selected) { toast.error('Selecciona un usuario'); return }
    if (amount < 1) { toast.error('Cantidad mínima: 1'); return }
    setLoading(true)
    try {
      if (mode === 'add') {
        await addFakeFollowers(selected, Number(amount), adminUser.uid)
        toast.success(`✅ +${amount} seguidores agregados`)
      } else {
        await removeFakeFollowers(selected, Number(amount), adminUser.uid)
        toast.success(`✅ -${amount} seguidores quitados`)
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedUser = users.find(u => u.id === selected)

  return (
    <div className={styles.botPanel}>
      <div className={styles.botCard}>
        <div className={styles.sectionTitle}>🤖 Sistema de seguidores bot</div>
        <p className={styles.botDesc}>
          Impulsa a creadores que suban buen contenido agregando seguidores de forma manual.
          Solo visible para admins.
        </p>

        <div className={styles.botForm}>
          {/* Modo */}
          <div className={styles.modeRow}>
            <button
              className={`btn btn-sm ${mode === 'add' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('add')}
            >
              ➕ Agregar
            </button>
            <button
              className={`btn btn-sm ${mode === 'remove' ? 'btn-danger' : 'btn-ghost'}`}
              onClick={() => setMode('remove')}
            >
              ➖ Quitar
            </button>
          </div>

          {/* Seleccionar usuario */}
          <div className="inp-group">
            <label className="inp-label">Seleccionar creador</label>
            <select
              className="inp"
              value={selected}
              onChange={e => setSelected(e.target.value)}
            >
              <option value="">— Elige un usuario —</option>
              {users.filter(u => !u.banned).map(u => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.username} — {u.followers || 0} seguidores
                  {u.fakeFollowers > 0 ? ` (🤖 ${u.fakeFollowers} bot)` : ''}
                </option>
              ))}
            </select>
          </div>

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

          {/* Preview del usuario seleccionado */}
          {selectedUser && (
            <div className={styles.userPreview}>
              {selectedUser.photoURL
                ? <img src={selectedUser.photoURL} alt="" className="avatar avatar-sm" />
                : <div className={styles.avatarFb}>{(selectedUser.displayName || 'U')[0]}</div>
              }
              <div>
                <div style={{ fontWeight: 700 }}>{selectedUser.displayName}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--t3)' }}>
                  👥 {selectedUser.followers || 0} seguidores totales
                  {selectedUser.fakeFollowers > 0 && ` (🤖 ${selectedUser.fakeFollowers} bot)`}
                </div>
              </div>
            </div>
          )}

          <button
            className={`btn btn-lg ${mode === 'add' ? 'btn-primary' : 'btn-danger'}`}
            onClick={handle}
            disabled={loading || !selected}
            style={{ width: '100%' }}
          >
            {loading
              ? <span className="spinner" style={{ width: 18, height: 18 }} />
              : mode === 'add'
                ? `➕ Agregar ${amount} seguidores`
                : `➖ Quitar ${amount} seguidores`
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════
//  POSTS PENDIENTES
// ═══════════════════════════════
function PostsPanel({ posts, onRefresh }) {
  const { user } = useAuth()

  async function act(postId, action, authorId) {
    // Admin Jr no puede borrar posts ajenos
    if (!user.isAdmin && action === 'delete' && authorId !== user.uid) {
      toast.error('No puedes eliminar publicaciones de otros usuarios')
      return
    }
    try {
      if (action === 'approve') await setPostStatus(postId, 'active')
      else if (action === 'reject') await setPostStatus(postId, 'rejected')
      else if (action === 'delete') { if (!confirm('¿Eliminar esta publicación?')) return; await deletePost(postId) }
      else if (action === 'feature') await toggleFeatured(postId, true)
      else if (action === 'verify') await verifyPost(postId, true)
      toast.success('✅ Acción realizada')
      onRefresh()
    } catch (e) { toast.error(e.message) }
  }

  if (!posts?.length) return <Empty icon="✅" text="Sin posts pendientes de revisión" />

  return (
    <div className={styles.list}>
      {posts.map(p => (
        <div key={p.id} className={`card ${styles.listItem}`}>
          {p.imageUrl && <img src={p.imageUrl} alt="" className={styles.listThumb} />}
          <div className={styles.listInfo}>
            <div className={styles.listName}>{p.name}</div>
            <div className={styles.listMeta}>
              <span className="badge badge-purple">{p.category}</span>
              {p.status === 'pending_review' && <span className="badge badge-gold">⏳ Pendiente</span>}
              {p.safetyScore < 70 && <span className="badge badge-red">⚠️ Score: {p.safetyScore}</span>}
            </div>
            <p className={styles.listDesc}>{p.description?.slice(0, 100)}</p>
            <div style={{ fontSize: '0.72rem', color: 'var(--t3)', marginTop: '0.2rem' }}>
              Por: {p.authorName || p.authorId?.slice(0, 8)}
            </div>
          </div>
          <div className={styles.listActions}>
            <button className="btn btn-primary btn-sm" onClick={() => act(p.id, 'approve', p.authorId)}>
              ✅ Aprobar
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => act(p.id, 'verify', p.authorId)}>
              ✓ Verificar
            </button>
            {/* Destacar solo Admin */}
            {user.isAdmin && (
              <button className="btn btn-ghost btn-sm" onClick={() => act(p.id, 'feature', p.authorId)}>
                ⭐ Destacar
              </button>
            )}
            {/* Eliminar: Admin siempre, Admin Jr solo sus propios posts */}
            {(user.isAdmin || p.authorId === user.uid) && (
              <button className="btn btn-danger btn-sm" onClick={() => act(p.id, 'delete', p.authorId)}>
                🗑️ Eliminar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════
//  REPORTES CON RESPUESTA
// ═══════════════════════════════
function ReportsPanel({ reports, user, onRefresh }) {
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyMsg, setReplyMsg] = useState('')
  const [verdict, setVerdict] = useState('legitimate')
  const [sending, setSending] = useState(false)

  async function handleReply(reportId) {
    if (!replyMsg.trim()) { toast.error('Escribe un mensaje'); return }
    setSending(true)
    try {
      await replyToReport(reportId, user.uid, user.displayName, replyMsg.trim(), verdict)
      toast.success('Respuesta enviada al usuario ✅')
      setReplyingTo(null)
      setReplyMsg('')
      onRefresh()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSending(false)
    }
  }

  async function handleQuickResolve(reportId, action) {
    try { await resolveReport(reportId, action); toast.success('Reporte resuelto'); onRefresh() }
    catch (e) { toast.error(e.message) }
  }

  if (!reports?.length) return <Empty icon="✅" text="Sin reportes pendientes" />

  return (
    <div className={styles.list}>
      {reports.map(r => (
        <div key={r.id} className={`card ${styles.listItem}`}>
          <div className={styles.listInfo}>
            <div className={styles.listName}>
              📋 Reporte #{r.id.slice(0, 8)}
            </div>
            <div className={styles.listMeta}>
              <span className="badge badge-red">Razón: {r.reason}</span>
              {r.postId && <span className="badge badge-purple">Post: {r.postId.slice(0, 8)}</span>}
            </div>
            <p className={styles.listDesc}>
              Reportado por: {r.reportedBy?.slice(0, 12)}...
            </p>
          </div>

          <div className={styles.listActions}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setReplyingTo(r.id)
                setReplyMsg('')
                setVerdict('legitimate')
              }}
            >
              💬 Responder
            </button>
            <button className="btn btn-ghost btn-sm"
              onClick={() => handleQuickResolve(r.id, 'dismissed')}>
              🚫 Desestimar
            </button>
          </div>

          {/* Panel de respuesta inline */}
          {replyingTo === r.id && (
            <div className={styles.replyPanel}>
              <div className={styles.replyTitle}>💬 Responder al usuario</div>

              {/* Veredicto */}
              <div className={styles.verdictRow}>
                <button
                  className={`btn btn-sm ${verdict === 'legitimate' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setVerdict('legitimate')}
                >
                  ✅ Legítimo
                </button>
                <button
                  className={`btn btn-sm ${verdict === 'not_legitimate' ? 'btn-danger' : 'btn-ghost'}`}
                  onClick={() => setVerdict('not_legitimate')}
                >
                  ❌ No legítimo
                </button>
              </div>

              <textarea
                className="inp"
                placeholder="Escribe tu respuesta al usuario que reportó..."
                value={replyMsg}
                onChange={e => setReplyMsg(e.target.value)}
                rows={3}
                maxLength={500}
                style={{ resize: 'none', marginTop: '0.5rem' }}
              />

              <div className={styles.replyActions}>
                <button className="btn btn-ghost btn-sm" onClick={() => setReplyingTo(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleReply(r.id)}
                  disabled={sending}
                >
                  {sending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '📨 Enviar respuesta'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════
//  LOGS
// ═══════════════════════════════
function LogsPanel({ logs }) {
  if (!logs?.length) return <Empty icon="📋" text="Sin logs" />
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Acción</th><th>Admin</th><th>Target</th><th>Detalles</th><th>Fecha</th></tr></thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id}>
              <td><span className="badge badge-purple">{l.action}</span></td>
              <td className={styles.muted}>{l.adminId?.slice(0, 8)}...</td>
              <td className={styles.muted}>{l.targetId?.slice(0, 8) || '—'}</td>
              <td className={styles.muted}>
                {l.amount ? `×${l.amount}` : l.reason || '—'}
              </td>
              <td className={styles.muted}>{l.createdAt?.toDate?.().toLocaleString('es') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ═══════════════════════════════
//  CONFIG
// ═══════════════════════════════
function ConfigPanel() {
  const [chatClosed, setChatClosedState] = useState(false)
  async function toggleChat() {
    try {
      await setChatStatus(!chatClosed)
      setChatClosedState(c => !c)
      toast.success(`Chat ${!chatClosed ? 'cerrado 🔒' : 'abierto 🔓'}`)
    } catch (e) { toast.error(e.message) }
  }
  return (
    <div className={styles.configGrid}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className={styles.sectionTitle}>💬 Chat Global</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--t2)' }}>
          Cierra el chat para todos los usuarios temporalmente.
        </p>
        <button className={`btn ${chatClosed ? 'btn-primary' : 'btn-danger'}`} onClick={toggleChat}>
          {chatClosed ? '🔓 Abrir chat' : '🔒 Cerrar chat'}
        </button>
      </div>
    </div>
  )
}

// ─── HELPER ───
function Empty({ icon, text }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{text}</h3>
    </div>
  )
}
