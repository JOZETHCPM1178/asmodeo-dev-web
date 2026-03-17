// src/App.jsx
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import Layout from './components/ui/Layout'
import ProtectedRoute from './components/ui/ProtectedRoute'

// Pages
import HomePage from './pages/HomePage'
import FeedPage from './pages/FeedPage'
import PostDetailPage from './pages/PostDetailPage'
import ProfilePage from './pages/ProfilePage'
import UploadPage from './pages/UploadPage'
import SearchPage from './pages/SearchPage'
import AdminPage from './pages/AdminPage'
import MessagesPage from './pages/MessagesPage'
import NotFoundPage from './pages/NotFoundPage'

// ─── Página /link-telegram — Vincula la cuenta con Telegram ───
function LinkTelegramPage() {
  const { user } = useAuth()
  const [status, setStatus] = React.useState('idle') // idle | loading | success | error | noauth
  const [msg, setMsg]       = React.useState('')
  const didRun              = React.useRef(false)

  React.useEffect(() => {
    // Evitar doble ejecución en StrictMode
    if (didRun.current) return
    didRun.current = true

    async function verify() {
      if (!user) { setStatus('noauth'); return }

      const params       = new URLSearchParams(window.location.search)
      const token        = params.get('token')
      const telegramId   = params.get('tid')
      const telegramName = params.get('name') || 'Usuario'

      if (!token || !telegramId) { setStatus('error'); setMsg('Link inválido. Genera uno nuevo con /login en el bot.'); return }

      setStatus('loading')
      try {
        const workerUrl = import.meta.env.VITE_WORKER_URL
        const res  = await fetch(`${workerUrl}/verify-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, token, telegramId, telegramName }),
        })
        const data = await res.json()
        if (!data.ok) { setStatus('error'); setMsg(data.error || 'Error desconocido.'); return }

        // Guardar en Firestore
        const { updateUserProfile } = await import('./services/auth')
        await updateUserProfile(user.uid, {
          telegramId:   data.telegramId,
          telegramName: data.telegramName,
        })

        // Limpiar URL
        window.history.replaceState({}, '', window.location.pathname)
        setStatus('success')
      } catch(e) {
        setStatus('error')
        setMsg(e.message)
      }
    }
    verify()
  }, [user])

  const box = { textAlign:'center', padding:'3rem 1.5rem', maxWidth:420, margin:'4rem auto' }
  const h2  = { marginBottom:'0.75rem' }
  const p   = { color:'var(--t2)', fontSize:'0.95rem' }

  if (status === 'noauth') return (
    <div style={box}>
      <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🔐</div>
      <h2 style={h2}>Inicia sesión primero</h2>
      <p style={p}>Necesitas estar logueado en ASMODEO DEV para vincular tu Telegram.</p>
      <a href="/" style={{ display:'inline-block', marginTop:'1.5rem', padding:'0.6rem 1.5rem', background:'var(--purple)', color:'#fff', borderRadius:'var(--r)', textDecoration:'none', fontWeight:600 }}>
        Ir al inicio
      </a>
    </div>
  )
  if (status === 'idle' || status === 'loading') return (
    <div style={{ ...box, display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem' }}>
      <span className="spinner spinner-lg" />
      <p style={p}>Verificando token de Telegram...</p>
    </div>
  )
  if (status === 'success') return (
    <div style={box}>
      <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>✅</div>
      <h2 style={h2}>¡Cuenta vinculada!</h2>
      <p style={p}>Tu Telegram está ahora conectado con ASMODEO DEV. Ya puedes usar /subir en el bot.</p>
      <a href="/" style={{ display:'inline-block', marginTop:'1.5rem', padding:'0.6rem 1.5rem', background:'var(--purple)', color:'#fff', borderRadius:'var(--r)', textDecoration:'none', fontWeight:600 }}>
        Ir al inicio
      </a>
    </div>
  )
  return (
    <div style={box}>
      <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>❌</div>
      <h2 style={h2}>Error al vincular</h2>
      <p style={p}>{msg || 'El link expiró o es inválido. Vuelve al bot y usa /login para generar uno nuevo.'}</p>
      <a href="https://t.me/asmodeoDEVbot" target="_blank" rel="noopener noreferrer"
        style={{ display:'inline-block', marginTop:'1.5rem', padding:'0.6rem 1.5rem', background:'rgba(0,136,204,.2)', border:'1px solid rgba(0,136,204,.4)', color:'var(--cyan)', borderRadius:'var(--r)', textDecoration:'none', fontWeight:600 }}>
        Abrir @asmodeoDEVbot
      </a>
    </div>
  )
}

function SettingsRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  return <Navigate to={`/profile/${user.uid}`} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#12121f',
              color: '#f0f0ff',
              border: '1px solid rgba(124,58,237,0.4)',
              borderRadius: '10px',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#12121f' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#12121f' } },
          }}
        />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/"              element={<HomePage />} />
            <Route path="/feed"          element={<FeedPage />} />
            <Route path="/feed/:category" element={<FeedPage />} />
            <Route path="/post/:id"      element={<PostDetailPage />} />
            <Route path="/profile/:uid"  element={<ProfilePage />} />
            <Route path="/search"        element={<SearchPage />} />
            <Route path="/upload"        element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
            <Route path="/settings"      element={<ProtectedRoute><SettingsRedirect /></ProtectedRoute>} />
            <Route path="/admin"         element={<ProtectedRoute requireStaff><AdminPage /></ProtectedRoute>} />
            <Route path="/messages"      element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/messages/:convId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/link-telegram"    element={<LinkTelegramPage />} />
            <Route path="*"              element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
