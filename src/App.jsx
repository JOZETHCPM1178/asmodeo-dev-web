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

// ─── Página para vincular cuenta con Telegram ───
// Lee ?token=...&tid=...&name=... del URL, llama al worker /verify-login y muestra resultado
function LinkTelegramPage() {
  const { user } = useAuth()
  const [status, setStatus] = React.useState('loading') // loading | success | error | noauth
  const [msg, setMsg] = React.useState('')

  React.useEffect(() => {
    async function verify() {
      if (!user) { setStatus('noauth'); return }
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')
      const tid   = params.get('tid')
      const name  = params.get('name') || 'Usuario'
      if (!token || !tid) { setStatus('error'); setMsg('Link inválido.'); return }
      try {
        const workerUrl = import.meta.env.VITE_WORKER_URL
        const res = await fetch(`${workerUrl}/verify-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, token, telegramId: tid, telegramName: name }),
        })
        const data = await res.json()
        if (data.ok) { setStatus('success') }
        else { setStatus('error'); setMsg(data.error || 'Error desconocido.') }
      } catch(e) { setStatus('error'); setMsg(e.message) }
    }
    verify()
  }, [user])

  if (status === 'noauth') return (
    <div style={{textAlign:'center',padding:'3rem'}}>
      <h2>🔐 Inicia sesión primero</h2>
      <p>Necesitas estar logueado en ASMODEO DEV para vincular tu Telegram.</p>
    </div>
  )
  if (status === 'loading') return <div style={{textAlign:'center',padding:'3rem'}}>⏳ Verificando...</div>
  if (status === 'success') return (
    <div style={{textAlign:'center',padding:'3rem'}}>
      <h2>✅ ¡Cuenta vinculada!</h2>
      <p>Tu Telegram está ahora conectado con ASMODEO DEV.</p>
    </div>
  )
  return (
    <div style={{textAlign:'center',padding:'3rem'}}>
      <h2>❌ Error al vincular</h2>
      <p>{msg || 'El link es inválido o expiró. Usa /login en el bot de nuevo.'}</p>
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
