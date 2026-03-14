// src/pages/PostDetailPage.jsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { getPost, toggleLike, registerDownload, reportPost } from '../services/posts'
import { useAuth } from '../context/AuthContext'
import { optimizeUrl } from '../services/cloudinary'
import CommentsPanel from '../components/social/CommentsPanel'
import FollowButton from '../components/social/FollowButton'
import styles from './PostDetailPage.module.css'

function getYouTubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
  return m ? m[1] : null
}

export default function PostDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    getPost(id)
      .then(p => {
        if (p) { setPost(p); setLikeCount(p.likes || 0) }
      })
      .catch(() => toast.error('No se pudo cargar el post'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleLike() {
    if (!user) { toast.error('Inicia sesión para dar like'); return }
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => wasLiked ? c - 1 : c + 1)
    try { await toggleLike(id, user.uid) }
    catch { setLiked(wasLiked); setLikeCount(c => wasLiked ? c + 1 : c - 1) }
  }

  async function handleDownload() {
    if (!post.downloadUrl) { toast.error('Link no disponible'); return }
    await registerDownload(id)
    window.open(post.downloadUrl, '_blank', 'noopener')
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

  const ytId = getYouTubeId(post.youtubeUrl)
  const createdAgo = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: es })
    : ''

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <Link to="/" className={styles.bc}>Inicio</Link>
          <span>›</span>
          <Link to="/feed" className={styles.bc}>Feed</Link>
          <span>›</span>
          <span>{post.name}</span>
        </div>

        <div className={styles.grid}>
          {/* Columna principal */}
          <div className={styles.main}>
            {/* Media */}
            <div className={styles.media}>
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
                    <div className={styles.playOverlay} onClick={() => setShowVideo(true)}>
                      <div className={styles.playBtn}>▶</div>
                      <span>Ver video preview</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Info */}
            <div className={styles.info}>
              <div className={styles.topRow}>
                <span className={`cat-pill ${post.category}`}>
                  {post.category}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {post.featured && <span className="badge badge-gold">⭐ Destacado</span>}
                  {post.verified && <span className="badge badge-cyan">✓ Verificado</span>}
                </div>
              </div>

              <h1 className={styles.title}>{post.name}</h1>

              {/* Autor */}
              <Link to={`/profile/${post.authorId}`} className={styles.author}>
                {post.authorPhoto
                  ? <img src={optimizeUrl(post.authorPhoto, { width: 80 })} alt="" className="avatar avatar-md" />
                  : <div className={styles.avatarFb}>{(post.authorName || 'U')[0]}</div>}
                <div>
                  <div className={styles.authorName}>{post.authorName}</div>
                  <div className={styles.authorDate}>{createdAgo}</div>
                </div>
                <FollowButton targetId={post.authorId} />
              </Link>

              {/* Descripción */}
              {post.description && (
                <p className={styles.desc}>{post.description}</p>
              )}

              {/* Metadata */}
              <div className={styles.metaGrid}>
                {post.version && <MetaItem icon="🏷️" label="Versión" value={post.version} />}
                {post.size && <MetaItem icon="📦" label="Tamaño" value={post.size} />}
                <MetaItem icon="❤️" label="Likes" value={likeCount} />
                <MetaItem icon="⬇️" label="Descargas" value={post.downloads || 0} />
                <MetaItem icon="👁️" label="Vistas" value={post.views || 0} />
              </div>

              {/* Tags */}
              {post.tags?.length > 0 && (
                <div className={styles.tags}>
                  {post.tags.map(t => (
                    <Link key={t} to={`/search?q=${t}`} className={styles.tag}>#{t}</Link>
                  ))}
                </div>
              )}

              {/* Acciones */}
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
                {user && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const r = prompt('¿Por qué reportas esto?')
                      if (r) reportPost(id, user.uid, r).then(() => toast.success('Reporte enviado'))
                    }}
                  >
                    🚩 Reportar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Columna: comentarios */}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg2)', borderRadius: 'var(--r)', padding: '0.65rem 0.85rem' }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{icon} {label}</span>
      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{value}</span>
    </div>
  )
}
