// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { getUserProfile } from '../services/auth'
import { getFeed } from '../services/posts'
import { useAuth } from '../context/AuthContext'
import FollowButton from '../components/social/FollowButton'
import PostCard from '../components/feed/PostCard'
import { optimizeUrl } from '../services/cloudinary'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { uid } = useParams()
  const { user: me } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [followers, setFollowers] = useState(0)

  useEffect(() => {
    Promise.all([
      getUserProfile(uid),
      getFeed({ pageSize: 20 }).then(r => r.posts.filter(p => p.authorId === uid))
    ]).then(([p, userPosts]) => {
      setProfile(p)
      setPosts(userPosts)
      setFollowers(p?.followers || 0)
    }).catch(() => toast.error('Error cargando perfil'))
      .finally(() => setLoading(false))
  }, [uid])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
      <span className="spinner spinner-lg" />
    </div>
  )

  if (!profile) return (
    <div className="empty" style={{ paddingTop: '5rem' }}>
      <div className="empty-icon">👤</div>
      <h3>Perfil no encontrado</h3>
    </div>
  )

  return (
    <div className={styles.page}>
      {/* Banner */}
      <div className={styles.banner} />

      <div className={styles.inner}>
        {/* Avatar + info */}
        <div className={styles.profileCard}>
          <div className={styles.avatarWrap}>
            {profile.photoURL
              ? <img src={optimizeUrl(profile.photoURL, { width: 200 })} alt="" className={`avatar ${styles.avatar}`} />
              : <div className={styles.avatarFb}>{(profile.username || 'U')[0]}</div>}
            {profile.verified && <div className={styles.verifiedBadge} title="Verificado">✓</div>}
          </div>

          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.username}>{profile.username || profile.displayName}</h1>
              {profile.role === 'admin' && <span className="badge badge-purple">ADMIN</span>}
              {profile.role === 'admin_jr' && <span className="badge badge-cyan">ADMIN JR</span>}
            </div>
            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statN}>{posts.length}</span>
                <span className={styles.statL}>Publicaciones</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statN}>{followers}</span>
                <span className={styles.statL}>Seguidores</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statN}>{profile.following || 0}</span>
                <span className={styles.statL}>Siguiendo</span>
              </div>
            </div>

            <div className={styles.actions}>
              {me?.uid === uid
                ? <Link to="/settings" className="btn btn-secondary">✏️ Editar perfil</Link>
                : <FollowButton targetId={uid} onChange={isNow => setFollowers(f => isNow ? f + 1 : f - 1)} />}
            </div>
          </div>
        </div>

        {/* Posts del usuario */}
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
            <div className="grid-auto">
              {posts.map(p => <PostCard key={p.id} post={p} compact />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
