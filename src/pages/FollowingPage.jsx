// src/pages/FollowingPage.jsx
// Feed de publicaciones de usuarios que sigues
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getFollowing } from '../services/social'
import { getFollowingFeed } from '../services/posts'
import PostCard from '../components/feed/PostCard'
import SEO from '../components/ui/SEO'
import styles from './FollowingPage.module.css'

export default function FollowingPage() {
  const { user } = useAuth()
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [empty, setEmpty]     = useState(false)

  useEffect(() => {
    if (!user?.uid) { setLoading(false); setEmpty(true); return }

    async function load() {
      try {
        // 1. Obtener IDs de usuarios que sigo
        const followingIds = await getFollowing(user.uid)
        if (!followingIds.length) { setEmpty(true); setLoading(false); return }

        // 2. Obtener posts de esos usuarios (chunks de 10 por límite Firestore)
        const allPosts = await getFollowingFeed(followingIds, 30)
        if (!allPosts.length) { setEmpty(true) }
        else { setPosts(allPosts) }
      } catch (e) {
        console.error(e)
        setEmpty(true)
      } finally { setLoading(false) }
    }
    load()
  }, [user?.uid])

  return (
    <div className={styles.page}>
      <SEO title="Seguidos — AsmodeoDev" description="Publicaciones de los usuarios que sigues" url="/seguidos" />

      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>👥 Seguidos</h1>
            <p className={styles.sub}>Publicaciones de las personas que sigues</p>
          </div>
        </div>

        {loading && (
          <div className={styles.center}>
            <span className="spinner spinner-lg" />
          </div>
        )}

        {!loading && !user && (
          <div className={styles.noAuth}>
            <div className={styles.noAuthIcon}>👥</div>
            <h2 className={styles.noAuthTitle}>Inicia sesión para ver tu feed</h2>
            <p className={styles.noAuthSub}>Sigue usuarios y sus publicaciones aparecerán aquí</p>
          </div>
        )}

        {!loading && user && empty && (
          <div className={styles.noAuth}>
            <div className={styles.noAuthIcon}>🔍</div>
            <h2 className={styles.noAuthTitle}>Aún no sigues a nadie</h2>
            <p className={styles.noAuthSub}>Explora el feed y sigue a los creadores que te gusten</p>
            <Link to="/feed" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Explorar feed →
            </Link>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className={styles.grid}>
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
