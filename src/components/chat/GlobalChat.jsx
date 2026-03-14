// src/components/chat/GlobalChat.jsx
import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { subscribeToChatMessages, sendChatMessage, getChatStatus } from '../../services/social'
import { optimizeUrl } from '../../services/cloudinary'
import styles from './GlobalChat.module.css'

export default function GlobalChat() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [chatClosed, setChatClosed] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef(null)
  const lastSeenRef = useRef(0)

  useEffect(() => {
    // Verificar estado del chat
    getChatStatus().then(setChatClosed).catch(() => {})
  }, [])

  useEffect(() => {
    const unsub = subscribeToChatMessages((msgs) => {
      setMessages(msgs)
      if (!open && msgs.length > lastSeenRef.current) {
        setUnread(msgs.length - lastSeenRef.current)
      }
    })
    return unsub
  }, [open])

  useEffect(() => {
    if (open) {
      lastSeenRef.current = messages.length
      setUnread(0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150)
    }
  }, [open, messages.length])

  async function handleSend(e) {
    e.preventDefault()
    if (!user) { toast.error('Inicia sesión para chatear'); return }
    if (!text.trim()) return

    setSending(true)
    try {
      await sendChatMessage({
        userId: user.uid,
        username: user.displayName || user.username,
        photoURL: user.photoURL,
        text: text.trim(),
      })
      setText('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      toast.error(err.message || 'Error al enviar mensaje')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        className={styles.fab}
        onClick={() => setOpen(o => !o)}
        title="Chat Global"
      >
        {open ? '✕' : '💬'}
        {!open && unread > 0 && (
          <span className={styles.fabBadge}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Panel de chat */}
      {open && (
        <div className={styles.panel}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span>💬</span>
              <span>Chat Global</span>
              <span className={styles.liveTag}>● En vivo</span>
              {chatClosed && <span className={styles.closedTag}>🔒 Cerrado</span>}
            </div>
            <button className="btn-icon btn" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Mensajes */}
          <div className={styles.messages}>
            {messages.length === 0 ? (
              <div className={styles.empty}>Sin mensajes aún. ¡Rompe el hielo!</div>
            ) : messages.map(msg => (
              <ChatMessage key={msg.id} msg={msg} isOwn={msg.userId === user?.uid} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {chatClosed ? (
            <div className={styles.closedNotice}>🔒 El chat está cerrado temporalmente</div>
          ) : (
            <form className={styles.inputRow} onSubmit={handleSend}>
              <input
                className="inp"
                placeholder={user ? 'Escribe un mensaje... (Enter)' : 'Inicia sesión para chatear'}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
                maxLength={300}
                disabled={!user || sending}
                style={{ flex: 1 }}
              />
              {user && (
                <button
                  className="btn btn-primary btn-sm"
                  type="submit"
                  disabled={sending || !text.trim()}
                >
                  {sending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '➤'}
                </button>
              )}
            </form>
          )}
        </div>
      )}
    </>
  )
}

function ChatMessage({ msg, isOwn }) {
  const time = msg.createdAt?.toDate
    ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: es })
    : ''

  return (
    <div className={`${styles.msg} ${isOwn ? styles.own : ''}`}>
      {!isOwn && (
        msg.photoURL
          ? <img src={optimizeUrl(msg.photoURL, { width: 40 })} alt="" className="avatar avatar-sm" />
          : <div className={styles.avatarFb}>{(msg.username || 'U')[0]}</div>
      )}
      <div className={styles.msgContent}>
        {!isOwn && <div className={styles.msgUser}>{msg.username}</div>}
        <div className={styles.msgBubble}>{msg.text}</div>
        <div className={styles.msgTime}>{time}</div>
      </div>
    </div>
  )
}
