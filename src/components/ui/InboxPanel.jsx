// src/components/ui/InboxPanel.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { markNotificationRead, markAllNotificationsRead } from '../../services/social'
import {
  subscribeToConversations, subscribeToDMMessages,
  sendDM, markDMsRead, getTotalUnread,
  blockUser, unblockUser, isBlocked,
} from '../../services/dm'
import { getUserProfile } from '../../services/auth'
import { optimizeUrl } from '../../services/cloudinary'
import StickerPicker from './StickerPicker'
import styles from './InboxPanel.module.css'

const NOTIF_ICON = {
  follow: '👤', comment: '💬', like: '❤️',
  report_reply: '📋', suspicious_content: '⚠️',
}

// Detecta si un texto es URL de sticker Giphy
function isGiphyUrl(text) {
  return typeof text === 'string' && text.includes('giphy.com') && text.endsWith('.gif')
}

export default function InboxPanel({ notifications = [], onClose }) {
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [tab, setTab]                       = useState('activity')
  const [conversations, setConversations]   = useState([])
  const [activeConv, setActiveConv]         = useState(null)
  const [messages, setMessages]             = useState([])
  const [dmText, setDmText]                 = useState('')
  const [dmSending, setDmSending]           = useState(false)
  const [totalUnreadDMs, setTotalUnreadDMs] = useState(0)
  const [showDMStickers, setShowDMStickers] = useState(false)

  const msgBottomRef = useRef(null)
  const inputRef     = useRef(null)
  const unsubMsgsRef = useRef(null)

  // Suscribir conversaciones
  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeToConversations(user.uid, convs => {
      setConversations(convs)
      setTotalUnreadDMs(getTotalUnread(convs, user.uid))
    })
    return unsub
  }, [user?.uid])

  // Suscribir mensajes — tiempo real
  useEffect(() => {
    if (unsubMsgsRef.current) { unsubMsgsRef.current(); unsubMsgsRef.current = null }
    if (!activeConv?.id || !user?.uid) return

    unsubMsgsRef.current = subscribeToDMMessages(activeConv.id, msgs => {
      setMessages(msgs)
      // Scroll al fondo automático siempre
      setTimeout(() => {
        msgBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    })

    markDMsRead(activeConv.id, user.uid).catch(() => {})
    // Focus al input
    setTimeout(() => inputRef.current?.focus(), 100)

    return () => { if (unsubMsgsRef.current) unsubMsgsRef.current() }
  }, [activeConv?.id, user?.uid])

  // Scroll al fondo cuando abres una conv
  useEffect(() => {
    if (activeConv && messages.length > 0) {
      setTimeout(() => msgBottomRef.current?.scrollIntoView({ behavior: 'instant' }), 100)
    }
  }, [activeConv?.id])

  async function handleSendDM(e) {
    e?.preventDefault()
    if (!dmText.trim() || !activeConv) return
    const blocked = await isBlocked(user.uid, activeConv.otherUser?.uid).catch(() => false)
    if (blocked) { toast.error('Has bloqueado a este usuario'); return }
    setDmSending(true)
    const text = dmText.trim()
    setDmText('') // limpiar inmediatamente para UX fluida
    try {
      await sendDM(activeConv.id, user.uid, text, 'text')
    } catch (err) {
      setDmText(text) // restaurar si falló
      toast.error(err.message || 'Error')
    } finally {
      setDmSending(false)
      inputRef.current?.focus()
    }
  }

  async function handleSendSticker(sticker) {
    setShowDMStickers(false)
    if (!activeConv) return
    try {
      await sendDM(activeConv.id, user.uid, sticker.url, 'sticker')
    } catch (err) {
      toast.error(err.message || 'Error al enviar sticker')
    }
  }

  async function handleBlock() {
    if (!activeConv?.otherUser?.uid) return
    const otherId = activeConv.otherUser.uid
    const blocked = await isBlocked(user.uid, otherId)
    try {
      if (blocked) {
        await unblockUser(user.uid, otherId)
        toast.success('Usuario desbloqueado')
      } else {
        if (!window.confirm(`¿Bloquear a ${activeConv.otherUser.displayName}?`)) return
        await blockUser(user.uid, otherId)
        toast.success('Usuario bloqueado 🚫')
      }
    } catch (e) { toast.error(e.message) }
  }

  function handleNotifClick(notif) {
    if (!notif.read) markNotificationRead(notif.id).catch(() => {})
    if (notif.postId)       { navigate(`/post/${notif.postId}`);       onClose() }
    else if (notif.fromUserId) { navigate(`/profile/${notif.fromUserId}`); onClose() }
  }

  const unreadActivity = notifications.filter(n => !n.read).length

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>

        {/* ── HEADER ── */}
        <div className={styles.header}>
          {activeConv ? (
            <>
              <button className={styles.backBtn} onClick={() => {
                setActiveConv(null)
                setMessages([])
                setShowDMStickers(false)
              }}>←</button>
              <div className={styles.convHeaderInfo}>
                {activeConv.otherUser?.photoURL
                  ? <img src={optimizeUrl(activeConv.otherUser.photoURL, { width: 60 })} alt="" className="avatar avatar-sm" />
                  : <div className={styles.avatarFb}>{(activeConv.otherUser?.displayName || 'U')[0]}</div>
                }
                <div className={styles.convHeaderName}>
                  {activeConv.otherUser?.displayName || 'Usuario'}
                </div>
              </div>
              <button className={styles.blockBtn} onClick={handleBlock} title="Bloquear">🚫</button>
            </>
          ) : (
            <>
              <h2 className={styles.panelTitle}>Bandeja de entrada</h2>
              <button className={styles.closeBtn} onClick={onClose}>✕</button>
            </>
          )}
        </div>

        {/* ── TABS ── */}
        {!activeConv && (
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'activity' ? styles.tabActive : ''}`}
              onClick={() => setTab('activity')}>
              🔔 Actividad
              {unreadActivity > 0 && <span className={styles.tabBadge}>{unreadActivity}</span>}
            </button>
            <button className={`${styles.tab} ${tab === 'messages' ? styles.tabActive : ''}`}
              onClick={() => setTab('messages')}>
              ✉️ Mensajes
              {totalUnreadDMs > 0 && <span className={styles.tabBadge}>{totalUnreadDMs}</span>}
            </button>
          </div>
        )}

        {/* ── ACTIVIDAD ── */}
        {!activeConv && tab === 'activity' && (
          <div className={styles.body}>
            {unreadActivity > 0 && (
              <button className={styles.markAllBtn}
                onClick={() => markAllNotificationsRead(user.uid)}>
                ✓ Marcar todas como leídas
              </button>
            )}
            {notifications.length === 0
              ? <EmptyState icon="🔔" text="Sin notificaciones aún" />
              : notifications.map(n => (
                <div key={n.id}
                  className={`${styles.notifRow} ${!n.read ? styles.unread : ''}`}
                  onClick={() => handleNotifClick(n)}>
                  <span className={styles.notifIcon}>{NOTIF_ICON[n.type] || '📢'}</span>
                  <div className={styles.notifBody}>
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
              ))
            }
          </div>
        )}

        {/* ── MENSAJES ── */}
        {!activeConv && tab === 'messages' && (
          <div className={styles.body}>
            {conversations.length === 0
              ? <EmptyState icon="✉️" text="Sin mensajes aún" sub="Visita un perfil para escribir" />
              : conversations.map(conv => (
                <ConvRow key={conv.id} conv={conv} myUid={user.uid}
                  onClick={(otherId, otherUser) => {
                    setActiveConv({ id: conv.id, otherUser })
                    setMessages([])
                  }}
                />
              ))
            }
          </div>
        )}

        {/* ── CHAT ACTIVO ── */}
        {activeConv && (
          <div className={styles.chatWrap}>

            {/* Mensajes — scrollable */}
            <div className={styles.dmMessages}>
              {messages.length === 0 && <EmptyState icon="👋" text="Di hola! 👋" />}
              {messages.map(msg => {
                const isOwn = msg.senderId === user.uid
                // Detectar sticker: por tipo O por URL de giphy
                const isSticker = msg.type === 'sticker' || isGiphyUrl(msg.text)
                return (
                  <div key={msg.id}
                    className={`${styles.bubbleRow} ${isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther}`}>
                    <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther} ${isSticker ? styles.bubbleSticker : ''}`}>
                      {isSticker
                        ? <img src={msg.text} alt="sticker" className={styles.stickerMsg} />
                        : <span className={styles.bubbleText}>{msg.text}</span>
                      }
                      {msg.createdAt?.toDate && (
                        <span className={styles.bubbleTime}>
                          {formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: es })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={msgBottomRef} style={{ height: 1 }} />
            </div>

            {/* Input — siempre visible al fondo */}
            <div className={styles.dmInputArea}>
              {showDMStickers && (
                <StickerPicker
                  onSelect={handleSendSticker}
                  onClose={() => setShowDMStickers(false)}
                />
              )}
              <form className={styles.dmInputRow} onSubmit={handleSendDM}>
                <button
                  type="button"
                  className={`${styles.dmStickerBtn} ${showDMStickers ? styles.dmStickerBtnActive : ''}`}
                  onClick={() => setShowDMStickers(o => !o)}
                  title="Stickers"
                >
                  🎭
                </button>
                <input
                  ref={inputRef}
                  className={styles.dmInput}
                  placeholder="Escribe un mensaje..."
                  value={dmText}
                  onChange={e => setDmText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDM(e) }
                  }}
                  maxLength={1000}
                  disabled={dmSending}
                  autoComplete="off"
                />
                <button
                  className="btn btn-primary btn-sm"
                  type="submit"
                  disabled={dmSending || !dmText.trim()}
                >
                  {dmSending
                    ? <span className="spinner" style={{ width: 14, height: 14 }} />
                    : '➤'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── FILA DE CONVERSACIÓN ──
function ConvRow({ conv, myUid, onClick }) {
  const otherId   = conv.participants?.find(p => p !== myUid)
  const [other, setOther] = useState(null)
  const unread    = conv.unread?.[myUid] || 0

  useEffect(() => {
    if (!otherId) return
    getUserProfile(otherId).then(setOther).catch(() => {})
  }, [otherId])

  const time = conv.lastMessageAt?.toDate
    ? formatDistanceToNow(conv.lastMessageAt.toDate(), { locale: es })
    : ''

  return (
    <div className={styles.convRow} onClick={() => onClick(otherId, other)}>
      {other?.photoURL
        ? <img src={optimizeUrl(other.photoURL, { width: 80 })} alt="" className="avatar avatar-md" />
        : <div className={styles.avatarFb}>{(other?.displayName || 'U')[0]}</div>
      }
      <div className={styles.convInfo}>
        <div className={styles.convName}>{other?.displayName || 'Usuario'}</div>
        <div className={styles.convLast}>{conv.lastMessage || 'Sin mensajes'}</div>
      </div>
      <div className={styles.convMeta}>
        <span className={styles.convTime}>{time}</span>
        {unread > 0 && <span className={styles.convBadge}>{unread}</span>}
      </div>
    </div>
  )
}

function EmptyState({ icon, text, sub }) {
  return (
    <div className={styles.emptyState}>
      <span style={{ fontSize: '2.5rem' }}>{icon}</span>
      <p>{text}</p>
      {sub && <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>{sub}</p>}
    </div>
  )
}
