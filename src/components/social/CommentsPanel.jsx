// src/components/social/CommentsPanel.jsx
import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { addComment, subscribeToComments, deleteComment } from '../../services/social'
import { getUserProfile } from '../../services/auth'
import { optimizeUrl } from '../../services/cloudinary'
import VerifiedBadge from '../ui/VerifiedBadge'
import StickerPicker from '../ui/StickerPicker'
import styles from './CommentsPanel.module.css'

export default function CommentsPanel({ postId, onClose }) {
  const { user }    = useAuth()
  const [comments, setComments]           = useState([])
  const [text, setText]                   = useState('')
  const [sending, setSending]             = useState(false)
  const [replyTo, setReplyTo]             = useState(null)
  const [verifiedCache, setVerifiedCache] = useState({})
  const [showStickers, setShowStickers]   = useState(false)
  const inputRef    = useRef(null)
  const bottomRef   = useRef(null)
  const inputWrapRef = useRef(null)

  useEffect(() => {
    const unsub = subscribeToComments(postId, async (msgs) => {
      setComments(msgs)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      const uids = [...new Set(msgs.map(m => m.userId).filter(Boolean))]
      const missing = uids.filter(uid => !(uid in verifiedCache))
      if (missing.length > 0) {
        const profiles = await Promise.all(missing.map(uid => getUserProfile(uid).catch(() => null)))
        const cache = {}
        missing.forEach((uid, i) => { cache[uid] = profiles[i]?.verified || false })
        setVerifiedCache(prev => ({ ...prev, ...cache }))
      }
    })
    return unsub
  }, [postId])

  async function handleSend(e) {
    e?.preventDefault()
    if (!user) { toast.error('Inicia sesión para comentar'); return }
    if (!text.trim()) return
    setSending(true)
    try {
      const finalText = replyTo ? `@${replyTo.username} ${text.trim()}` : text.trim()
      await addComment(postId, {
        userId:    user.uid,
        username:  user.displayName || user.username,
        photoURL:  user.photoURL,
        text:      finalText,
        replyToId: replyTo?.id || null,
        type:      'text',
      })
      setText(''); setReplyTo(null)
    } catch (err) {
      toast.error(err.message || 'Error al comentar')
    } finally {
      setSending(false)
    }
  }

  // Enviar sticker como comentario
  async function handleStickerSelect(sticker) {
    if (!user) { toast.error('Inicia sesión para enviar stickers'); return }
    setShowStickers(false)
    try {
      await addComment(postId, {
        userId:   user.uid,
        username: user.displayName || user.username,
        photoURL: user.photoURL,
        text:     sticker.url,   // URL del GIF
        type:     'sticker',     // marcar como sticker
        replyToId: replyTo?.id || null,
      })
      setReplyTo(null)
    } catch (err) {
      toast.error(err.message || 'Error al enviar sticker')
    }
  }

  function handleReply(comment) {
    setReplyTo({ id: comment.id, username: comment.username })
    setText('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  async function handleDelete(commentId) {
    if (!window.confirm('¿Eliminar comentario?')) return
    try { await deleteComment(postId, commentId); toast.success('Eliminado') }
    catch { toast.error('No se pudo eliminar') }
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
        ) : comments.map(c => (
          <div key={c.id} className={`${styles.comment} ${c.replyToId ? styles.isReply : ''}`}>
            {c.photoURL
              ? <img src={optimizeUrl(c.photoURL, { width: 60 })} alt="" className="avatar avatar-sm" />
              : <div className={styles.avatarFb}>{(c.username || 'U')[0]}</div>
            }
            <div className={styles.commentBody}>
              <div className={styles.commentMeta}>
                <span className={styles.commentUser}>
                  {c.username}
                  {verifiedCache[c.userId] && (
                    <VerifiedBadge title={`${c.username} está verificado`} />
                  )}
                </span>
                {c.createdAt?.toDate && (
                  <span className={styles.commentTime}>
                    {formatDistanceToNow(c.createdAt.toDate(), { addSuffix: true, locale: es })}
                  </span>
                )}
              </div>

              {/* Texto o sticker */}
              {c.type === 'sticker' ? (
                <img src={c.text} alt="sticker" className={styles.stickerComment} />
              ) : (
                <p className={styles.commentText}>{renderText(c.text)}</p>
              )}

              {user && (
                <button className={styles.replyBtn} onClick={() => handleReply(c)}>
                  ↩ Responder
                </button>
              )}
            </div>

            {(user?.uid === c.userId || user?.isStaff) && (
              <button className={styles.deleteBtn} onClick={() => handleDelete(c.id)}>🗑️</button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={styles.inputWrap} ref={inputWrapRef}>
        {/* Sticker picker */}
        {showStickers && (
          <StickerPicker
            onSelect={handleStickerSelect}
            onClose={() => setShowStickers(false)}
          />
        )}

        {replyTo && (
          <div className={styles.replyIndicator}>
            <span>↩ Respondiendo a <strong>@{replyTo.username}</strong></span>
            <button type="button" onClick={() => setReplyTo(null)} className={styles.cancelReply}>✕</button>
          </div>
        )}

        <form className={styles.inputRow} onSubmit={handleSend}>
          {user?.photoURL
            ? <img src={optimizeUrl(user.photoURL, { width: 60 })} alt="" className="avatar avatar-sm" />
            : user ? <div className={styles.avatarFb}>{(user.displayName || 'U')[0]}</div> : null
          }
          <input
            ref={inputRef}
            className="inp"
            placeholder={user
              ? replyTo ? `Respondiendo a @${replyTo.username}...` : 'Escribe un comentario...'
              : 'Inicia sesión para comentar'}
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
            disabled={!user || sending}
            style={{ flex: 1 }}
          />
          {/* Botón sticker */}
          {user && (
            <button
              type="button"
              className={`${styles.stickerBtn} ${showStickers ? styles.stickerBtnActive : ''}`}
              onClick={() => setShowStickers(o => !o)}
              title="Stickers"
            >
              🎭
            </button>
          )}
          {user && (
            <button className="btn btn-primary btn-sm" type="submit" disabled={sending || !text.trim()}>
              {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : '➤'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

function renderText(text) {
  if (!text) return text
  return text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} style={{ color: 'var(--p2)', fontWeight: 700 }}>{part}</span>
      : part
  )
}
