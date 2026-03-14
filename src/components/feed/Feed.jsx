// src/components/feed/Feed.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import { getFeed } from '../../services/posts'
import PostCard from './PostCard'
import styles from './Feed.module.css'

export default function Feed({ category = null, columns = 2 }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)
  const lastDocRef = useRef(null)

  const { ref: bottomRef, inView } = useInView({ threshold: 0.1 })

  // Carga inicial
  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getFeed({ category, pageSize: 12 })
      setPosts(result.posts)
      lastDocRef.current = result.lastDoc
      setHasMore(result.hasMore)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    setPosts([])
    lastDocRef.current = null
    setHasMore(true)
    loadInitial()
  }, [loadInitial])

  // Infinite scroll
  useEffect(() => {
    if (!inView || loadingMore || !hasMore || loading) return
    loadMore()
  }, [inView])

  async function loadMore() {
    if (!hasMore || loadingMore || !lastDocRef.current) return
    setLoadingMore(true)
    try {
      const result = await getFeed({ category, pageSize: 8, lastDoc: lastDocRef.current })
      setPosts(prev => {
        const ids = new Set(prev.map(p => p.id))
        return [...prev, ...result.posts.filter(p => !ids.has(p.id))]
      })
      lastDocRef.current = result.lastDoc
      setHasMore(result.hasMore)
    } catch (e) {
      console.error('Error cargando más posts:', e)
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) return <FeedSkeleton count={6} />

  if (error) return (
    <div className="empty">
      <div className="empty-icon">⚠️</div>
      <h3>Error al cargar</h3>
      <p>{error}</p>
      <button className="btn btn-primary" onClick={loadInitial}>Reintentar</button>
    </div>
  )

  if (posts.length === 0) return (
    <div className="empty">
      <div className="empty-icon">📭</div>
      <h3>Sin publicaciones aún</h3>
      <p>Sé el primero en subir contenido en esta categoría.</p>
    </div>
  )

  return (
    <div className={styles.feedWrap}>
      <div className={styles.grid} style={{ '--cols': columns }}>
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Trigger de infinite scroll */}
      <div ref={bottomRef} className={styles.bottom}>
        {loadingMore && (
          <div className={styles.loadingMore}>
            <span className="spinner" />
            <span>Cargando más...</span>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <div className={styles.endMsg}>
            🎉 Has visto todo el contenido
          </div>
        )}
      </div>
    </div>
  )
}

// Skeleton loader
function FeedSkeleton({ count = 6 }) {
  return (
    <div className={styles.grid} style={{ '--cols': 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeleton}>
          <div className={styles.skTop} />
          <div className={styles.skMedia} />
          <div className={styles.skBody}>
            <div className={styles.skLine} style={{ width: '60%' }} />
            <div className={styles.skLine} style={{ width: '90%' }} />
            <div className={styles.skLine} style={{ width: '75%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
