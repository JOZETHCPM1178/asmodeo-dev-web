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
import WatermarkPage from './pages/WatermarkPage'

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
            <Route path="/watermark"        element={<WatermarkPage />} />
            <Route path="*"              element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
