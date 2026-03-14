// src/components/feed/PostCard.jsx
import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { toggleLike, registerDownload } from '../../services/posts'
import { reportPost } from '../../services/posts'
import { optimizeUrl } from '../../services/cloudinary'
import CommentsPanel from '../social/CommentsPanel'
import styles from './PostCard.module.css'

const CATS = {
  apk:       { label: 'APK Mod',    icon: '📱', color: 'var(--p2)' },
  games:     { label: 'Juegos Mod', icon: '🎮', color: 'var(--cyan)' },
  script:    { label: 'Scripts',    icon: '⚙️', color: 'var(--green)' },
  tutorials: { label: 'Tutoriales', icon: '📚', color: 'var(--gold)' },
}

// Extraer ID de YouTube desde URL
function getYouTubeId(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export default function PostCard({ post, compact = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(post._liked || false)
  const [likeCount, setLikeCount] = useState(post.likes || 0)
  const [showComments, setShowComments] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [likeAnim, setLikeAnim] = useState(false)

  const cat = CATS[post.category] || CATS.apk
  const ytId = getYouTubeId(post.youtubeUrl)
  const thumbUrl = optimizeUrl(post.imageUrl, { width: 500 })

  const createdAgo = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: es })
    : ''

  const handleLike = useCallback(async () => {
    if (!user) { toast.error('Inicia sesión para dar like'); return }
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 600)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => wasLiked ? c - 1 : c + 1)
    try {
      await toggleLike(post.id, user.uid)
    } catch {
      setLiked(wasLiked)
      setLikeCount(c => wasLiked ? c + 1 : c - 1)
      toast.error('Error al procesar like')
    }
  }, [user, liked, post.id])

  const handleDownload = useCallback(async () => {
    if (!post.downloadUrl) { toast.error('Link de descarga no disponible'); return }
    await registerDownload(post.id)
    window.open(post.downloadUrl, '_blank', 'noopener')
  }, [post])

  const handleReport = useCallback(async () => {
    if (!user) { toast.error('Inicia sesión para reportar'); return }
    const reason = prompt('¿Por qué reportas esta publicación?')
    if (!reason) return
    try {
      await reportPost(post.id, user.uid, reason)
      toast.success('Reporte enviado. Lo revisaremos pronto.')
    } catch {
      toast.error('Error al enviar reporte')
    }
  }, [user, post.id])

  return (
    <article className={`${styles.card} ${compact ? styles.compact : ''} fade-up card`}>
      {/* Badges superiores */}
      <div className={styles.topRow}>
        <span className={styles.catPill} style={{ color: cat.color }}>
          {cat.icon} {cat.label}
        </span>
        <div className={styles.topRight}>
          {post.featured && <span className="badge badge-gold">⭐ Destacado</span>}
          {post.verified && <span className="badge badge-cyan">✓ Verificado</span>}
          <button className={`${styles.moreBtn} btn-icon btn`} title="Reportar" onClick={handleReport}>⋯</button>
        </div>
      </div>

      {/* Media: imagen o video */}
      <div className={styles.media} onClick={() => ytId && setShowVideo(true)}>
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
            {thumbUrl && (
              <img
                src={thumbUrl}
                alt={post.name}
                className={styles.thumb}
                loading="lazy"
              />
            )}
            {ytId && (
              <div className={styles.playOverlay}>
                <div className={styles.playBtn}>▶</div>
                <span>Ver preview</span>
              </div>
            )}
            {!thumbUrl && !ytId && (
              <div className={styles.noMedia}>
                {cat.icon}
              </div>
            )}
          </>
        )}
      </div>

      {/* Contenido */}
      <div className={styles.body}>
        {/* Autor */}
        <Link to={`/profile/${post.authorId}`} className={styles.author}>
          {post.authorPhoto ? (
            <img src={optimizeUrl(post.authorPhoto, { width: 60 })} alt="" className="avatar avatar-sm" />
          ) : (
            <div className={styles.avatarFallback}>{(post.authorName || 'U')[0]}</div>
          )}
          <div>
            <div className={styles.authorName}>{post.authorName || 'Usuario'}</div>
            {createdAgo && <div className={styles.date}>{createdAgo}</div>}
          </div>
        </Link>

        {/* Título */}
        <Link to={`/post/${post.id}`} className={styles.title}>{post.name}</Link>

        {/* Descripción */}
        {!compact && post.description && (
          <p className={styles.desc}>{post.description}</p>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className={styles.tags}>
            {post.tags.slice(0, 4).map(t => (
              <span key={t} className={styles.tag}>#{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className={styles.actions}>
        {/* Like */}
        <button
          className={`${styles.actionBtn} ${liked ? styles.liked : ''}`}
          onClick={handleLike}
        >
          <span className={likeAnim ? styles.heartPop : ''}>
            {liked ? '❤️' : '🤍'}
          </span>
          <span>{likeCount}</span>
        </button>

        {/* Comentarios */}
        <button
          className={styles.actionBtn}
          onClick={() => setShowComments(o => !o)}
        >
          💬 <span>{post.commentCount || 0}</span>
        </button>

        {/* Descargas */}
        <span className={styles.statPill}>
          ⬇️ {post.downloads || 0}
        </span>

        {/* Botón descarga */}
        <button className="btn btn-primary btn-sm" onClick={handleDownload} style={{ marginLeft: 'auto' }}>
          Descargar
        </button>
      </div>

      {/* Panel de comentarios */}
      {showComments && (
        <CommentsPanel postId={post.id} onClose={() => setShowComments(false)} />
      )}
    </article>
  )
}
