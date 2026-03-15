// src/pages/MessagesPage.jsx
// ════════════════════════════════════
//  MENSAJES — Estilo TikTok
//  /messages          → lista de conversaciones
//  /messages/:convId  → chat abierto con teclado
// ════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import {
  subscribeToConversations, subscribeToDMMessages,
  sendDM, markDMsRead, getOrCreateConversation,
  blockUser, unblockUser, isBlocked,
} from '../services/dm'
import { getUserProfile } from '../services/auth'
import { optimizeUrl } from '../services/cloudinary'
import styles from './MessagesPage.module.css'

export default function MessagesPage() {
  const { convId } = useParams()          // undefined = lista, string = chat abierto
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeToConversations(user.uid, convs => {
      setConversations(convs)
      setLoading(false)
    })
    return unsub
  }, [user?.uid])

  if (!user) return (
    <div className={styles.empty}>
      <span style={{ fontSize: '2.5rem' }}>✉️</span>
      <p>Inicia sesión para ver tus mensajes</p>
    </div>
  )

  // ─── CHAT ABIERTO ───
  if (convId) {
    const conv = conversations.find(c => c.id === convId)
    return <ChatView convId={convId} conv={conv} myUid={user.uid} user={user} onBack={() => navigate('/messages')} />
  }

  // ─── LISTA DE CONVERSACIONES ───
  return (
    <div className={styles.page}>
      <div className={styles.listHeader}>
        <h1 className={styles.listTitle}>Mensajes</h1>
      </div>

      {loading ? (
        <div className={styles.center}><span className="spinner spinner-lg" /></div>
      ) : conversations.length === 0 ? (
        <div className={styles.empty}>
          <span style={{ fontSize: '3rem' }}>✉️</span>
          <p>Sin mensajes aún</p>
          <p style={{ fontSize: '0.82rem', opacity: 0.6 }}>Visita un perfil y toca "Mensaje"</p>
        </div>
      ) : (
        <div className={styles.convList}>
          {conversations.map(conv => (
            <ConvItem
              key={conv.id}
              conv={conv}
              myUid={user.uid}
              onClick={() => navigate(`/messages/${conv.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ITEM DE CONVERSACIÓN ───
function ConvItem({ conv, myUid, onClick }) {
  const otherId = conv.participants?.find(p => p !== myUid)
  const [other, setOther] = useState(null)
  const unread = conv.unread?.[myUid] || 0

  useEffect(() => {
    if (!otherId) return
    getUserProfile(otherId).then(setOther).catch(() => {})
  }, [otherId])

  const time = conv.lastMessageAt?.toDate
    ? formatDistanceToNow(conv.lastMessageAt.toDate(), { addSuffix: true, locale: es })
    : ''

  return (
    <div className={styles.convItem} onClick={onClick}>
      <div className={styles.convAvatar}>
        {other?.photoURL
          ? <img src={optimizeUrl(other.photoURL, { width: 100 })} alt="" className={styles.convAvatarImg} />
          : <div className={styles.avatarFb}>{(other?.displayName || '?')[0]}</div>
        }
        {unread > 0 && <span className={styles.convDot} />}
      </div>
      <div className={styles.convInfo}>
        <div className={styles.convName}>{other?.displayName || 'Usuario'}</div>
        <div className={`${styles.convLast} ${unread > 0 ? styles.convUnread : ''}`}>
          {conv.lastMessage || 'Sin mensajes'}
        </div>
      </div>
      <div className={styles.convMeta}>
        <span className={styles.convTime}>{time}</span>
        {unread > 0 && <span className={styles.convBadge}>{unread}</span>}
      </div>
    </div>
  )
}

// ─── CHAT VIEW ───
function ChatView({ convId, conv, myUid, user, onBack }) {
  const [messages, setMessages]     = useState([])
  const [text, setText]             = useState('')
  const [sending, setSending]       = useState(false)
  const [other, setOther]           = useState(null)
  const [blocked, setBlocked]       = useState(false)
  const [showMenu, setShowMenu]     = useState(false)
  const inputRef   = useRef(null)
  const bottomRef  = useRef(null)
  const otherId    = conv?.participants?.find(p => p !== myUid)

  // Cargar perfil del otro usuario
  useEffect(() => {
    if (!otherId) return
    getUserProfile(otherId).then(setOther).catch(() => {})
    isBlocked(myUid, otherId).then(setBlocked).catch(() => {})
  }, [otherId, myUid])

  // Suscribir mensajes
  useEffect(() => {
    if (!convId) return
    const unsub = subscribeToDMMessages(convId, msgs => {
      setMessages(msgs)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    })
    markDMsRead(convId, myUid).catch(() => {})
    return unsub
  }, [convId, myUid])

  // Autofocus al abrir
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  async function handleSend(e) {
    e?.preventDefault()
    if (!text.trim() || !convId) return
    if (blocked) { toast.error('Has bloqueado a este usuario'); return }
    setSending(true)
    try {
      await sendDM(convId, myUid, text.trim())
      setText('')
      setTimeout(() => inputRef.current?.focus(), 50)
    } catch (err) {
      toast.error(err.message || 'Error enviando mensaje')
    } finally {
      setSending(false)
    }
  }

  async function toggleBlock() {
    setShowMenu(false)
    if (!otherId) return
    if (blocked) {
      await unblockUser(myUid, otherId)
      setBlocked(false)
      toast.success('Usuario desbloqueado')
    } else {
      if (!window.confirm(`¿Bloquear a ${other?.displayName}?`)) return
      await blockUser(myUid, otherId)
      setBlocked(true)
      toast.success('Usuario bloqueado 🚫')
    }
  }

  return (
    <div className={styles.chatPage}>

      {/* Header estilo TikTok */}
      <div className={styles.chatHeader}>
        <button className={styles.backBtn} onClick={onBack}>←</button>
        <Link to={`/profile/${otherId}`} className={styles.chatHeaderUser}>
          {other?.photoURL
            ? <img src={optimizeUrl(other.photoURL, { width: 80 })} alt="" className={styles.chatHeaderAvatar} />
            : <div className={styles.avatarFb}>{(other?.displayName || '?')[0]}</div>
          }
          <span className={styles.chatHeaderName}>{other?.displayName || 'Usuario'}</span>
        </Link>
        <div className={styles.chatHeaderActions}>
          <button className={styles.menuBtn} onClick={() => setShowMenu(m => !m)}>⋯</button>
          {showMenu && (
            <div className={styles.chatMenu}>
              <button className={styles.chatMenuItem} onClick={toggleBlock}>
                {blocked ? '🔓 Desbloquear' : '🚫 Bloquear'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className={styles.chatMessages}>
        {messages.length === 0 && (
          <div className={styles.chatEmpty}>
            <div className={styles.chatEmptyAvatar}>
              {other?.photoURL
                ? <img src={optimizeUrl(other.photoURL, { width: 120 })} alt="" />
                : <div className={styles.avatarFbLg}>{(other?.displayName || '?')[0]}</div>
              }
            </div>
            <p className={styles.chatEmptyName}>{other?.displayName || 'Usuario'}</p>
            <p className={styles.chatEmptySub}>Empieza la conversación 👋</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn    = msg.senderId === myUid
          const prevMsg  = messages[i - 1]
          const showTime = !prevMsg ||
            (msg.createdAt?.toDate?.()?.getTime() - prevMsg.createdAt?.toDate?.()?.getTime() > 5 * 60 * 1000)

          return (
            <div key={msg.id}>
              {showTime && msg.createdAt?.toDate && (
                <div className={styles.timeLabel}>
                  {formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: es })}
                </div>
              )}
              <div className={`${styles.bubbleRow} ${isOwn ? styles.ownRow : styles.otherRow}`}>
                {!isOwn && (
                  other?.photoURL
                    ? <img src={optimizeUrl(other.photoURL, { width: 60 })} alt="" className={styles.bubbleAvatar} />
                    : <div className={styles.bubbleAvatarFb}>{(other?.displayName || '?')[0]}</div>
                )}
                <div className={`${styles.bubble} ${isOwn ? styles.ownBubble : styles.otherBubble}`}>
                  {msg.text}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* Input fijo abajo — estilo TikTok */}
      {blocked ? (
        <div className={styles.blockedBar}>
          Has bloqueado a este usuario •
          <button className={styles.unblockBtn} onClick={toggleBlock}>Desbloquear</button>
        </div>
      ) : (
        <form className={styles.chatInput} onSubmit={handleSend}>
          <input
            ref={inputRef}
            className={styles.chatInputField}
            placeholder="Mensaje..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            maxLength={1000}
            disabled={sending}
            autoComplete="off"
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={sending || !text.trim()}
          >
            {sending
              ? <span className="spinner" style={{ width: 18, height: 18 }} />
              : '➤'
            }
          </button>
        </form>
      )}
    </div>
  )
}
