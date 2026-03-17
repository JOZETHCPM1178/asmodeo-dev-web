// src/pages/ProfilePage.jsx
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { getUserProfile, updateUserProfile } from '../services/auth'
import { getUserPosts, updateAuthorNameInPosts } from '../services/posts'
import { useAuth } from '../context/AuthContext'
import FollowButton from '../components/social/FollowButton'
import PostCard from '../components/feed/PostCard'
import { uploadAvatar, optimizeUrl } from '../services/cloudinary'
import { getOrCreateConversation } from '../services/dm'
import VerifiedBadge from '../components/ui/VerifiedBadge'
import SEO from '../components/ui/SEO'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { uid } = useParams()
  const { user: me, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile]     = useState(null)
  const [posts, setPosts]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [followers, setFollowers] = useState(0)
  const [showEdit, setShowEdit]   = useState(false)
  const [dmLoading, setDmLoading] = useState(false)

  const isOwn = me?.uid === uid

  async function loadProfile() {
    setLoading(true)
    try {
      const [p, userPosts] = await Promise.all([
        getUserProfile(uid),
        getUserPosts(uid),
      ])
      setProfile(p)
      setPosts(userPosts)
      setFollowers(p?.followers || 0)
    } catch (e) {
      toast.error('Error cargando perfil')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfile() }, [uid])

  async function handleSendDM() {
    if (!me) { toast.error('Inicia sesión para enviar mensajes'); return }
    setDmLoading(true)
    try {
      const convId = await getOrCreateConversation(me.uid, uid)
      // Navegar directo al chat con teclado abierto
      navigate(`/messages/${convId}`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDmLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
      <span className="spinner spinner-lg" />
    </div>
  )

  if (!profile) return (
    <div className="empty" style={{ paddingTop: '5rem' }}>
      <div className="empty-icon">👤</div>
      <h3>Perfil no encontrado</h3>
    </div>
  )

  return (
    <div className={styles.page}>
      <SEO
        title={profile.displayName || profile.username}
        description={profile.bio || `Perfil de ${profile.displayName || profile.username} en AsmodeoDev. ${posts.length} publicaciones.`}
        url={`/profile/${uid}`}
        keywords={`${profile.displayName}, apk mod, perfil, asmodeoDev`}
      />
      <div className={styles.banner} />
      <div className={styles.inner}>
        <div className={styles.profileCard}>

          {/* Avatar */}
          <div className={styles.avatarWrap}>
            {profile.photoURL
              ? <img src={optimizeUrl(profile.photoURL, { width: 200, height: 200 })} alt="" className={styles.avatar} />
              : <div className={styles.avatarFb}>{(profile.displayName || profile.username || 'U')[0].toUpperCase()}</div>
            }
            {profile.verified && (
              <div className={styles.verifiedBadge}>
                <VerifiedBadge large title="Usuario verificado" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.username}>{profile.displayName || profile.username}</h1>
              {profile.verified && <VerifiedBadge title="Usuario verificado" />}
              {profile.role === 'admin'    && <span className="badge badge-purple">👑 ADMIN</span>}
              {profile.role === 'admin_jr' && <span className="badge badge-cyan">🛡️ ADMIN JR</span>}
            </div>

            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statN}>{posts.length}</span>
                <span className={styles.statL}>Publicaciones</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statN}>{followers}</span>
                <span className={styles.statL}>Seguidores</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statN}>{profile.following || 0}</span>
                <span className={styles.statL}>Siguiendo</span>
              </div>
            </div>

            <div className={styles.actionRow}>
              {isOwn ? (
                <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
                  ✏️ Editar perfil
                </button>
              ) : (
                <>
                  <FollowButton targetId={uid} onChange={isNow => setFollowers(f => isNow ? f + 1 : f - 1)} />
                  {me && (
                    <button className="btn btn-ghost btn-sm" onClick={handleSendDM} disabled={dmLoading}>
                      {dmLoading
                        ? <span className="spinner" style={{ width: 14, height: 14 }} />
                        : '✉️ Mensaje'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className={styles.postsSection}>
          <h2 className={styles.postsTitle}>📝 Publicaciones ({posts.length})</h2>
          {posts.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <h3>Sin publicaciones aún</h3>
            </div>
          ) : (
            <div className="grid-auto">
              {posts.map(p => <PostCard key={p.id} post={p} compact />)}
            </div>
          )}
        </div>
      </div>

      {/* Modal editar perfil */}
      {showEdit && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false)
            await loadProfile()
            await refreshUser?.()
          }}
        />
      )}
    </div>
  )
}

// ─── VINCULAR TELEGRAM ───
function TelegramLinkSection({ uid, profile }) {
  const [linked,   setLinked]  = useState(!!profile?.telegramId)
  const [code,     setCode]    = useState('')
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState('')
  const WORKER_URL = import.meta.env.VITE_WORKER_URL

  async function handleVerify() {
    const c = code.trim()
    if (c.length !== 6 || !/^\d{6}$/.test(c)) {
      setError('El código debe ser de 6 dígitos numéricos.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res  = await fetch(`${WORKER_URL}/verify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, code: c }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error || 'Código incorrecto.'); return }

      await updateUserProfile(uid, {
        telegramId:   data.telegramId,
        telegramName: data.telegramName,
      })
      setLinked(true)
      setCode('')
      toast.success('✅ Telegram vinculado correctamente')
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(0,136,204,.08)', border: '1px solid rgba(0,136,204,.25)',
      borderRadius: 'var(--r)', padding: '0.9rem',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.55rem' }}>
        <span style={{ fontSize:'1.1rem' }}>✈️</span>
        <span style={{ fontWeight:700, fontSize:'0.88rem' }}>Vincular Telegram</span>
        {linked && <span className="badge badge-cyan" style={{ fontSize:'0.65rem', marginLeft:'auto' }}>✓ Vinculado</span>}
      </div>

      {linked ? (
        <p style={{ fontSize:'0.8rem', color:'var(--t2)', margin:0 }}>
          Tu Telegram está vinculado. Usa <strong>/subir</strong> en el bot para publicar apps.
        </p>
      ) : (
        <>
          <p style={{ fontSize:'0.8rem', color:'var(--t2)', margin:'0 0 0.7rem' }}>
            Escribe <strong>/login</strong> en el bot y recibe un código de 6 dígitos.
          </p>

          {/* Botón abrir bot */}
          <a href="https://t.me/asmodeoDEVbot" target="_blank" rel="noopener noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:'0.4rem', padding:'0.4rem 0.8rem', background:'rgba(0,136,204,.15)', border:'1px solid rgba(0,136,204,.3)', borderRadius:'var(--r)', color:'var(--cyan)', fontSize:'0.8rem', fontWeight:600, textDecoration:'none', marginBottom:'0.75rem' }}>
            ✈️ Abrir @asmodeoDEVbot
          </a>

          {/* Input código */}
          <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
            <input
              className="inp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Código de 6 dígitos"
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              disabled={loading}
              style={{ flex:1, letterSpacing:'0.25em', fontWeight:700, textAlign:'center', fontSize:'1.1rem' }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              style={{ whiteSpace:'nowrap' }}>
              {loading
                ? <span className="spinner" style={{ width:14, height:14 }} />
                : 'Vincular'}
            </button>
          </div>

          {error && (
            <p style={{ fontSize:'0.78rem', color:'var(--red, #ef4444)', marginTop:'0.4rem', margin:'0.4rem 0 0' }}>
              ⚠️ {error}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function EditProfileModal({ profile, onClose, onSaved }) {
  const { user } = useAuth()
  const fileRef  = useRef(null)
  const [form, setForm] = useState({
    displayName: profile.displayName || profile.username || '',
    bio:         profile.bio || '',
  })
  const [avatarFile, setAvatarFile]       = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile.photoURL || null)
  const [saving, setSaving]               = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagen máx 5MB'); return }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!form.displayName.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setSaving(true)
    try {
      const updates = {
        displayName: form.displayName.trim(),
        username:    form.displayName.trim(),
        bio:         form.bio.trim(),
      }

      if (avatarFile) {
        const result = await uploadAvatar(avatarFile)
        updates.photoURL = result.url
      }

      // 1. Actualizar perfil en Firestore + Firebase Auth
      await updateUserProfile(user.uid, updates)

      // 2. Actualizar nombre/foto en todos sus posts para que se vean actualizados
      await updateAuthorNameInPosts(
        user.uid,
        updates.displayName,
        updates.photoURL || profile.photoURL
      )

      toast.success('Perfil actualizado ✅')
      onSaved()
    } catch (err) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box ${styles.editModal}`}>
        <div className={styles.editHeader}>
          <h2 className={styles.editTitle}>✏️ Editar perfil</h2>
          <button className="btn btn-icon btn" onClick={onClose}>✕</button>
        </div>

        {/* Avatar */}
        <div className={styles.avatarEdit}>
          <div className={styles.avatarEditImg} onClick={() => fileRef.current?.click()}>
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" className={styles.avatarPreview} />
              : <div className={styles.avatarFbLg}>{(form.displayName || 'U')[0].toUpperCase()}</div>
            }
            <div className={styles.avatarOverlay}>📷</div>
          </div>
          <div className={styles.avatarEditHint}>Toca para cambiar foto</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
        </div>

        {/* Campos */}
        <div className={styles.editFields}>
          <div className="inp-group">
            <label className="inp-label">Apodo (nombre visible)</label>
            <input className="inp" type="text"
              placeholder="Tu nombre en la comunidad"
              value={form.displayName}
              onChange={e => set('displayName', e.target.value)}
              maxLength={40}
            />
          </div>
          <div className="inp-group">
            <label className="inp-label">Descripción / Bio</label>
            <textarea className="inp"
              placeholder="Cuéntale a la comunidad quién eres..."
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              rows={3} maxLength={200} style={{ resize: 'none' }}
            />
            <div className={styles.charCount}>{form.bio.length}/200</div>
          </div>

          {/* Vincular Telegram */}
          <TelegramLinkSection uid={user.uid} profile={profile} />
        </div>

        {/* Botones */}
        <div className={styles.editActions}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Guardando...</>
              : '💾 Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
