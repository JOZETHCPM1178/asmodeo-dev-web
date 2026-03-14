// src/components/chat/GlobalChat.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
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
  // Guarda el ID del último mensaje visto para no contar los ya existentes al cargar
  const lastSeenIdRef = useRef(null)
  // Flag para saber si ya se hizo la carga inicial
  const initializedRef = useRef(false)

  useEffect(() => {
    getChatStatus().then(setChatClosed).catch(() => {})
  }, [])

  useEffect(() => {
    const unsub = subscribeToChatMessages((msgs) => {
      setMessages(msgs)

      if (!initializedRef.current) {
        // Primera carga: marcar todos como vistos, NO contar como no leídos
        if (msgs.length > 0) {
          lastSeenIdRef.current = msgs[msgs.length - 1]?.id || null
        }
        initializedRef.current = true
        return
      }

      // Solo contar como no leídos mensajes NUEVOS (después de la carga inicial)
      if (!open && msgs.length > 0) {
        const lastId = msgs[msgs.length - 1]?.id
        if (lastId && lastId !== lastSeenIdRef.current) {
          // Contar cuántos mensajes nuevos hay desde el último visto
          const lastSeenIdx = msgs.findIndex(m => m.id === lastSeenIdRef.current)
          const newCount = lastSeenIdx === -1 ? 0 : msgs.length - 1 - lastSeenIdx
          if (newCount > 0) setUnread(prev => prev + newCount)
          // Actualizar referencia al último
          lastSeenIdRef.current = lastId
        }
      }
    })
    return unsub
  }, [open])

  // Al abrir: resetear contador y marcar como vistos
  useEffect(() => {
    if (open) {
      setUnread(0)
      if (messages.length > 0) {
        lastSeenIdRef.current = messages[messages.length - 1]?.id || null
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150)
    }
  }, [open])

  // Scroll al fondo cuando llegan mensajes con el chat abierto
  useEffect(() => {
    if (open && messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [messages.length, open])

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

          <div className={styles.messages}>
            {messages.length === 0 ? (
              <div className={styles.empty}>Sin mensajes. ¡Sé el primero!</div>
            ) : messages.map(msg => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                isOwn={msg.userId === user?.uid}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {chatClosed ? (
            <div className={styles.closedNotice}>🔒 El chat está cerrado temporalmente</div>
          ) : (
            <form className={styles.inputRow} onSubmit={handleSend}>
              <input
                className="inp"
                placeholder={user ? 'Escribe... (Enter para enviar)' : 'Inicia sesión para chatear'}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
                }}
                maxLength={300}
                disabled={!user || sending}
                style={{ flex: 1, fontSize: '0.85rem' }}
              />
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
          ? <img
              src={optimizeUrl(msg.photoURL, { width: 40, height: 40 })}
              alt=""
              className="avatar avatar-sm"
              style={{ flexShrink: 0 }}
            />
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
