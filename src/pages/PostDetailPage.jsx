// src/pages/PostDetailPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  getPost, toggleLike, hasLiked, registerDownload,
  reportPost, deletePost, toggleFeatured, verifyPost,
  setPostStatus, updatePost,
} from '../services/posts'
import { useAuth } from '../context/AuthContext'
import { optimizeUrl, uploadImage } from '../services/cloudinary'
import CommentsPanel from '../components/social/CommentsPanel'
import FollowButton from '../components/social/FollowButton'
import VerifiedBadge from '../components/ui/VerifiedBadge'
import styles from './PostDetailPage.module.css'

const CATS = {
  apk:       { label: 'APK Mod',    icon: '📱', color: 'var(--p2)' },
  games:     { label: 'Juegos Mod', icon: '🎮', color: 'var(--cyan)' },
  script:    { label: 'Scripts',    icon: '⚙️', color: 'var(--green)' },
  tutorials: { label: 'Tutoriales', icon: '📚', color: 'var(--gold)' },
}

function getYouTubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
  return m ? m[1] : null
}

export default function PostDetailPage() {
  const { id }   = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [post, setPost]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [liked, setLiked]         = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const [showEdit, setShowEdit]   = useState(false)

  useEffect(() => {
    getPost(id)
      .then(p => { if (p) { setPost(p); setLikeCount(p.likes || 0) } })
      .catch(() => toast.error('No se pudo cargar el post'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!user?.uid || !id) return
    hasLiked(id, user.uid).then(setLiked).catch(() => {})
  }, [user?.uid, id])

  // Permisos de edición:
  // - Owner/Admin: puede editar cualquier post
  // - Admin Jr: solo sus propios posts
  // - Usuario normal: solo sus propios posts
  const isOwnerOfPost = user?.uid === post?.authorId
  const canEdit = isOwnerOfPost || user?.isAdmin || user?.isOwner

  async function handleLike() {
    if (!user) { toast.error('Inicia sesión para dar like'); return }
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => wasLiked ? c - 1 : c + 1)
    try { await toggleLike(id, user.uid) }
    catch { setLiked(wasLiked); setLikeCount(c => wasLiked ? c + 1 : c - 1) }
  }

  async function handleDownload() {
    if (!post?.downloadUrl) { toast.error('Link no disponible'); return }
    await registerDownload(id).catch(() => {})
    if (post.directDownload) {
      const a = document.createElement('a')
      a.href = post.downloadUrl
      a.download = (post.name || 'archivo') + '.apk'
      a.target = '_blank'; a.rel = 'noopener noreferrer'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      toast.success('⬇️ Descargando...')
    } else {
      window.open(post.downloadUrl, '_blank', 'noopener,noreferrer')
    }
  }

  async function handleShare() {
    const url  = `https://asmodeo-og.asmodeotayson.workers.dev/?post=${id}`
    const text = `${post.name} — Descárgalo en AsmodeoDev`
    if (navigator.share) {
      try { await navigator.share({ title: post.name, text, url }) } catch {}
      return
    }
    try { await navigator.clipboard.writeText(url); toast.success('🔗 Link copiado') }
    catch { toast.error('No se pudo copiar') }
  }

  async function handleReport() {
    if (!user) { toast.error('Inicia sesión para reportar'); return }
    const r = window.prompt('¿Por qué reportas esta publicación?')
    if (!r?.trim()) return
    await reportPost(id, user.uid, r)
    toast.success('Reporte enviado ✅')
  }

  async function adminAction(action) {
    try {
      switch (action) {
        case 'delete':
          if (!window.confirm(`¿Eliminar "${post.name}"?`)) return
          await deletePost(id); toast.success('Eliminada'); navigate('/feed')
          break
        case 'feature':
          await toggleFeatured(id, !post.featured)
          setPost(p => ({ ...p, featured: !p.featured }))
          toast.success(post.featured ? 'Destacado quitado' : '⭐ Destacado')
          break
        case 'verify':
          await verifyPost(id, !post.verified)
          setPost(p => ({ ...p, verified: !p.verified }))
          toast.success(post.verified ? 'Verificación quitada' : '✓ Verificado')
          break
        case 'hide':
          await setPostStatus(id, 'hidden')
          toast.success('Ocultada'); navigate('/feed')
          break
      }
    } catch (e) { toast.error(e.message || 'Error') }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
      <span className="spinner spinner-lg" />
    </div>
  )

  if (!post) return (
    <div className="empty" style={{ paddingTop: '5rem' }}>
      <div className="empty-icon">404</div>
      <h3>Post no encontrado</h3>
      <Link to="/feed" className="btn btn-primary">← Volver al feed</Link>
    </div>
  )

  const cat        = CATS[post.category] || CATS.apk
  const ytId       = getYouTubeId(post.youtubeUrl)
  const canManage  = user?.isStaff || user?.isOwner || isOwnerOfPost
  const createdAgo = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: es })
    : ''

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <Link to="/" className={styles.bc}>Inicio</Link>
          <span className={styles.sep}>›</span>
          <Link to="/feed" className={styles.bc}>Feed</Link>
          <span className={styles.sep}>›</span>
          <span className={styles.bcCurrent}>{post.name}</span>
        </div>

        <div className={styles.grid}>
          {/* ── COLUMNA PRINCIPAL ── */}
          <div className={styles.main}>

            {/* Media */}
            <div className={styles.media}
              onClick={() => ytId && !showVideo && setShowVideo(true)}
              style={{ cursor: ytId && !showVideo ? 'pointer' : 'default' }}>
              {showVideo && ytId ? (
                <iframe className={styles.ytEmbed}
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                  title={post.name} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
              ) : (
                <>
                  {post.imageUrl && (
                    <img src={optimizeUrl(post.imageUrl, { width: 900 })}
                      alt={post.name} className={styles.mainImage} />
                  )}
                  {ytId && (
                    <div className={styles.playOverlay}>
                      <div className={styles.playBtn}>▶</div>
                      <span>Ver video preview</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Info card */}
            <div className={styles.infoCard}>

              {/* Categoría + badges */}
              <div className={styles.topRow}>
                <span className={styles.catPill} style={{ color: cat.color }}>
                  {cat.icon} {cat.label}
                </span>
                <div className={styles.badges}>
                  {post.featured && <span className="badge badge-gold">⭐ Destacado</span>}
                  {post.verified && <VerifiedBadge title="Publicación verificada" />}
                  {post.directDownload && <span className="badge badge-green">⚡ Descarga directa</span>}
                </div>
              </div>

              <h1 className={styles.title}>{post.name}</h1>

              {/* Autor */}
              <Link to={`/profile/${post.authorId}`} className={styles.author}>
                {post.authorPhoto
                  ? <img src={optimizeUrl(post.authorPhoto, { width: 80 })} alt="" className="avatar avatar-md" />
                  : <div className={styles.avatarFb}>{(post.authorName || 'U')[0].toUpperCase()}</div>
                }
                <div className={styles.authorInfo}>
                  <div className={styles.authorName}>{post.authorName || 'Usuario'}</div>
                  {createdAgo && <div className={styles.authorDate}>{createdAgo}</div>}
                </div>
                <FollowButton targetId={post.authorId} />
              </Link>

              {post.description && <p className={styles.desc}>{post.description}</p>}

              {/* Stats */}
              <div className={styles.metaGrid}>
                {post.version && <MetaItem icon="🏷️" label="Versión"   value={post.version} />}
                {post.size    && <MetaItem icon="📦" label="Tamaño"    value={post.size} />}
                <MetaItem icon="❤️" label="Likes"     value={likeCount} />
                <MetaItem icon="⬇️" label="Descargas" value={post.downloads || 0} />
                <MetaItem icon="👁️" label="Vistas"    value={post.views || 0} />
              </div>

              {/* Tags */}
              {post.tags?.length > 0 && (
                <div className={styles.tags}>
                  {post.tags.map(t => (
                    <Link key={t} to={`/search?q=${t}`} className={styles.tag}>#{t}</Link>
                  ))}
                </div>
              )}

              {/* ── ACCIONES ── */}
              <div className={styles.actions}>
                <button className={`btn btn-lg ${liked ? 'btn-danger' : 'btn-secondary'}`} onClick={handleLike}>
                  ❤️ {likeCount}
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleDownload}>
                  ⬇️ Descargar
                </button>
                <button className="btn btn-secondary" onClick={handleShare}>
                  🔗 Compartir
                </button>
                {user && !isOwnerOfPost && (
                  <button className="btn btn-ghost btn-sm" onClick={handleReport}>
                    🚩 Reportar
                  </button>
                )}
              </div>

              {/* ── PANEL DE GESTIÓN ── */}
              {canManage && (
                <div className={styles.adminPanel}>
                  <div className={styles.adminTitle}>
                    {user?.isOwner ? '👑 Gestión Owner' : user?.isAdmin ? '🛡️ Moderación' : '⚙️ Mi publicación'}
                  </div>
                  <div className={styles.adminBtns}>
                    {/* Editar — owner/admin pueden editar cualquier post; admin_jr y user solo los suyos */}
                    {canEdit && (
                      <button className="btn btn-sm btn-secondary" onClick={() => setShowEdit(true)}>
                        ✏️ Editar
                      </button>
                    )}
                    {/* Herramientas de moderación — solo admin y owner */}
                    {(user?.isAdmin || user?.isOwner) && (
                      <>
                        <button className={`btn btn-sm ${post.featured ? 'btn-ghost' : 'btn-secondary'}`}
                          onClick={() => adminAction('feature')}>
                          {post.featured ? '⭐ Quitar destacado' : '⭐ Destacar'}
                        </button>
                        <button className={`btn btn-sm ${post.verified ? 'btn-ghost' : 'btn-secondary'}`}
                          onClick={() => adminAction('verify')}>
                          {post.verified ? '✓ Quitar verificado' : '✓ Verificar'}
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => adminAction('hide')}>
                          👁️ Ocultar
                        </button>
                      </>
                    )}
                    {/* Eliminar — cualquiera que pueda gestionar */}
                    <button className="btn btn-sm btn-danger" onClick={() => adminAction('delete')}>
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SIDEBAR COMENTARIOS ── */}
          <div className={styles.sidebar}>
            <div className={styles.sideCard}>
              <CommentsPanel postId={id} onClose={() => {}} />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {showEdit && (
        <EditPostModal
          post={post}
          user={user}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setPost(p => ({ ...p, ...updated }))
            setShowEdit(false)
            toast.success('Publicación actualizada ✅')
          }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════
//  MODAL DE EDICIÓN DE PUBLICACIÓN
// ══════════════════════════════════════
function EditPostModal({ post, user, onClose, onSaved }) {
  // Solo el link de descarga está restringido para usuarios normales
  // Admin Jr, Admin y Owner pueden cambiar todo
  const canEditDownloadUrl = user?.isStaff || user?.isOwner

  const [form, setForm] = useState({
    name:        post.name        || '',
    description: post.description || '',
    category:    post.category    || 'apk',
    downloadUrl: post.downloadUrl || '',
    youtubeUrl:  post.youtubeUrl  || '',
    version:     post.version     || '',
    size:        post.size        || '',
    tags:        (post.tags || []).join(', '),
  })
  const [saving, setSaving]             = useState(false)
  const [imageFile, setImageFile]       = useState(null)
  const [imagePreview, setImagePreview] = useState(post.imageUrl || null)
  const imageRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Imagen máx 10MB'); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      // Todos pueden editar estos campos
      const updates = {
        name:        form.name.trim(),
        description: form.description.trim(),
        category:    form.category,
        youtubeUrl:  form.youtubeUrl.trim(),
        version:     form.version.trim(),
        size:        form.size.trim(),
        tags:        form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 8),
      }

      // Solo staff (admin_jr, admin, owner) pueden cambiar el link
      if (canEditDownloadUrl) {
        updates.downloadUrl = form.downloadUrl.trim()
      }

      // Imagen — todos pueden cambiarla
      if (imageFile) {
        const imgData = await uploadImage(imageFile, { folder: 'posts' })
        updates.imageUrl   = imgData.url
        updates.imageThumb = imgData.thumbnailUrl
      }

      await updatePost(post.id, updates)
      onSaved(updates)
    } catch (e) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const CATS = {
    apk:       '📱 APK Mod',
    games:     '🎮 Juegos Mod',
    script:    '⚙️ Scripts',
    tutorials: '📚 Tutoriales',
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box ${styles.editModal}`}>

        {/* Header */}
        <div className={styles.editHeader}>
          <div>
            <h2 className={styles.editTitle}>✏️ Editar publicación</h2>
            {!canEditDownloadUrl && (
              <p style={{ fontSize: '0.75rem', color: 'var(--t3)', marginTop: '0.15rem' }}>
                Solo el link de descarga no se puede cambiar
              </p>
            )}
          </div>
          <button className="btn btn-icon btn" onClick={onClose} disabled={saving}>✕</button>
        </div>

        <div className={styles.editBody}>

          {/* Imagen — todos */}
          <div className={styles.editImgWrap} onClick={() => imageRef.current?.click()}>
            {imagePreview
              ? <img src={imagePreview} alt="" className={styles.editImgPreview} />
              : <div className={styles.editImgPlaceholder}>🖼️ Toca para cambiar imagen</div>
            }
            <div className={styles.editImgOverlay}>📷 Cambiar</div>
            <input ref={imageRef} type="file" accept="image/*"
              onChange={handleImageChange} style={{ display: 'none' }} />
          </div>

          {/* Nombre — todos */}
          <div className="inp-group">
            <label className="inp-label">Nombre *</label>
            <input className="inp" value={form.name}
              onChange={e => set('name', e.target.value)} maxLength={100} />
          </div>

          {/* Descripción — todos */}
          <div className="inp-group">
            <label className="inp-label">Descripción</label>
            <textarea className="inp" value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3} maxLength={1000} style={{ resize: 'vertical' }} />
          </div>

          {/* Categoría — todos */}
          <div className="inp-group">
            <label className="inp-label">Categoría</label>
            <div className={styles.editCatGrid}>
              {Object.entries(CATS).map(([id, label]) => (
                <button key={id} type="button"
                  className={`btn btn-sm ${form.category === id ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => set('category', id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Link descarga — SOLO staff (admin jr, admin, owner) */}
          {canEditDownloadUrl ? (
            <div className="inp-group">
              <label className="inp-label">Link de descarga</label>
              <input className="inp" value={form.downloadUrl}
                onChange={e => set('downloadUrl', e.target.value)}
                placeholder="https://..." />
            </div>
          ) : (
            <div className={styles.restrictedNotice}>
              🔒 El link de descarga solo puede ser modificado por administradores.
            </div>
          )}

          {/* YouTube — todos */}
          <div className="inp-group">
            <label className="inp-label">Video YouTube (opcional)</label>
            <input className="inp" value={form.youtubeUrl}
              onChange={e => set('youtubeUrl', e.target.value)}
              placeholder="https://youtube.com/watch?v=..." />
          </div>

          {/* Versión + Tamaño — todos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="inp-group">
              <label className="inp-label">Versión</label>
              <input className="inp" value={form.version}
                onChange={e => set('version', e.target.value)} placeholder="v1.21" maxLength={20} />
            </div>
            <div className="inp-group">
              <label className="inp-label">Tamaño</label>
              <input className="inp" value={form.size}
                onChange={e => set('size', e.target.value)} placeholder="414 MB" maxLength={20} />
            </div>
          </div>

          {/* Tags — todos */}
          <div className="inp-group">
            <label className="inp-label">Tags (separados por coma)</label>
            <input className="inp" value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="minecraft, mod, gratis..." />
          </div>
        </div>

        {/* Botones */}
        <div className={styles.editFooter}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Guardando...</>
              : '💾 Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Necesario para el useRef en EditPostModal — ya importado arriba

function MetaItem({ icon, label, value }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{icon} {label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  )
}
