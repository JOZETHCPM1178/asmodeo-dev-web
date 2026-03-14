// src/components/feed/PostCard.jsx
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { toggleLike, hasLiked, registerDownload, reportPost } from '../../services/posts'
import { optimizeUrl } from '../../services/cloudinary'
import CommentsPanel from '../social/CommentsPanel'
import styles from './PostCard.module.css'

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

export default function PostCard({ post, compact = false }) {
  const { user } = useAuth()
  const [liked, setLiked]           = useState(false)
  const [likeCount, setLikeCount]   = useState(post.likes || 0)
  const [likeLoading, setLikeLoading] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showVideo, setShowVideo]   = useState(false)
  const [likeAnim, setLikeAnim]     = useState(false)

  const cat    = CATS[post.category] || CATS.apk
  const ytId   = getYouTubeId(post.youtubeUrl)
  const thumbUrl = post.imageUrl ? optimizeUrl(post.imageUrl, { width: 600, height: 338 }) : null

  const createdAgo = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: es })
    : ''

  // Nombre del autor — usa el que venga en el post
  // Si el usuario actualizó su nombre, se verá en nuevos posts
  const authorName  = post.authorName  || 'Usuario'
  const authorPhoto = post.authorPhoto || null

  useEffect(() => {
    if (!user?.uid || !post.id) return
    let cancelled = false
    hasLiked(post.id, user.uid)
      .then(r => { if (!cancelled) setLiked(r) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.uid, post.id])

  // ─── LIKE ───
  const handleLike = useCallback(async () => {
    if (!user) { toast.error('Inicia sesión para dar like'); return }
    if (likeLoading) return
    setLikeLoading(true)
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
    } finally {
      setLikeLoading(false)
    }
  }, [user, liked, likeLoading, post.id])

  // ─── DESCARGA ───
  const handleDownload = useCallback(async () => {
    if (!post.downloadUrl) { toast.error('Link no disponible'); return }
    await registerDownload(post.id).catch(() => {})
    window.open(post.downloadUrl, '_blank', 'noopener,noreferrer')
  }, [post])

  // ─── COMPARTIR ───
  const handleShare = useCallback(async () => {
    const url  = `${window.location.origin}/post/${post.id}`
    const text = `${post.name} — Descárgalo en AsmodeoDev`

    if (navigator.share) {
      // Web Share API — funciona en móvil
      try {
        await navigator.share({ title: post.name, text, url })
        return
      } catch {
        // Cancelado por usuario, no hacer nada
        return
      }
    }

    // Fallback — copiar al portapapeles
    try {
      await navigator.clipboard.writeText(url)
      toast.success('🔗 Link copiado al portapapeles')
    } catch {
      // Último fallback
      const el = document.createElement('input')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      toast.success('🔗 Link copiado')
    }
  }, [post])

  // ─── REPORTAR ───
  const handleReport = useCallback(async () => {
    if (!user) { toast.error('Inicia sesión para reportar'); return }
    const reason = window.prompt('¿Por qué reportas esta publicación?')
    if (!reason?.trim()) return
    try {
      await reportPost(post.id, user.uid, reason)
      toast.success('Reporte enviado ✅')
    } catch {
      toast.error('Error al enviar reporte')
    }
  }, [user, post.id])

  return (
    <article className={`${styles.card} ${compact ? styles.compact : ''}`}>
      {/* Top row */}
      <div className={styles.topRow}>
        <span className={styles.catPill} style={{ color: cat.color }}>
          {cat.icon} {cat.label}
        </span>
        <div className={styles.topRight}>
          {post.featured && <span className="badge badge-gold">⭐</span>}
          {post.verified && <span className="badge badge-cyan">✓</span>}
          <button className={styles.moreBtn} onClick={handleReport} title="Reportar">⋯</button>
        </div>
      </div>

      {/* Media */}
      <div
        className={styles.media}
        onClick={() => ytId && !showVideo && setShowVideo(true)}
        style={{ cursor: ytId && !showVideo ? 'pointer' : 'default' }}
      >
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
            {thumbUrl
              ? <img src={thumbUrl} alt={post.name} className={styles.thumb} loading="lazy" />
              : <div className={styles.noMedia}>{cat.icon}</div>
            }
            {ytId && (
              <div className={styles.playOverlay}>
                <div className={styles.playBtn}>▶</div>
                <span>Ver preview</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Body */}
      <div className={styles.body}>
        <Link to={`/profile/${post.authorId}`} className={styles.author}>
          {authorPhoto
            ? <img src={optimizeUrl(authorPhoto, { width: 60, height: 60 })} alt="" className="avatar avatar-sm" />
            : <div className={styles.avatarFb}>{authorName[0].toUpperCase()}</div>
          }
          <div>
            <div className={styles.authorName}>{authorName}</div>
            {createdAgo && <div className={styles.date}>{createdAgo}</div>}
          </div>
        </Link>

        <Link to={`/post/${post.id}`} className={styles.title}>{post.name}</Link>

        {!compact && post.description && (
          <p className={styles.desc}>{post.description}</p>
        )}

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
          disabled={likeLoading}
        >
          <span className={likeAnim ? styles.heartPop : ''}>
            {liked ? '❤️' : '🤍'}
          </span>
          <span>{likeCount}</span>
        </button>

        {/* Comentarios */}
        <button
          className={`${styles.actionBtn} ${showComments ? styles.activeAction : ''}`}
          onClick={() => setShowComments(o => !o)}
        >
          💬 <span>{post.commentCount || 0}</span>
        </button>

        {/* Compartir */}
        <button className={styles.actionBtn} onClick={handleShare} title="Compartir">
          🔗
        </button>

        {/* Descargas */}
        <span className={styles.statPill}>⬇️ {post.downloads || 0}</span>

        {/* Botón descargar */}
        <button className="btn btn-primary btn-sm" onClick={handleDownload} style={{ marginLeft: 'auto' }}>
          Descargar
        </button>
      </div>

      {showComments && (
        <CommentsPanel postId={post.id} onClose={() => setShowComments(false)} />
      )}
    </article>
  )
}
