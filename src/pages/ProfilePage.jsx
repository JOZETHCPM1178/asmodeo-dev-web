// src/pages/ProfilePage.jsx
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { getUserProfile, updateUserProfile } from '../services/auth'
import { getUserPosts, deletePost, setPostStatus, toggleFeatured, verifyPost } from '../services/posts'
import { db, doc, updateDoc, serverTimestamp } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import FollowButton from '../components/social/FollowButton'
import { VerifiedBadge } from '../components/ui/Navbar'
import { uploadAvatar, optimizeUrl } from '../services/cloudinary'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import styles from './ProfilePage.module.css'

const CATS = {
  apk:       { label: 'APK Mod',    icon: '📱', color: 'var(--p2)' },
  games:     { label: 'Juegos Mod', icon: '🎮', color: 'var(--cyan)' },
  script:    { label: 'Scripts',    icon: '⚙️', color: 'var(--green)' },
  tutorials: { label: 'Tutoriales', icon: '📚', color: 'var(--gold)' },
}

export default function ProfilePage() {
  const { uid } = useParams()
  const { user: me, refreshUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [followers, setFollowers] = useState(0)
  const [showEdit, setShowEdit] = useState(false)
  const [editingPost, setEditingPost] = useState(null)

  const isOwn = me?.uid === uid
  const canManagePosts = isOwn || me?.isStaff

  async function loadProfile() {
    setLoading(true)
    try {
      // Intentar obtener el perfil de Firestore
      let p = await getUserProfile(uid)

      // Si no existe y es mi propio perfil, construirlo desde el contexto
      if (!p && me && me.uid === uid) {
        p = {
          id: uid,
          uid,
          displayName: me.displayName || me.username || me.email?.split('@')[0] || 'Usuario',
          username: me.username || me.displayName || 'Usuario',
          photoURL: me.photoURL || '',
          bio: '',
          role: me.role || 'user',
          followers: 0,
          following: 0,
          verified: me.verified || false,
          email: me.email || '',
        }
      }

      setProfile(p)
      setFollowers(p?.followers || 0)

      // Cargar posts por separado para que un error aquí no rompa el perfil
      try {
        const userPosts = await getUserPosts(uid)
        setPosts(userPosts || [])
      } catch {
        setPosts([])
      }

    } catch (e) {
      console.error('Error cargando perfil:', e)
      // Si es mi propio perfil y hay error, usar datos del contexto
      if (me && me.uid === uid) {
        setProfile({
          id: uid,
          uid,
          displayName: me.displayName || 'Usuario',
          username: me.username || 'Usuario',
          photoURL: me.photoURL || '',
          bio: '',
          role: me.role || 'user',
          followers: 0,
          following: 0,
          verified: false,
        })
      } else {
        toast.error('Error cargando perfil')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Esperar a que el contexto de auth esté listo (me !== undefined)
    if (me !== undefined) {
      loadProfile()
    }
  }, [uid, me?.uid])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
      <span className="spinner spinner-lg" />
    </div>
  )

  if (!profile) return (
    <div className="empty" style={{ paddingTop: '5rem' }}>
      <div className="empty-icon">👤</div>
      <h3>Perfil no encontrado</h3>
      <p>Este usuario no existe o fue eliminado.</p>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.banner} />

      <div className={styles.inner}>
        {/* Tarjeta de perfil */}
        <div className={styles.profileCard}>
          <div className={styles.avatarWrap}>
            {profile.photoURL
              ? <img src={optimizeUrl(profile.photoURL, { width: 200, height: 200 })} alt="" className={styles.avatar} />
              : <div className={styles.avatarFb}>{(profile.displayName || 'U')[0].toUpperCase()}</div>
            }
            {profile.verified && <div className={styles.verifiedBadge}>✓</div>}
          </div>

          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.username}>{profile.displayName || profile.username}</h1>
              {profile.role === 'admin'    && <span className="badge badge-purple">👑 ADMIN</span>}
              {profile.role === 'admin_jr' && <span className="badge badge-cyan">🛡️ ADMIN JR</span>}
              {profile.verified && <VerifiedBadge size={20} />}
            </div>

            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statN}>{posts.length}</span>
                <span className={styles.statL}>Posts</span>
              </div>
              <div className={styles.statDiv} />
              <div className={styles.stat}>
                <span className={styles.statN}>{followers}</span>
                <span className={styles.statL}>Seguidores</span>
              </div>
              <div className={styles.statDiv} />
              <div className={styles.stat}>
                <span className={styles.statN}>{profile.following || 0}</span>
                <span className={styles.statL}>Siguiendo</span>
              </div>
            </div>

            <div className={styles.actionRow}>
              {isOwn ? (
                <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
                  ✏️ Editar perfil
                </button>
              ) : (
                <FollowButton
                  targetId={uid}
                  onChange={isNow => setFollowers(f => isNow ? f + 1 : f - 1)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className={styles.postsSection}>
          <h2 className={styles.postsTitle}>
            📝 Publicaciones ({posts.length})
          </h2>

          {posts.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <h3>Sin publicaciones aún</h3>
            </div>
          ) : (
            <div className={styles.postsList}>
              {posts.map(p => (
                <ProfilePostCard
                  key={p.id}
                  post={p}
                  canManage={canManagePosts}
                  isAdmin={me?.isAdmin}
                  onEdit={() => setEditingPost(p)}
                  onRefresh={loadProfile}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal editar perfil */}
      {showEdit && (
        <EditProfileModal
          profile={profile}
          userId={uid}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false)
            await loadProfile()
            await refreshUser?.()
          }}
        />
      )}

      {/* Modal editar publicación */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={() => { setEditingPost(null); loadProfile() }}
        />
      )}
    </div>
  )
}

// ─── TARJETA DE POST EN PERFIL ───
function ProfilePostCard({ post, canManage, isAdmin, onEdit, onRefresh }) {
  const cat = CATS[post.category] || CATS.apk
  const ago = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: es })
    : ''
  const [acting, setActing] = useState(false)

  async function handleDelete() {
    if (!window.confirm('¿Eliminar esta publicación permanentemente?')) return
    setActing(true)
    try {
      await deletePost(post.id)
      toast.success('Publicación eliminada')
      onRefresh()
    } catch (e) { toast.error(e.message) }
    finally { setActing(false) }
  }

  async function handleToggleFeatured() {
    try {
      await toggleFeatured(post.id, !post.featured)
      toast.success(post.featured ? 'Destacado quitado' : '⭐ Destacado')
      onRefresh()
    } catch (e) { toast.error(e.message) }
  }

  async function handleVerify() {
    try {
      await verifyPost(post.id, !post.verified)
      toast.success(post.verified ? 'Verificación quitada' : '✓ Verificado')
      onRefresh()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className={styles.postCard}>
      {/* Miniatura */}
      <div className={styles.postThumbWrap}>
        {post.imageUrl
          ? <img
              src={optimizeUrl(post.imageUrl, { width: 160, height: 120 })}
              alt={post.name}
              className={styles.postThumb}
            />
          : <div className={styles.postThumbFallback}>{cat.icon}</div>
        }
      </div>

      {/* Info */}
      <div className={styles.postInfo}>
        <div className={styles.postCat} style={{ color: cat.color }}>
          {cat.icon} {cat.label}
        </div>
        <div className={styles.postName}>{post.name}</div>
        {post.description && (
          <div className={styles.postDesc}>{post.description.slice(0, 80)}</div>
        )}
        <div className={styles.postMeta}>
          <span>❤️ {post.likes || 0}</span>
          <span>⬇️ {post.downloads || 0}</span>
          <span>💬 {post.commentCount || 0}</span>
          {ago && <span className={styles.postDate}>{ago}</span>}
        </div>
        <div className={styles.postBadges}>
          {post.featured && <span className="badge badge-gold">⭐ Destacado</span>}
          {post.verified && <span className="badge badge-cyan">✓ Verificado</span>}
          {post.status === 'pending_review' && <span className="badge badge-gold">⏳ Revisión</span>}
          {post.status === 'rejected' && <span className="badge badge-red">❌ Rechazado</span>}
        </div>
      </div>

      {/* Acciones — solo si puede gestionar */}
      {canManage && (
        <div className={styles.postActions}>
          <button className="btn btn-secondary btn-sm" onClick={onEdit}>
            ✏️ Editar
          </button>
          {isAdmin && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleToggleFeatured}>
                {post.featured ? '⭐ Quitar destacado' : '⭐ Destacar'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleVerify}>
                {post.verified ? 'Quitar ✓' : '✓ Verificar'}
              </button>
            </>
          )}
          <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={acting}>
            🗑️ Eliminar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── MODAL EDITAR PUBLICACIÓN ───
function EditPostModal({ post, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: post.name || '',
    description: post.description || '',
    downloadUrl: post.downloadUrl || '',
    youtubeUrl: post.youtubeUrl || '',
    version: post.version || '',
    size: post.size || '',
    tags: (post.tags || []).join(', '),
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        name: form.name.trim(),
        description: form.description.trim(),
        downloadUrl: form.downloadUrl.trim(),
        youtubeUrl: form.youtubeUrl.trim(),
        version: form.version.trim(),
        size: form.size.trim(),
        tags: form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 8),
        updatedAt: serverTimestamp(),
      })
      toast.success('Publicación actualizada ✅')
      onSaved()
    } catch (e) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>✏️ Editar publicación</h2>
          <button className="btn btn-icon btn" onClick={onClose}>✕</button>
        </div>

        <div className={styles.editFields}>
          <div className="inp-group">
            <label className="inp-label">Nombre *</label>
            <input className="inp" value={form.name} onChange={e => set('name', e.target.value)} maxLength={100} />
          </div>
          <div className="inp-group">
            <label className="inp-label">Descripción</label>
            <textarea className="inp" value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} maxLength={1000} style={{ resize: 'vertical' }} />
          </div>
          <div className="inp-group">
            <label className="inp-label">Link de descarga</label>
            <input className="inp" type="url" value={form.downloadUrl} onChange={e => set('downloadUrl', e.target.value)} />
          </div>
          <div className="inp-group">
            <label className="inp-label">YouTube (opcional)</label>
            <input className="inp" type="url" value={form.youtubeUrl} onChange={e => set('youtubeUrl', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="inp-group">
              <label className="inp-label">Versión</label>
              <input className="inp" value={form.version} onChange={e => set('version', e.target.value)} maxLength={20} />
            </div>
            <div className="inp-group">
              <label className="inp-label">Tamaño</label>
              <input className="inp" value={form.size} onChange={e => set('size', e.target.value)} maxLength={20} />
            </div>
          </div>
          <div className="inp-group">
            <label className="inp-label">Tags (separados por coma)</label>
            <input className="inp" value={form.tags} onChange={e => set('tags', e.target.value)} />
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : '💾 Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL EDITAR PERFIL ───
function EditProfileModal({ profile, userId, onClose, onSaved }) {
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    displayName: profile.displayName || profile.username || '',
    bio: profile.bio || '',
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile.photoURL || null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagen máx 5MB'); return }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!form.displayName.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setSaving(true)
    try {
      const updates = {
        displayName: form.displayName.trim(),
        username: form.displayName.trim(),
        bio: form.bio.trim(),
      }
      if (avatarFile) {
        const result = await uploadAvatar(avatarFile)
        updates.photoURL = result.url
      }
      await updateUserProfile(userId, updates)
      toast.success('Perfil actualizado ✅')
      onSaved()
    } catch (e) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 400 }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>✏️ Editar perfil</h2>
          <button className="btn btn-icon btn" onClick={onClose}>✕</button>
        </div>

        {/* Avatar */}
        <div className={styles.avatarEdit}>
          <div className={styles.avatarEditImg} onClick={() => fileRef.current?.click()}>
            {avatarPreview
              ? <img src={avatarPreview} alt="" className={styles.avatarPreview} />
              : <div className={styles.avatarFbLg}>{(form.displayName || 'U')[0].toUpperCase()}</div>
            }
            <div className={styles.avatarOverlay}>📷</div>
          </div>
          <span className={styles.avatarHint}>Toca para cambiar foto</span>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
        </div>

        <div className={styles.editFields}>
          <div className="inp-group">
            <label className="inp-label">Apodo</label>
            <input
              className="inp"
              placeholder="Tu nombre en la comunidad"
              value={form.displayName}
              onChange={e => set('displayName', e.target.value)}
              maxLength={40}
            />
          </div>
          <div className="inp-group">
            <label className="inp-label">Bio</label>
            <textarea
              className="inp"
              placeholder="Cuéntale a la comunidad quién eres..."
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              rows={3}
              maxLength={200}
              style={{ resize: 'none' }}
            />
            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--t3)', marginTop: '0.2rem' }}>
              {form.bio.length}/200
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : '💾 Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
