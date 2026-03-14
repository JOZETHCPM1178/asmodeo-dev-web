// src/components/social/FollowButton.jsx
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { followUser, unfollowUser, isFollowing } from '../../services/social'

export default function FollowButton({ targetId, onChange }) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.uid === targetId) { setLoading(false); return }
    isFollowing(user.uid, targetId)
      .then(setFollowing)
      .finally(() => setLoading(false))
  }, [user?.uid, targetId])

  if (!user || user.uid === targetId) return null

  async function handleToggle() {
    setLoading(true)
    try {
      if (following) {
        await unfollowUser(user.uid, targetId)
        setFollowing(false)
        toast('Dejaste de seguir a este usuario')
      } else {
        await followUser(user.uid, targetId)
        setFollowing(true)
        toast.success('¡Ahora sigues a este usuario!')
      }
      onChange?.(!following)
    } catch (err) {
      toast.error(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={following ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> :
        following ? '✓ Siguiendo' : '+ Seguir'}
    </button>
  )
}
