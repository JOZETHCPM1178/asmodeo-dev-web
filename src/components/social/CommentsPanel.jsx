// src/components/social/CommentsPanel.jsx
import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { addComment, subscribeToComments, deleteComment } from '../../services/social'
import { optimizeUrl } from '../../services/cloudinary'
import styles from './CommentsPanel.module.css'

export default function CommentsPanel({ postId, onClose }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const unsub = subscribeToComments(postId, (msgs) => {
      setComments(msgs)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
    return unsub
  }, [postId])

  async function handleSend(e) {
    e.preventDefault()
    if (!user) { toast.error('Inicia sesión para comentar'); return }
    if (!text.trim()) return

    setSending(true)
    try {
      await addComment(postId, {
        userId: user.uid,
        username: user.displayName || user.username,
        photoURL: user.photoURL,
        text: text.trim(),
      })
      setText('')
    } catch (err) {
      toast.error(err.message || 'Error al comentar')
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(commentId) {
    if (!window.confirm('¿Eliminar este comentario?')) return
    try {
      await deleteComment(postId, commentId)
      toast.success('Comentario eliminado')
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>💬 Comentarios ({comments.length})</span>
        <button className="btn-icon btn" onClick={onClose}>✕</button>
      </div>

      <div className={styles.list}>
        {comments.length === 0 ? (
          <div className={styles.empty}>Sin comentarios aún. ¡Sé el primero!</div>
        ) : (
          comments.map(c => (
            <div key={c.id} className={styles.comment}>
              {c.photoURL ? (
                <img src={optimizeUrl(c.photoURL, { width: 60 })} alt="" className="avatar avatar-sm" />
              ) : (
                <div className={styles.avatarFb}>{(c.username || 'U')[0]}</div>
              )}
              <div className={styles.commentBody}>
                <div className={styles.commentMeta}>
                  <span className={styles.commentUser}>{c.username}</span>
                  {c.createdAt?.toDate && (
                    <span className={styles.commentTime}>
                      {formatDistanceToNow(c.createdAt.toDate(), { addSuffix: true, locale: es })}
                    </span>
                  )}
                </div>
                <p className={styles.commentText}>{c.text}</p>
              </div>
              {/* Puede borrar si es autor o staff */}
              {(user?.uid === c.userId || user?.isStaff) && (
                <button className={styles.deleteBtn} onClick={() => handleDelete(c.id)} title="Eliminar">
                  🗑️
                </button>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className={styles.inputRow} onSubmit={handleSend}>
        {user?.photoURL ? (
          <img src={optimizeUrl(user.photoURL, { width: 60 })} alt="" className="avatar avatar-sm" />
        ) : user ? (
          <div className={styles.avatarFb}>{(user.displayName || 'U')[0]}</div>
        ) : null}
        <input
          className="inp"
          placeholder={user ? 'Escribe un comentario...' : 'Inicia sesión para comentar'}
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={500}
          disabled={!user || sending}
          style={{ flex: 1 }}
        />
        {user && (
          <button className="btn btn-primary btn-sm" type="submit" disabled={sending || !text.trim()}>
            {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : '➤'}
          </button>
        )}
      </form>
    </div>
  )
}
