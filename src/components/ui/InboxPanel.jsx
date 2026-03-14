// src/components/ui/InboxPanel.jsx
// ════════════════════════════════════════
//  INBOX ESTILO TIKTOK — Notificaciones + Mensajes privados
// ════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { markNotificationRead, markAllNotificationsRead } from '../../services/social'
import {
  subscribeToConversations, subscribeToDMMessages,
  sendDM, markDMsRead, getTotalUnread, getOrCreateConversation,
} from '../../services/dm'
import { getUserProfile } from '../../services/auth'
import { optimizeUrl } from '../../services/cloudinary'
import styles from './InboxPanel.module.css'

export default function InboxPanel({ notifications, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]                   = useState('notifs') // 'notifs' | 'messages'
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv]     = useState(null)   // { id, otherUser }
  const [messages, setMessages]         = useState([])
  const [dmText, setDmText]             = useState('')
  const [dmSending, setDmSending]       = useState(false)
  const [totalUnreadDMs, setTotalUnreadDMs] = useState(0)
  const msgBottomRef = useRef(null)
  const unsubMsgsRef = useRef(null)

  // Cargar conversaciones
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToConversations(user.uid, convs => {
      setConversations(convs)
      setTotalUnreadDMs(getTotalUnread(convs, user.uid))
    })
    return unsub
  }, [user?.uid])

  // Escuchar mensajes de la conversación activa
  useEffect(() => {
    if (unsubMsgsRef.current) unsubMsgsRef.current()
    if (!activeConv) return
    unsubMsgsRef.current = subscribeToDMMessages(activeConv.id, msgs => {
      setMessages(msgs)
      setTimeout(() => msgBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
    markDMsRead(activeConv.id, user.uid).catch(() => {})
    return () => { if (unsubMsgsRef.current) unsubMsgsRef.current() }
  }, [activeConv?.id])

  async function handleSendDM(e) {
    e.preventDefault()
    if (!dmText.trim() || !activeConv) return
    setDmSending(true)
    try {
      await sendDM(activeConv.id, user.uid, dmText.trim())
      setDmText('')
    } catch (err) {
      toast.error(err.message || 'Error enviando mensaje')
    } finally {
      setDmSending(false)
    }
  }

  async function handleNotifClick(notif) {
    if (!notif.read) markNotificationRead(notif.id).catch(() => {})
    if (notif.postId) { navigate(`/post/${notif.postId}`); onClose() }
    else if (notif.fromUserId) { navigate(`/profile/${notif.fromUserId}`); onClose() }
  }

  const unreadNotifs = notifications.filter(n => !n.read).length

  const notifIcon = { follow: '👤', comment: '💬', like: '❤️', report_reply: '📋', suspicious_content: '⚠️' }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        {activeConv ? (
          <>
            <button className={styles.backBtn} onClick={() => setActiveConv(null)}>←</button>
            <div className={styles.convHeader}>
              {activeConv.otherUser?.photoURL
                ? <img src={optimizeUrl(activeConv.otherUser.photoURL, { width: 60 })} alt="" className="avatar avatar-sm" />
                : <div className={styles.avatarFb}>{(activeConv.otherUser?.displayName || 'U')[0]}</div>
              }
              <span>{activeConv.otherUser?.displayName || 'Usuario'}</span>
            </div>
          </>
        ) : (
          <>
            <h3 className={styles.title}>Bandeja de entrada</h3>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </>
        )}
      </div>

      {/* Tabs (solo si no hay conversación activa) */}
      {!activeConv && (
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${tab === 'notifs' ? styles.tabActive : ''}`}
            onClick={() => setTab('notifs')}
          >
            🔔 Actividad
            {unreadNotifs > 0 && <span className={styles.tabBadge}>{unreadNotifs}</span>}
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'messages' ? styles.tabActive : ''}`}
            onClick={() => setTab('messages')}
          >
            ✉️ Mensajes
            {totalUnreadDMs > 0 && <span className={styles.tabBadge}>{totalUnreadDMs}</span>}
          </button>
        </div>
      )}

      {/* NOTIFICACIONES */}
      {!activeConv && tab === 'notifs' && (
        <div className={styles.body}>
          {unreadNotifs > 0 && (
            <button className={styles.markAllBtn}
              onClick={() => markAllNotificationsRead(user.uid)}>
              ✓ Marcar todas como leídas
            </button>
          )}
          {notifications.length === 0 ? (
            <div className={styles.empty}>
              <span style={{ fontSize: '2.5rem' }}>🔔</span>
              <p>Sin notificaciones aún</p>
            </div>
          ) : notifications.map(n => (
            <div
              key={n.id}
              className={`${styles.notifItem} ${!n.read ? styles.unread : ''}`}
              onClick={() => handleNotifClick(n)}
            >
              <div className={styles.notifIcon}>{notifIcon[n.type] || '📢'}</div>
              <div className={styles.notifContent}>
                <p className={styles.notifMsg}>
                  {n.fromUsername && <strong>{n.fromUsername} </strong>}
                  {n.message}
                </p>
                {n.createdAt?.toDate && (
                  <span className={styles.notifTime}>
                    {formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: es })}
                  </span>
                )}
              </div>
              {!n.read && <div className={styles.unreadDot} />}
            </div>
          ))}
        </div>
      )}

      {/* LISTA DE CONVERSACIONES */}
      {!activeConv && tab === 'messages' && (
        <div className={styles.body}>
          {conversations.length === 0 ? (
            <div className={styles.empty}>
              <span style={{ fontSize: '2.5rem' }}>✉️</span>
              <p>Sin mensajes aún</p>
              <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                Visita un perfil para enviar un mensaje
              </p>
            </div>
          ) : conversations.map(conv => (
            <ConvItem
              key={conv.id}
              conv={conv}
              myUid={user.uid}
              onClick={async (otherUid) => {
                const otherUser = await getUserProfile(otherUid).catch(() => null)
                setActiveConv({ id: conv.id, otherUser })
              }}
            />
          ))}
        </div>
      )}

      {/* CHAT DE MENSAJES PRIVADOS */}
      {activeConv && (
        <>
          <div className={styles.dmMessages}>
            {messages.length === 0 && (
              <div className={styles.empty}>
                <p>Sé el primero en decir algo 👋</p>
              </div>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`${styles.dmBubble} ${msg.senderId === user.uid ? styles.dmOwn : styles.dmOther}`}
              >
                <span>{msg.text}</span>
                {msg.createdAt?.toDate && (
                  <span className={styles.dmTime}>
                    {formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: es })}
                  </span>
                )}
              </div>
            ))}
            <div ref={msgBottomRef} />
          </div>

          {/* Input */}
          <form className={styles.dmInput} onSubmit={handleSendDM}>
            <input
              className="inp"
              placeholder="Escribe un mensaje..."
              value={dmText}
              onChange={e => setDmText(e.target.value)}
              maxLength={1000}
              disabled={dmSending}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" type="submit"
              disabled={dmSending || !dmText.trim()}>
              {dmSending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '➤'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

// ─── ITEM DE CONVERSACIÓN ───
function ConvItem({ conv, myUid, onClick }) {
  const otherId = conv.participants?.find(p => p !== myUid)
  const [otherUser, setOtherUser] = useState(null)
  const unread = conv.unread?.[myUid] || 0

  useEffect(() => {
    if (otherId) getUserProfile(otherId).then(setOtherUser).catch(() => {})
  }, [otherId])

  const time = conv.lastMessageAt?.toDate
    ? formatDistanceToNow(conv.lastMessageAt.toDate(), { locale: es })
    : ''

  return (
    <div className={styles.convItem} onClick={() => onClick(otherId)}>
      {otherUser?.photoURL
        ? <img src={optimizeUrl(otherUser.photoURL, { width: 80 })} alt="" className="avatar avatar-md" />
        : <div className={styles.avatarFb}>{(otherUser?.displayName || 'U')[0]}</div>
      }
      <div className={styles.convInfo}>
        <div className={styles.convName}>{otherUser?.displayName || 'Usuario'}</div>
        <div className={styles.convLast}>{conv.lastMessage || 'Sin mensajes aún'}</div>
      </div>
      <div className={styles.convMeta}>
        <span className={styles.convTime}>{time}</span>
        {unread > 0 && <span className={styles.convUnread}>{unread}</span>}
      </div>
    </div>
  )
}
