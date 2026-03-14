// src/components/chat/GlobalChat.jsx
// ════════════════════════════════════════
//  CHAT GLOBAL con sistema de @menciones
// ════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { subscribeToChatMessages, sendChatMessage, getChatStatus } from '../../services/social'
import { optimizeUrl } from '../../services/cloudinary'
import styles from './GlobalChat.module.css'

export default function GlobalChat() {
  const { user }  = useAuth()
  const inputRef  = useRef(null)
  const bottomRef = useRef(null)
  const lastSeenIdRef   = useRef(null)
  const initializedRef  = useRef(false)

  const [open, setOpen]           = useState(false)
  const [messages, setMessages]   = useState([])
  const [text, setText]           = useState('')
  const [sending, setSending]     = useState(false)
  const [chatClosed, setChatClosed] = useState(false)
  const [unread, setUnread]       = useState(0)

  // ─── @ MENCIONES ───
  const [mentionQuery, setMentionQuery] = useState('') // texto tras @
  const [mentionList, setMentionList]   = useState([]) // usuarios sugeridos
  const [showMentions, setShowMentions] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0) // navegación con flechas

  useEffect(() => {
    getChatStatus().then(setChatClosed).catch(() => {})
  }, [])

  useEffect(() => {
    const unsub = subscribeToChatMessages((msgs) => {
      setMessages(msgs)
      if (!initializedRef.current) {
        if (msgs.length > 0) lastSeenIdRef.current = msgs[msgs.length - 1]?.id || null
        initializedRef.current = true
        return
      }
      if (!open && msgs.length > 0) {
        const lastId = msgs[msgs.length - 1]?.id
        if (lastId && lastId !== lastSeenIdRef.current) {
          const lastSeenIdx = msgs.findIndex(m => m.id === lastSeenIdRef.current)
          const newCount = lastSeenIdx === -1 ? 0 : msgs.length - 1 - lastSeenIdx
          if (newCount > 0) setUnread(prev => prev + newCount)
          lastSeenIdRef.current = lastId
        }
      }
    })
    return unsub
  }, [open])

  useEffect(() => {
    if (open) {
      setUnread(0)
      if (messages.length > 0) lastSeenIdRef.current = messages[messages.length - 1]?.id || null
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150)
    }
  }, [open])

  useEffect(() => {
    if (open && messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [messages.length, open])

  // ─── DETECTAR @ EN EL INPUT ───
  function handleTextChange(e) {
    const val = e.target.value
    setText(val)

    // Buscar si hay un @ sin cerrar al final del texto
    const cursorPos = e.target.selectionStart
    const textUpToCursor = val.slice(0, cursorPos)
    const atMatch = textUpToCursor.match(/@(\w*)$/)

    if (atMatch) {
      const query = atMatch[1].toLowerCase()
      setMentionQuery(query)

      // Buscar usuarios únicos en los mensajes del chat
      const seen = new Set()
      const users = messages
        .filter(m => m.userId !== user?.uid) // no sugerirse a uno mismo
        .filter(m => {
          const name = m.username?.toLowerCase() || ''
          if (seen.has(m.userId)) return false
          seen.add(m.userId)
          return query === '' || name.includes(query)
        })
        .map(m => ({ userId: m.userId, username: m.username, photoURL: m.photoURL }))
        .slice(0, 5)

      if (users.length > 0) {
        setMentionList(users)
        setShowMentions(true)
        setMentionIndex(0)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  // ─── INSERTAR MENCIÓN ───
  function insertMention(username) {
    const cursorPos = inputRef.current?.selectionStart || text.length
    const textUpToCursor = text.slice(0, cursorPos)
    const atMatch = textUpToCursor.match(/@(\w*)$/)

    if (atMatch) {
      const before = text.slice(0, cursorPos - atMatch[0].length)
      const after  = text.slice(cursorPos)
      const newText = `${before}@${username} ${after}`
      setText(newText)
      // Mover cursor después de la mención
      setTimeout(() => {
        const newPos = before.length + username.length + 2
        inputRef.current?.setSelectionRange(newPos, newPos)
        inputRef.current?.focus()
      }, 10)
    }
    setShowMentions(false)
  }

  // ─── TECLADO EN DROPDOWN ───
  function handleKeyDown(e) {
    if (showMentions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(i => Math.min(i + 1, mentionList.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        if (mentionList[mentionIndex]) insertMention(mentionList[mentionIndex].username)
        return
      }
      if (e.key === 'Escape') {
        setShowMentions(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault()
      handleSend(e)
    }
  }

  // ─── ENVIAR ───
  async function handleSend(e) {
    e?.preventDefault()
    if (!user) { toast.error('Inicia sesión para chatear'); return }
    if (!text.trim()) return
    setSending(true)
    try {
      await sendChatMessage({
        userId:   user.uid,
        username: user.displayName || user.username,
        photoURL: user.photoURL,
        text:     text.trim(),
      })
      setText('')
      setShowMentions(false)
    } catch (err) {
      toast.error(err.message || 'Error al enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        className={styles.fab}
        onClick={() => setOpen(o => !o)}
        title="Chat Global"
        aria-label="Abrir chat global"
      >
        {open ? '✕' : '💬'}
        {!open && unread > 0 && (
          <span className={styles.fabBadge}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className={styles.panel}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span>💬</span>
              <span className={styles.headerTitle}>Chat Global</span>
              {chatClosed
                ? <span className={styles.closedTag}>🔒 Cerrado</span>
                : <span className={styles.liveTag}>● En vivo</span>
              }
            </div>
            <button className="btn btn-icon btn" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Mensajes */}
          <div className={styles.messages}>
            {messages.length === 0 ? (
              <div className={styles.empty}>Sin mensajes aún. ¡Sé el primero! 👋</div>
            ) : messages.map(msg => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                isOwn={msg.userId === user?.uid}
                currentUsername={user?.displayName || user?.username}
                onMention={username => {
                  setText(t => `${t}@${username} `)
                  inputRef.current?.focus()
                }}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {chatClosed ? (
            <div className={styles.closedNotice}>🔒 El chat está cerrado temporalmente</div>
          ) : (
            <div className={styles.inputWrap}>
              {/* Dropdown de menciones */}
              {showMentions && mentionList.length > 0 && (
                <div className={styles.mentionDropdown}>
                  <div className={styles.mentionHint}>Usuarios en el chat</div>
                  {mentionList.map((u, i) => (
                    <button
                      key={u.userId}
                      className={`${styles.mentionItem} ${i === mentionIndex ? styles.mentionActive : ''}`}
                      onMouseDown={e => { e.preventDefault(); insertMention(u.username) }}
                    >
                      {u.photoURL
                        ? <img src={optimizeUrl(u.photoURL, { width: 40 })} alt="" className={styles.mentionAvatar} />
                        : <div className={styles.mentionAvatarFb}>{(u.username || 'U')[0]}</div>
                      }
                      <span className={styles.mentionName}>@{u.username}</span>
                    </button>
                  ))}
                </div>
              )}

              <form className={styles.inputRow} onSubmit={handleSend}>
                <div className={styles.inputInner}>
                  <input
                    ref={inputRef}
                    className={`inp ${styles.chatInput}`}
                    placeholder={user ? 'Escribe... usa @ para mencionar' : 'Inicia sesión para chatear'}
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    maxLength={300}
                    disabled={!user || sending}
                    autoComplete="off"
                  />
                  {/* Botón @ */}
                  {user && (
                    <button
                      type="button"
                      className={styles.atBtn}
                      onClick={() => {
                        setText(t => t + '@')
                        inputRef.current?.focus()
                      }}
                      title="Mencionar usuario"
                    >
                      @
                    </button>
                  )}
                </div>
                {user && (
                  <button
                    className="btn btn-primary btn-sm"
                    type="submit"
                    disabled={sending || !text.trim()}
                  >
                    {sending
                      ? <span className="spinner" style={{ width: 14, height: 14 }} />
                      : '➤'}
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ─── MENSAJE INDIVIDUAL ───
function ChatMessage({ msg, isOwn, currentUsername, onMention }) {
  const time = msg.createdAt?.toDate
    ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: es })
    : ''

  // Resaltar @menciones en el texto
  function renderText(text) {
    if (!text) return text
    const parts = text.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const mentioned = part.slice(1)
        const isMe = mentioned.toLowerCase() === currentUsername?.toLowerCase()
        return (
          <span
            key={i}
            className={`${styles.mention} ${isMe ? styles.mentionMe : ''}`}
          >
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className={`${styles.msg} ${isOwn ? styles.own : ''}`}>
      {!isOwn && (
        <div
          className={styles.avatarWrap}
          title={`Mencionar a ${msg.username}`}
          onClick={() => onMention?.(msg.username)}
        >
          {msg.photoURL
            ? <img src={optimizeUrl(msg.photoURL, { width: 40, height: 40 })} alt="" className="avatar avatar-sm" style={{ flexShrink: 0, cursor: 'pointer' }} />
            : <div className={styles.avatarFb}>{(msg.username || 'U')[0]}</div>
          }
        </div>
      )}
      <div className={styles.msgContent}>
        {!isOwn && (
          <button
            className={styles.msgUser}
            onClick={() => onMention?.(msg.username)}
            title="Mencionar"
          >
            {msg.username}
          </button>
        )}
        <div className={styles.msgBubble}>{renderText(msg.text)}</div>
        <div className={styles.msgTime}>{time}</div>
      </div>
    </div>
  )
}
