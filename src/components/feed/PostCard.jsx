// src/components/feed/PostCard.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import {
  toggleLike, hasLiked, registerDownload,
  reportPost, deletePost, toggleFeatured, verifyPost, setPostStatus,
} from '../../services/posts'
import { optimizeUrl } from '../../services/cloudinary'
import CommentsPanel from '../social/CommentsPanel'
import VerifiedBadge from '../ui/VerifiedBadge'
import DownloadModal from '../ui/DownloadModal'
import styles from './PostCard.module.css'

const CATS = {
  apk:       { label: 'APK Mod',    icon: '📱', color: 'var(--p2)' },
  games:     { label: 'Juegos Mod', icon: '🎮', color: 'var(--cyan)' },
  script:    { label: 'Scripts',    icon: '⚙️', color: 'var(--green)' },
  tutorials: { label: 'Tutoriales', icon: '📚', color: 'var(--gold)' },
}

function getYouTubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/)
  return m ? m[1] : null
}

export default function PostCard({ post, compact = false, onDeleted }) {
  const { user } = useAuth()
  const menuRef  = useRef(null)

  const [liked, setLiked]               = useState(false)
  const [likeCount, setLikeCount]       = useState(post.likes || 0)
  const [likeLoading, setLikeLoading]   = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showVideo, setShowVideo]       = useState(false)
  const [likeAnim, setLikeAnim]         = useState(false)
  const [menuOpen, setMenuOpen]         = useState(false)
  const [deleted, setDeleted]           = useState(false)
  const [showDownload, setShowDownload] = useState(false)

  const cat         = CATS[post.category] || CATS.apk
  const ytId        = getYouTubeId(post.youtubeUrl)
  const thumbUrl    = post.imageUrl ? optimizeUrl(post.imageUrl, { width: 600, height: 338 }) : null
  const authorName  = post.authorName  || 'Usuario'
  const authorPhoto = post.authorPhoto || null
  const isOwner     = user?.uid === post.authorId
  const canManage   = user?.isStaff || isOwner

  const createdAgo = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: es })
    : ''

  // Cerrar menú al click fuera
  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Cargar estado like
  useEffect(() => {
    if (!user?.uid || !post.id) return
    let cancelled = false
    hasLiked(post.id, user.uid).then(r => { if (!cancelled) setLiked(r) }).catch(() => {})
    return () => { cancelled = true }
  }, [user?.uid, post.id])

  // ─── LIKE ───
  const handleLike = useCallback(async () => {
    if (!user) { toast.error('Inicia sesión para dar like'); return }
    if (likeLoading) return
    setLikeLoading(true)
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 600)
    const was = liked
    setLiked(!was)
    setLikeCount(c => was ? c - 1 : c + 1)
    try { await toggleLike(post.id, user.uid) }
    catch { setLiked(was); setLikeCount(c => was ? c + 1 : c - 1); toast.error('Error') }
    finally { setLikeLoading(false) }
  }, [user, liked, likeLoading, post.id])

  // ─── DESCARGA ───
  const handleDownload = useCallback(async () => {
    if (!post.downloadUrl) { toast.error('Link no disponible'); return }
    await registerDownload(post.id).catch(() => {})
    setShowDownload(true)
  }, [post])

  // ─── COMPARTIR ───
  const handleShare = useCallback(async () => {
    const url  = `https://asmodeo-og.asmodeotayson.workers.dev/?post=${post.id}`
    const text = `${post.name} — Descárgalo en AsmodeoDev`
    setMenuOpen(false)
    if (navigator.share) {
      try { await navigator.share({ title: post.name, text, url }) } catch {}
      return
    }
    try { await navigator.clipboard.writeText(url) }
    catch {
      const el = document.createElement('input')
      el.value = url; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    toast.success('🔗 Link copiado')
  }, [post])

  // ─── MENÚ ACCIONES ───
  async function menuAction(action) {
    setMenuOpen(false)
    try {
      if (action === 'share')   { handleShare(); return }
      if (action === 'report')  {
        const r = window.prompt('¿Por qué reportas esta publicación?')
        if (!r?.trim()) return
        await reportPost(post.id, user.uid, r)
        toast.success('Reporte enviado ✅')
        return
      }
      if (action === 'delete')  {
        if (!window.confirm(`¿Eliminar "${post.name}"?`)) return
        await deletePost(post.id)
        setDeleted(true)
        onDeleted?.()
        toast.success('Eliminado')
        return
      }
      if (action === 'feature') {
        await toggleFeatured(post.id, !post.featured)
        toast.success(post.featured ? 'Destacado quitado' : '⭐ Destacado')
        return
      }
      if (action === 'verify')  {
        await verifyPost(post.id, !post.verified)
        toast.success(post.verified ? 'Verificación quitada' : '✓ Verificado')
        return
      }
      if (action === 'hide')    {
        await setPostStatus(post.id, 'hidden')
        setDeleted(true)
        toast.success('Ocultado')
        return
      }
    } catch (e) { toast.error(e.message || 'Error') }
  }

  if (deleted) return null

  return (
    <article className={`${styles.card} ${compact ? styles.compact : ''}`}>

      {/* ── TOP ROW ── */}
      <div className={styles.topRow}>
        <span className={styles.catPill} style={{ color: cat.color }}>
          {cat.icon} {cat.label}
        </span>
        <div className={styles.topRight}>
          {post.featured && <span className="badge badge-gold">⭐</span>}
          {/* Menú ⋯ */}
          <div className={styles.menuWrap} ref={menuRef}>
            <button className={styles.moreBtn} onClick={() => setMenuOpen(o => !o)} title="Opciones">
              ⋯
            </button>
            {menuOpen && (
              <div className={styles.menuDropdown}>
                <button className={styles.menuItem} onClick={() => menuAction('share')}>
                  🔗 Compartir
                </button>
                {user && !isOwner && (
                  <button className={styles.menuItem} onClick={() => menuAction('report')}>
                    🚩 Reportar
                  </button>
                )}
                {canManage && (
                  <>
                    <div className={styles.menuDivider} />
                    {/* Editar — siempre disponible para dueño del post o admin */}
                    <button className={styles.menuItem} onClick={() => { setMenuOpen(false); window.location.href = getPostUrl(post) }}>
                      ✏️ Editar publicación
                    </button>
                    {user?.isStaff && <>
                      <button className={styles.menuItem} onClick={() => menuAction('feature')}>
                        {post.featured ? '⭐ Quitar destacado' : '⭐ Destacar'}
                      </button>
                      <button className={styles.menuItem} onClick={() => menuAction('verify')}>
                        {post.verified ? '✓ Quitar verificado' : '✓ Verificar'}
                      </button>
                      <button className={styles.menuItem} onClick={() => menuAction('hide')}>
                        👁️ Ocultar
                      </button>
                    </>}
                    <button className={`${styles.menuItem} ${styles.menuDanger}`} onClick={() => menuAction('delete')}>
                      🗑️ Eliminar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MEDIA ── */}
      <div
        className={styles.media}
        onClick={() => ytId && !showVideo && setShowVideo(true)}
        style={{ cursor: ytId && !showVideo ? 'pointer' : 'default' }}
      >
        {showVideo && ytId ? (
          <iframe
            className={styles.ytEmbed}
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
            title={post.name} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
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

      {/* ── BODY ── */}
      <div className={styles.body}>
        <Link to={`/profile/${post.authorId}`} className={styles.author}>
          {authorPhoto
            ? <img src={optimizeUrl(authorPhoto, { width: 60, height: 60 })} alt="" className="avatar avatar-sm" />
            : <div className={styles.avatarFb}>{authorName[0].toUpperCase()}</div>
          }
          <div>
            <div className={styles.authorName}>
              {authorName}
              {post.authorVerified && (
                <VerifiedBadge title={`${authorName} está verificado`} />
              )}
            </div>
            {createdAgo && <div className={styles.date}>{createdAgo}</div>}
          </div>
        </Link>

        <Link to={getPostUrl(post)} className={styles.title}>{post.name}</Link>

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

        {/* VirusTotal badge */}
        {post.vtClean === true && !post.vtSkipped && (
          <div className={styles.vtBadge}>
            <span>🛡️</span>
            <span>Verificado por VirusTotal — Sin amenazas detectadas</span>
          </div>
        )}
      </div>

      {/* ── ACCIONES ── */}
      <div className={styles.actions}>
        {/* Like — siempre corazón rojo */}
        <button
          className={`${styles.actionBtn} ${styles.likeBtn} ${liked ? styles.liked : ''}`}
          onClick={handleLike} disabled={likeLoading}
        >
          <span className={likeAnim ? styles.heartPop : ''}>❤️</span>
          <span>{likeCount}</span>
        </button>

        <button
          className={`${styles.actionBtn} ${showComments ? styles.activeAction : ''}`}
          onClick={() => setShowComments(o => !o)}
        >
          💬 <span>{post.commentCount || 0}</span>
        </button>

        {/* Compartir — botón directo en barra */}
        <button className={styles.actionBtn} onClick={handleShare} title="Compartir">
          🔗 <span className={styles.shareLabel}>Compartir</span>
        </button>

        <span className={styles.statPill}>⬇️ {post.downloads || 0}</span>

        <button className="btn btn-primary btn-sm" onClick={handleDownload} style={{ marginLeft: 'auto' }}>
          Descargar
        </button>
      </div>

      {showComments && (
        <CommentsPanel postId={post.id} onClose={() => setShowComments(false)} />
      )}

      {showDownload && (
        <DownloadModal post={post} onClose={() => setShowDownload(false)} />
      )}
    </article>
  )
}
