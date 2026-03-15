// src/pages/PostDetailPage.jsx
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  getPost, toggleLike, hasLiked, registerDownload,
  reportPost, deletePost, toggleFeatured, verifyPost, setPostStatus,
} from '../services/posts'
import { useAuth } from '../context/AuthContext'
import { optimizeUrl } from '../services/cloudinary'
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

  useEffect(() => {
    getPost(id)
      .then(p => {
        if (p) {
          setPost(p)
          setLikeCount(p.likes || 0)
        }
      })
      .catch(() => toast.error('No se pudo cargar el post'))
      .finally(() => setLoading(false))
  }, [id])

  // Cargar estado de like
  useEffect(() => {
    if (!user?.uid || !id) return
    hasLiked(id, user.uid).then(setLiked).catch(() => {})
  }, [user?.uid, id])

  async function handleLike() {
    if (!user) { toast.error('Inicia sesión para dar like'); return }
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => wasLiked ? c - 1 : c + 1)
    try { await toggleLike(id, user.uid) }
    catch {
      setLiked(wasLiked)
      setLikeCount(c => wasLiked ? c + 1 : c - 1)
    }
  }

  async function handleDownload() {
    if (!post?.downloadUrl) { toast.error('Link no disponible'); return }
    await registerDownload(id).catch(() => {})

    if (post.directDownload) {
      const a = document.createElement('a')
      a.href = post.downloadUrl
      a.download = (post.name || 'archivo') + '.apk'
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success('⬇️ Descargando...')
    } else {
      window.open(post.downloadUrl, '_blank', 'noopener,noreferrer')
    }
  }

  async function handleShare() {
    const url  = `${window.location.origin}/post/${id}`
    const text = `${post.name} — Descárgalo en AsmodeoDev`
    if (navigator.share) {
      try { await navigator.share({ title: post.name, text, url }) }
      catch { /* cancelado */ }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('🔗 Link copiado al portapapeles')
    } catch {
      const el = document.createElement('input')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      toast.success('🔗 Link copiado')
    }
  }

  async function handleReport() {
    if (!user) { toast.error('Inicia sesión para reportar'); return }
    const r = window.prompt('¿Por qué reportas esta publicación?')
    if (!r?.trim()) return
    await reportPost(id, user.uid, r)
    toast.success('Reporte enviado ✅')
  }

  // ─── ACCIONES DE ADMIN ───
  async function adminAction(action) {
    try {
      switch (action) {
        case 'delete':
          if (!window.confirm(`¿Eliminar "${post.name}"?`)) return
          await deletePost(id)
          toast.success('Publicación eliminada')
          navigate('/feed')
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
          toast.success('Publicación ocultada')
          navigate('/feed')
          break
        default: break
      }
    } catch (e) {
      toast.error(e.message || 'Error')
    }
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
  const isOwner    = user?.uid === post.authorId
  const canManage  = user?.isStaff || isOwner
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
            <div className={styles.media} onClick={() => ytId && !showVideo && setShowVideo(true)}
              style={{ cursor: ytId && !showVideo ? 'pointer' : 'default' }}>
              {showVideo && ytId ? (
                <iframe
                  className={styles.ytEmbed}
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                  title={post.name}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  {post.imageUrl && (
                    <img
                      src={optimizeUrl(post.imageUrl, { width: 900 })}
                      alt={post.name}
                      className={styles.mainImage}
                    />
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
                </div>
              </div>

              {/* Título */}
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

              {/* Descripción */}
              {post.description && (
                <p className={styles.desc}>{post.description}</p>
              )}

              {/* Stats grid */}
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

              {/* ── ACCIONES PRINCIPALES ── */}
              <div className={styles.actions}>
                <button
                  className={`btn btn-lg ${liked ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={handleLike}
                >
                  {liked ? '❤️' : '🤍'} {likeCount}
                </button>

                <button className="btn btn-primary btn-lg" onClick={handleDownload}>
                  ⬇️ Descargar
                </button>

                {/* Compartir */}
                <button className="btn btn-secondary" onClick={handleShare} title="Compartir">
                  🔗 Compartir
                </button>

                {/* Reportar */}
                {user && !isOwner && (
                  <button className="btn btn-ghost btn-sm" onClick={handleReport}>
                    🚩 Reportar
                  </button>
                )}
              </div>

              {/* ── PANEL DE ADMIN ── */}
              {canManage && (
                <div className={styles.adminPanel}>
                  <div className={styles.adminTitle}>
                    {user?.isStaff ? '🛡️ Opciones de moderación' : '⚙️ Gestionar publicación'}
                  </div>
                  <div className={styles.adminBtns}>
                    {user?.isStaff && (
                      <>
                        <button
                          className={`btn btn-sm ${post.featured ? 'btn-ghost' : 'btn-secondary'}`}
                          onClick={() => adminAction('feature')}
                        >
                          {post.featured ? '⭐ Quitar destacado' : '⭐ Destacar'}
                        </button>
                        <button
                          className={`btn btn-sm ${post.verified ? 'btn-ghost' : 'btn-secondary'}`}
                          onClick={() => adminAction('verify')}
                        >
                          {post.verified ? '✓ Quitar verificado' : '✓ Verificar'}
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => adminAction('hide')}>
                          👁️ Ocultar
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => adminAction('delete')}
                    >
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
    </div>
  )
}

function MetaItem({ icon, label, value }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{icon} {label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  )
}
