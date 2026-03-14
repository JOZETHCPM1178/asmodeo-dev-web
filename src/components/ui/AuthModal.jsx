// src/components/ui/AuthModal.jsx
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { registerWithEmail, loginWithEmail, loginWithGoogle, resetPassword } from '../../services/auth'
import styles from './AuthModal.module.css'

export default function AuthModal({ initialMode = 'login', onClose }) {
  const [mode, setMode] = useState(initialMode) // 'login' | 'register' | 'reset'
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', username: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await loginWithEmail(form.email, form.password)
        toast.success('¡Bienvenido de vuelta!')
      } else if (mode === 'register') {
        if (form.username.length < 3) throw new Error('El nombre debe tener al menos 3 caracteres')
        await registerWithEmail(form.email, form.password, form.username)
        toast.success('¡Cuenta creada! Bienvenido 🎉')
      } else if (mode === 'reset') {
        await resetPassword(form.email)
        toast.success('Correo de recuperación enviado')
        setMode('login')
        setLoading(false)
        return
      }
      onClose()
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Este email ya está en uso',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email': 'Email inválido',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento',
      }
      toast.error(msgs[err.code] || err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    try {
      await loginWithGoogle()
      toast.success('¡Bienvenido!')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Error con Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>ASMODEO<span>DEV</span></div>
          <button className="btn-icon btn" onClick={onClose}>✕</button>
        </div>

        <h2 className={styles.title}>
          {mode === 'login' && '👋 Iniciar sesión'}
          {mode === 'register' && '🚀 Crear cuenta'}
          {mode === 'reset' && '🔑 Recuperar contraseña'}
        </h2>

        {/* Google */}
        {mode !== 'reset' && (
          <button className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>
        )}

        {mode !== 'reset' && <div className={styles.divider}><span>o</span></div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === 'register' && (
            <div className="inp-group">
              <label className="inp-label">Nombre de usuario</label>
              <input
                className="inp"
                type="text"
                placeholder="CoolGamer123"
                value={form.username}
                onChange={e => set('username', e.target.value)}
                required minLength={3} maxLength={30}
              />
            </div>
          )}

          <div className="inp-group">
            <label className="inp-label">Email</label>
            <input
              className="inp"
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
            />
          </div>

          {mode !== 'reset' && (
            <div className="inp-group">
              <label className="inp-label">Contraseña</label>
              <input
                className="inp"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required minLength={6}
              />
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : (
              mode === 'login' ? 'Entrar' :
              mode === 'register' ? 'Crear cuenta' :
              'Enviar correo de recuperación'
            )}
          </button>
        </form>

        {/* Links */}
        <div className={styles.links}>
          {mode === 'login' && (
            <>
              <button className={styles.link} onClick={() => setMode('reset')}>¿Olvidaste tu contraseña?</button>
              <span>·</span>
              <button className={styles.link} onClick={() => setMode('register')}>Crear cuenta</button>
            </>
          )}
          {mode === 'register' && (
            <>
              <span>¿Ya tienes cuenta?</span>
              <button className={styles.link} onClick={() => setMode('login')}>Inicia sesión</button>
            </>
          )}
          {mode === 'reset' && (
            <button className={styles.link} onClick={() => setMode('login')}>← Volver</button>
          )}
        </div>
      </div>
    </div>
  )
}
