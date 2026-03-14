// src/components/ui/NotificationBell.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { markNotificationRead } from '../../services/social'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import styles from './NotificationBell.module.css'

export default function NotificationBell({ notifications, unreadCount, onMarkRead }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleNotifClick(notif) {
    if (!notif.read) await markNotificationRead(notif.id)
    if (notif.postId) navigate(`/post/${notif.postId}`)
    else if (notif.fromUserId) navigate(`/profile/${notif.fromUserId}`)
    setOpen(false)
  }

  const typeIcon = {
    follow: '👤',
    comment: '💬',
    like: '❤️',
    suspicious_content: '⚠️',
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button className={styles.bell} onClick={() => { setOpen(o => !o); if (unreadCount > 0) onMarkRead() }}>
        🔔
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span>Notificaciones</span>
            {unreadCount > 0 && (
              <button className={styles.markAll} onClick={onMarkRead}>Marcar todas</button>
            )}
          </div>

          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>Sin notificaciones</div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                className={`${styles.item} ${!n.read ? styles.unread : ''}`}
                onClick={() => handleNotifClick(n)}
              >
                <span className={styles.icon}>{typeIcon[n.type] || '📢'}</span>
                <div className={styles.content}>
                  <div className={styles.msg}>
                    {n.fromUsername && <strong>{n.fromUsername} </strong>}
                    {n.message}
                  </div>
                  {n.createdAt && (
                    <div className={styles.time}>
                      {formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: es })}
                    </div>
                  )}
                </div>
                {!n.read && <div className={styles.dot} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
