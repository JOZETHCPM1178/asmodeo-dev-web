// src/components/feed/TikTokFeed.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getFeed, toggleLike, hasLiked,
  registerDownload, getPostUrl
} from '../../services/posts'
import { optimizeUrl } from '../../services/cloudinary'
import DownloadModal from '../ui/DownloadModal'
import PostAudio from './PostAudio'
import styles from './TikTokFeed.module.css'

const CATS = {
  apk:       { label: 'APK Mod',    icon: '📱', color: '#ff0040' },
  games:     { label: 'Juegos Mod', icon: '🎮', color: '#00f5ff' },
  script:    { label: 'Scripts',    icon: '⚙️', color: '#00ff88' },
  tutorials: { label: 'Tutoriales', icon: '📚', color: '#ffaa00' },
}

function getYouTubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
  if (m) return m[1]
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim()
  return null
}

export default function TikTokFeed({ category = null, posts: initialPosts = null }) {
  const [posts, setPosts]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]     = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  // Modal gestionado a nivel FEED — no dentro de cada card
  const [downloadPost, setDownloadPost] = useState(null)
  const lastDocRef   = useRef(null)
  const containerRef = useRef(null)
  const observerRef  = useRef(null)

  const loadInitial = useCallback(async () => {
    if (initialPosts) { setPosts(initialPosts); setLoading(false); return }
    setLoading(true)
    try {
      const r = await getFeed({ category, pageSize: 8 })
      setPosts(r.posts)
      lastDocRef.current = r.lastDoc
      setHasMore(r.hasMore)
    } catch { toast.error('Error cargando feed') }
    finally { setLoading(false) }
  }, [category, initialPosts])

  useEffect(() => {
    setPosts([]); lastDocRef.current = null; setHasMore(true); setCurrentIdx(0)
    loadInitial()
  }, [loadInitial])

  async function loadMore() {
    if (!hasMore || loadingMore || !lastDocRef.current) return
    setLoadingMore(true)
    try {
      const r = await getFeed({ category, pageSize: 6, lastDoc: lastDocRef.current })
      setPosts(prev => {
        const ids = new Set(prev.map(p => p.id))
        return [...prev, ...r.posts.filter(p => !ids.has(p.id))]
      })
      lastDocRef.current = r.lastDoc
      setHasMore(r.hasMore)
    } catch {}
    finally { setLoadingMore(false) }
  }

  // IntersectionObserver para detectar card visible
  useEffect(() => {
    if (!containerRef.current || !posts.length) return
    observerRef.current?.disconnect()

    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = Number(entry.target.dataset.idx)
          setCurrentIdx(idx)
          if (idx >= posts.length - 3) loadMore()
        }
      })
    }, { threshold: 0.6, root: containerRef.current })

    containerRef.current.querySelectorAll('[data-idx]').forEach(c =>
      observerRef.current.observe(c)
    )
    return () => observerRef.current?.disconnect()
  }, [posts.length]) // eslint-disable-line

  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingSpinner} />
      <p className={styles.loadingText}>Cargando feed...</p>
    </div>
  )

  if (!posts.length) return (
    <div className={styles.emptyScreen}>
      <div className={styles.emptyIcon}>📭</div>
      <h3 className={styles.emptyTitle}>Sin publicaciones aún</h3>
      <p className={styles.emptySub}>Sé el primero en subir contenido</p>
    </div>
  )

  return (
    <>
      <div className={styles.container} ref={containerRef}>
        {posts.map((post, idx) => (
          <TikTokCard
            key={post.id}
            post={post}
            idx={idx}
            isActive={idx === currentIdx}
            onDownload={p => setDownloadPost(p)}
          />
        ))}
        {loadingMore && (
          <div className={styles.loadingMore}>
            <div className={styles.loadingSpinner} />
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <div className={styles.endCard}>
            <div className={styles.endIcon}>🎉</div>
            <p className={styles.endText}>Has visto todo el contenido</p>
            <Link to="/upload" className={styles.endBtn}>+ Subir algo nuevo</Link>
          </div>
        )}
      </div>

      {/* Modal de descarga FUERA del container — via portal para evitar el bug de overflow */}
      {downloadPost && createPortal(
        <DownloadModal
          key={downloadPost.id + '-dl-feed'}
          post={downloadPost}
          onClose={() => setDownloadPost(null)}
        />,
        document.body
      )}
    </>
  )
}

function TikTokCard({ post, idx, isActive, onDownload }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [liked, setLiked]         = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes || 0)
  const [likeAnim, setLikeAnim]   = useState(false)
  const [showDesc, setShowDesc]   = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  const cat   = CATS[post.category] || CATS.apk
  const ytId  = getYouTubeId(post.youtubeUrl)
  const isTutorial = post.category === 'tutorials'
  const thumb = post.imageUrl ? optimizeUrl(post.imageUrl, { width: 720, height: 1280 }) : null
  const ago   = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: es })
    : ''

  useEffect(() => {
    if (!user?.uid || !post.id) return
    hasLiked(post.id, user.uid).then(setLiked).catch(() => {})
  }, [user?.uid, post.id])

  // Cuando el card deja de ser activo: parar video y cerrar modal
  useEffect(() => {
    if (!isActive) {
      setShowVideo(false)
      setShowDownload(false)   // ← fix: evita que el modal aparezca en la card siguiente
    }
  }, [isActive])

  async function handleLike() {
    if (!user) { toast.error('Inicia sesión para dar like'); return }
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 600)
    const was = liked
    setLiked(!was); setLikeCount(c => was ? c - 1 : c + 1)
    try { await toggleLike(post.id, user.uid) }
    catch { setLiked(was); setLikeCount(c => was ? c + 1 : c - 1) }
  }

  async function handleDownload() {
    if (!post.downloadUrl) { toast.error('Link no disponible'); return }
    await registerDownload(post.id).catch(() => {})
    // Notificar al feed para abrir el modal a nivel raíz
    onDownload(post)
  }

  async function handleShare() {
    const url = `${window.location.origin}${getPostUrl(post)}`
    if (navigator.share) {
      try { await navigator.share({ title: post.name, url }) } catch {}
      return
    }
    try { await navigator.clipboard.writeText(url); toast.success('🔗 Link copiado') } catch {}
  }

  // Doble tap para like
  const lastTapRef = useRef(0)
  const [doubleTapAnim, setDoubleTapAnim] = useState(false)
  function handleCardTap() {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      setDoubleTapAnim(true)
      setTimeout(() => setDoubleTapAnim(false), 900)
      if (!liked) handleLike()
    }
    lastTapRef.current = now
  }

  return (
    <div className={styles.card} data-idx={idx} onClick={handleCardTap}>

      {/* ── Media ── */}
      <div className={styles.media}>
        {/* Tutorial con ytId: mostrar iframe directo cuando activo */}
        {isTutorial && ytId && isActive && showVideo ? (
          <iframe
            className={styles.videoEmbed}
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
            allow="autoplay; encrypted-media" allowFullScreen
          />
        ) : (
          <>
            {thumb
              ? <img src={thumb} alt={post.name} className={styles.thumb} />
              : <div className={styles.noThumb} style={{ color: cat.color }}>{cat.icon}</div>
            }
            {/* Botón play solo para tutoriales */}
            {isTutorial && ytId && (
              <button className={styles.playBtn}
                onClick={e => { e.stopPropagation(); setShowVideo(true) }}>
                <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            )}
          </>
        )}
        <div className={styles.overlay} />
        {doubleTapAnim && <div className={styles.doubleTapHeart}>❤️</div>}
      </div>

      {/* ── Audio automático — solo para no-tutoriales con YouTube ── */}
      {!isTutorial && ytId && (
        <PostAudio youtubeUrl={post.youtubeUrl} isActive={isActive} category={post.category} />
      )}

      {/* ── Info izquierda abajo ── */}
      <div className={styles.info}>
        {/* Autor */}
        <div className={styles.authorRow}
          onClick={e => { e.stopPropagation(); navigate(`/profile/${post.authorId}`) }}>
          {post.authorPhoto
            ? <img src={optimizeUrl(post.authorPhoto, { width: 80, height: 80 })}
                alt="" className={styles.authorAvatar} />
            : <div className={styles.authorAvatarFb}>{(post.authorName || 'U')[0].toUpperCase()}</div>
          }
          <div>
            <div className={styles.authorName}>@{post.authorName || 'usuario'}</div>
            <div className={styles.authorTime}>{ago}</div>
          </div>
        </div>

        {/* Título */}
        <div className={styles.postTitle}>{post.name}</div>

        {/* Descripción */}
        {post.description && (
          <div className={styles.descWrap}>
            <p className={`${styles.desc} ${showDesc ? styles.descExpanded : ''}`}>
              {post.description.split('\n')[0]}
            </p>
            {post.description.length > 80 && (
              <button className={styles.descToggle}
                onClick={e => { e.stopPropagation(); setShowDesc(v => !v) }}>
                {showDesc ? 'Ver menos' : 'Ver más'}
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className={styles.tags}>
            {post.tags.slice(0, 3).map(t => (
              <span key={t} className={styles.tag}>#{t}</span>
            ))}
          </div>
        )}

        {/* Categoría + tamaño */}
        <div className={styles.metaRow}>
          <span className={styles.catPill} style={{ color: cat.color, borderColor: cat.color + '44' }}>
            {cat.icon} {cat.label}
          </span>
          {!isTutorial && post.size && <span className={styles.sizePill}>💾 {post.size}</span>}
          {!isTutorial && ytId && <span className={styles.musicPill}>🎵 Con música</span>}
          {isTutorial && ytId && <span className={styles.tutorialPill}>📺 Tutorial</span>}
        </div>

        {/* Botón de acción principal */}
        {isTutorial ? (
          <button className={`${styles.downloadBtn} ${styles.tutorialBtn}`}
            onClick={e => { e.stopPropagation(); setShowVideo(true) }}>
            ▶ Ver tutorial
          </button>
        ) : (
          <button className={styles.downloadBtn}
            onClick={e => { e.stopPropagation(); handleDownload() }}>
            ⬇ Descargar{post.size ? ` — ${post.size}` : ''}
          </button>
        )}
      </div>

      {/* ── Controles derecha ── */}
      <div className={styles.actions} onClick={e => e.stopPropagation()}>
        {/* Like */}
        <button className={styles.actionBtn} onClick={handleLike}>
          <span className={`${styles.actionIcon} ${likeAnim ? styles.heartPop : ''} ${liked ? styles.likedIcon : ''}`}>
            {liked ? '❤️' : '🤍'}
          </span>
          <span className={styles.actionCount}>{likeCount}</span>
        </button>

        {/* Compartir */}
        <button className={styles.actionBtn} onClick={handleShare}>
          <span className={styles.actionIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </span>
          <span className={styles.actionCount}>Compartir</span>
        </button>

        {/* Ver post */}
        <button className={styles.actionBtn} onClick={() => navigate(getPostUrl(post))}>
          <span className={styles.actionIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </span>
          <span className={styles.actionCount}>Ver</span>
        </button>

        {/* Descargas / Views */}
        <div className={styles.actionBtn}>
          <span className={styles.actionIcon}>
            {isTutorial ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            )}
          </span>
          <span className={styles.actionCount}>{post.downloads || 0}</span>
        </div>
      </div>
    </div>
  )
}
