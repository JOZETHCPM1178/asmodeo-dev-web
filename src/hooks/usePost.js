// src/hooks/usePost.js
// ════════════════════════════════════════
//  HOOKS PERSONALIZADOS
// ════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { getPost, hasLiked } from '../services/posts'
import { useAuth } from '../context/AuthContext'

/**
 * Hook para cargar un post individual con estado de like del usuario
 */
export function usePost(postId) {
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!postId) return
    setLoading(true)
    setError(null)
    try {
      const p = await getPost(postId)
      setPost(p)
      if (user && p) {
        const isLiked = await hasLiked(postId, user.uid)
        setLiked(isLiked)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [postId, user?.uid])

  useEffect(() => { load() }, [load])

  return { post, liked, loading, error, reload: load }
}
