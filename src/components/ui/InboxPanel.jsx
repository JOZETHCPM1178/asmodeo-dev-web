// src/components/ui/InboxPanel.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { markNotificationRead, markAllNotificationsRead, subscribeToChatMessages, sendChatMessage, getChatStatus } from '../../services/social'
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

  // Chat global state
  const [chatMsgs, setChatMsgs]       = useState([])
  const [chatText, setChatText]       = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [chatClosed, setChatClosed]   = useState(false)
  const [chatUnread, setChatUnread]   = useState(0)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionList, setMentionList]   = useState([])
  const [mentionIndex, setMentionIndex] = useState(0)

  const msgBottomRef    = useRef(null)
  const chatBottomRef   = useRef(null)
  const inputRef        = useRef(null)
  const chatInputRef    = useRef(null)
  const unsubMsgsRef    = useRef(null)
  const lastSeenChatRef = useRef(null)
  const chatInitRef     = useRef(false)

  // Suscribir DMs
  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeToConversations(user.uid, convs => {
      setConversations(convs)
      setTotalUnreadDMs(getTotalUnread(convs, user.uid))
    })
    return unsub
  }, [user?.uid])

  // Suscribir Chat Global
  useEffect(() => {
    getChatStatus().then(setChatClosed).catch(() => {})
    const unsub = subscribeToChatMessages(msgs => {
      setChatMsgs(msgs)
      if (!chatInitRef.current) {
        if (msgs.length > 0) lastSeenChatRef.current = msgs[msgs.length - 1]?.id
        chatInitRef.current = true
        return
      }
      if (tab !== 'chat' && msgs.length > 0) {
        const lastId = msgs[msgs.length - 1]?.id
        if (lastId && lastId !== lastSeenChatRef.current) {
          const idx = msgs.findIndex(m => m.id === lastSeenChatRef.current)
          const newCount = idx === -1 ? 0 : msgs.length - 1 - idx
          if (newCount > 0) setChatUnread(c => c + newCount)
          lastSeenChatRef.current = lastId
        }
      }
    })
    return unsub
  }, [])

  // Cuando cambia a tab chat — marcar como leídos
  useEffect(() => {
    if (tab === 'chat') {
      setChatUnread(0)
      if (chatMsgs.length > 0) lastSeenChatRef.current = chatMsgs[chatMsgs.length - 1]?.id
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [tab])

  // Scroll chat al fondo cuando llegan mensajes
  useEffect(() => {
    if (tab === 'chat') {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
    }
  }, [chatMsgs.length])

  // Suscribir mensajes DM
  useEffect(() => {
    if (unsubMsgsRef.current) { unsubMsgsRef.current(); unsubMsgsRef.current = null }
    if (!activeConv?.id || !user?.uid) return
    unsubMsgsRef.current = subscribeToDMMessages(activeConv.id, msgs => {
      setMessages(msgs)
      setTimeout(() => msgBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    })
    markDMsRead(activeConv.id, user.uid).catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 100)
    return () => { if (unsubMsgsRef.current) unsubMsgsRef.current() }
  }, [activeConv?.id, user?.uid])

  // ─── ENVIAR DM ───
  async function handleSendDM(e) {
    e?.preventDefault()
    if (!dmText.trim() || !activeConv) return
    const blocked = await isBlocked(user.uid, activeConv.otherUser?.uid).catch(() => false)
    if (blocked) { toast.error('Has bloqueado a este usuario'); return }
    setDmSending(true)
    const text = dmText.trim()
    setDmText('')
    try { await sendDM(activeConv.id, user.uid, text, 'text') }
    catch (err) { setDmText(text); toast.error(err.message || 'Error') }
    finally { setDmSending(false); inputRef.current?.focus() }
  }

  // ─── ENVIAR STICKER DM ───
  async function handleSendSticker(sticker) {
    setShowDMStickers(false)
    if (!activeConv) return
    try { await sendDM(activeConv.id, user.uid, sticker.url, 'sticker') }
    catch (err) { toast.error(err.message || 'Error') }
  }

  // ─── BLOQUEAR ───
  async function handleBlock() {
    if (!activeConv?.otherUser?.uid) return
    const otherId = activeConv.otherUser.uid
    const blocked = await isBlocked(user.uid, otherId)
    try {
      if (blocked) { await unblockUser(user.uid, otherId); toast.success('Usuario desbloqueado') }
      else {
        if (!window.confirm(`¿Bloquear a ${activeConv.otherUser.displayName}?`)) return
        await blockUser(user.uid, otherId); toast.success('Usuario bloqueado 🚫')
      }
    } catch (e) { toast.error(e.message) }
  }

  // ─── CHAT GLOBAL: detectar @ ───
  function handleChatInput(e) {
    const val = e.target.value
    setChatText(val)
    const cursorPos = e.target.selectionStart
    const textUpToCursor = val.slice(0, cursorPos)
    const atMatch = textUpToCursor.match(/@(\w*)$/)
    if (atMatch) {
      const query = atMatch[1].toLowerCase()
      const seen = new Set()
      const users = chatMsgs
        .filter(m => m.userId !== user?.uid)
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

  function insertMention(username) {
    const cursorPos = chatInputRef.current?.selectionStart || chatText.length
    const textUpToCursor = chatText.slice(0, cursorPos)
    const atMatch = textUpToCursor.match(/@(\w*)$/)
    if (atMatch) {
      const before = chatText.slice(0, cursorPos - atMatch[0].length)
      const after  = chatText.slice(cursorPos)
      const newText = `${before}@${username} ${after}`
      setChatText(newText)
      setTimeout(() => {
        const newPos = before.length + username.length + 2
        chatInputRef.current?.setSelectionRange(newPos, newPos)
        chatInputRef.current?.focus()
      }, 10)
    }
    setShowMentions(false)
  }

  function handleChatKeyDown(e) {
    if (showMentions) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i+1, mentionList.length-1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i-1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (mentionList[mentionIndex]) insertMention(mentionList[mentionIndex].username); return }
      if (e.key === 'Escape')    { setShowMentions(false); return }
    }
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) { e.preventDefault(); handleSendChat(e) }
  }

  // ─── ENVIAR CHAT GLOBAL ───
  async function handleSendChat(e) {
    e?.preventDefault()
    if (!user) { toast.error('Inicia sesión para chatear'); return }
    if (!chatText.trim()) return
    setChatSending(true)
    const text = chatText.trim()
    setChatText('')
    setShowMentions(false)
    try {
      await sendChatMessage({
        userId:   user.uid,
        username: user.displayName || user.username,
        photoURL: user.photoURL,
        text,
      })
    } catch (err) { setChatText(text); toast.error(err.message || 'Error') }
    finally { setChatSending(false); chatInputRef.current?.focus() }
  }

  function handleNotifClick(notif) {
    if (!notif.read) markNotificationRead(notif.id).catch(() => {})
    if (notif.postId) { navigate(`/post/${notif.postId}`); onClose() }
    else if (notif.fromUserId) { navigate(`/profile/${notif.fromUserId}`); onClose() }
  }

  const unreadActivity = notifications.filter(n => !n.read).length

  function renderMentions(text) {
    if (!text) return text
    const myUsername = user?.displayName || user?.username
    return text.split(/(@\w+)/g).map((part, i) => {
      if (!part.startsWith('@')) return part
      const isMe = part.slice(1).toLowerCase() === myUsername?.toLowerCase()
      return <span key={i} className={`${styles.mention} ${isMe ? styles.mentionMe : ''}`}>{part}</span>
    })
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>

        {/* ── HEADER ── */}
        <div className={styles.header}>
          {activeConv ? (
            <>
              <button className={styles.backBtn} onClick={() => { setActiveConv(null); setMessages([]) }}>←</button>
              <div className={styles.convHeaderInfo}>
                {activeConv.otherUser?.photoURL
                  ? <img src={optimizeUrl(activeConv.otherUser.photoURL, { width: 60 })} alt="" className="avatar avatar-sm" />
                  : <div className={styles.avatarFb}>{(activeConv.otherUser?.displayName || 'U')[0]}</div>
                }
                <div className={styles.convHeaderName}>{activeConv.otherUser?.displayName || 'Usuario'}</div>
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

        {/* ── TABS (solo sin conversación activa) ── */}
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
            <button className={`${styles.tab} ${tab === 'chat' ? styles.tabActive : ''}`}
              onClick={() => setTab('chat')}>
              💬 Chat
              {chatUnread > 0 && <span className={styles.tabBadge}>{chatUnread > 9 ? '9+' : chatUnread}</span>}
            </button>
          </div>
        )}

        {/* ── ACTIVIDAD ── */}
        {!activeConv && tab === 'activity' && (
          <div className={styles.body}>
            {unreadActivity > 0 && (
              <button className={styles.markAllBtn} onClick={() => markAllNotificationsRead(user.uid)}>
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

        {/* ── MENSAJES (lista conversaciones) ── */}
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

        {/* ── CHAT GLOBAL (nueva pestaña) ── */}
        {!activeConv && tab === 'chat' && (
          <div className={styles.chatGlobalWrap}>
            {/* Estado en vivo */}
            <div className={styles.chatGlobalStatus}>
              {chatClosed
                ? <span className={styles.closedTag}>🔒 Chat cerrado</span>
                : <span className={styles.liveTag}>● En vivo</span>
              }
            </div>

            {/* Mensajes */}
            <div className={styles.chatGlobalMessages}>
              {chatMsgs.length === 0
                ? <EmptyState icon="💬" text="¡Sé el primero en escribir!" />
                : chatMsgs.map(msg => {
                  const isOwn = msg.userId === user?.uid
                  return (
                    <div key={msg.id} className={`${styles.chatMsg} ${isOwn ? styles.chatMsgOwn : ''}`}>
                      {!isOwn && (
                        <div className={styles.chatAvatar}
                          onClick={() => { setChatText(t => `${t}@${msg.username} `); chatInputRef.current?.focus() }}
                          title={`Mencionar a ${msg.username}`}>
                          {msg.photoURL
                            ? <img src={optimizeUrl(msg.photoURL, { width: 40 })} alt="" className="avatar avatar-sm" style={{ cursor: 'pointer' }} />
                            : <div className={styles.avatarFb}>{(msg.username || 'U')[0]}</div>
                          }
                        </div>
                      )}
                      <div className={styles.chatMsgContent}>
                        {!isOwn && (
                          <button className={styles.chatMsgUser}
                            onClick={() => { setChatText(t => `${t}@${msg.username} `); chatInputRef.current?.focus() }}>
                            {msg.username}
                          </button>
                        )}
                        <div className={`${styles.chatBubble} ${isOwn ? styles.chatBubbleOwn : styles.chatBubbleOther}`}>
                          {renderMentions(msg.text)}
                        </div>
                        {msg.createdAt?.toDate && (
                          <span className={styles.chatMsgTime}>
                            {formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              }
              <div ref={chatBottomRef} />
            </div>

            {/* Input chat global */}
            {chatClosed ? (
              <div className={styles.closedNotice}>🔒 El chat está cerrado temporalmente</div>
            ) : (
              <div className={styles.chatGlobalInput}>
                {/* Dropdown menciones */}
                {showMentions && mentionList.length > 0 && (
                  <div className={styles.mentionDropdown}>
                    <div className={styles.mentionHint}>Usuarios en el chat</div>
                    {mentionList.map((u, i) => (
                      <button key={u.userId}
                        className={`${styles.mentionItem} ${i === mentionIndex ? styles.mentionActive : ''}`}
                        onMouseDown={e => { e.preventDefault(); insertMention(u.username) }}>
                        {u.photoURL
                          ? <img src={optimizeUrl(u.photoURL, { width: 40 })} alt="" className={styles.mentionAvatar} />
                          : <div className={styles.mentionAvatarFb}>{(u.username||'U')[0]}</div>
                        }
                        <span>@{u.username}</span>
                      </button>
                    ))}
                  </div>
                )}
                <form className={styles.chatInputRow} onSubmit={handleSendChat}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      ref={chatInputRef}
                      className="inp"
                      placeholder={user ? 'Escribe... usa @ para mencionar' : 'Inicia sesión para chatear'}
                      value={chatText}
                      onChange={handleChatInput}
                      onKeyDown={handleChatKeyDown}
                      maxLength={300}
                      disabled={!user || chatSending}
                      style={{ paddingRight: '2rem', fontSize: '0.84rem' }}
                    />
                    {user && (
                      <button type="button" className={styles.atBtn}
                        onClick={() => { setChatText(t => t + '@'); chatInputRef.current?.focus() }}
                        title="Mencionar">@</button>
                    )}
                  </div>
                  {user && (
                    <button className="btn btn-primary btn-sm" type="submit"
                      disabled={chatSending || !chatText.trim()}>
                      {chatSending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '➤'}
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>
        )}

        {/* ── CHAT DM ACTIVO ── */}
        {activeConv && (
          <div className={styles.chatWrap}>
            <div className={styles.dmMessages}>
              {messages.length === 0 && <EmptyState icon="👋" text="Di hola! 👋" />}
              {messages.map(msg => {
                const isOwn = msg.senderId === user.uid
                const isSticker = msg.type === 'sticker' || isGiphyUrl(msg.text)
                return (
                  <div key={msg.id} className={`${styles.bubbleRow} ${isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther}`}>
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

            <div className={styles.dmInputArea}>
              {showDMStickers && (
                <StickerPicker onSelect={handleSendSticker} onClose={() => setShowDMStickers(false)} />
              )}
              <form className={styles.dmInputRow} onSubmit={handleSendDM}>
                <button type="button"
                  className={`${styles.dmStickerBtn} ${showDMStickers ? styles.dmStickerBtnActive : ''}`}
                  onClick={() => setShowDMStickers(o => !o)} title="Stickers">🎭</button>
                <input
                  ref={inputRef}
                  className={styles.dmInput}
                  placeholder="Escribe un mensaje..."
                  value={dmText}
                  onChange={e => setDmText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDM(e) } }}
                  maxLength={1000}
                  disabled={dmSending}
                  autoComplete="off"
                />
                <button className="btn btn-primary btn-sm" type="submit" disabled={dmSending || !dmText.trim()}>
                  {dmSending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '➤'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Conversación row ───
function ConvRow({ conv, myUid, onClick }) {
  const otherId = conv.participants?.find(p => p !== myUid)
  const [otherUser, setOtherUser] = useState(null)
  const unread = conv.unread?.[myUid] || 0

  useEffect(() => {
    if (!otherId) return
    getUserProfile(otherId).then(setOtherUser).catch(() => {})
  }, [otherId])

  const time = conv.lastMessageAt?.toDate
    ? formatDistanceToNow(conv.lastMessageAt.toDate(), { locale: es })
    : ''

  return (
    <div className={styles.convRow} onClick={() => onClick(otherId, otherUser)}>
      {otherUser?.photoURL
        ? <img src={optimizeUrl(otherUser.photoURL, { width: 80 })} alt="" className="avatar avatar-md" />
        : <div className={styles.avatarFb}>{(otherUser?.displayName || 'U')[0]}</div>
      }
      <div className={styles.convInfo}>
        <div className={styles.convName}>{otherUser?.displayName || 'Usuario'}</div>
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
      <span style={{ fontSize: '2.2rem' }}>{icon}</span>
      <p>{text}</p>
      {sub && <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>{sub}</p>}
    </div>
  )
}
