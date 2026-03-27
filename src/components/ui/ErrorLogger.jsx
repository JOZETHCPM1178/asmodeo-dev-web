// src/components/ui/ErrorLogger.jsx
// ── Muestra errores JS en pantalla (solo en producción para debug) ──
import { useEffect, useState } from 'react'

export default function ErrorLogger() {
  const [errors, setErrors] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const addError = (msg) => {
      const time = new Date().toLocaleTimeString()
      setErrors(prev => [...prev.slice(-19), { msg: String(msg), time }])
      setOpen(true)
    }

    // Capturar errores JS globales
    const onError = (e) => addError(`❌ ${e.message}\n  ${e.filename?.split('/').pop()}:${e.lineno}`)

    // Capturar promesas rechazadas (fetch, firebase, etc.)
    const onUnhandled = (e) => addError(`⚠️ ${e.reason?.message || e.reason || 'Promise rejected'}`)

    // Interceptar console.error
    const origError = console.error
    console.error = (...args) => {
      addError(`🔴 ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`)
      origError(...args)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandled)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandled)
      console.error = origError
    }
  }, [])

  if (errors.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 999999, fontFamily: 'monospace', fontSize: '11px',
    }}>
      {/* Botón tab */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'absolute', bottom: open ? 'calc(100% )' : 0, right: 16,
          background: '#ef4444', color: '#fff', border: 'none',
          borderRadius: '6px 6px 0 0', padding: '4px 12px',
          cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
        }}
      >
        🐛 {errors.length} error{errors.length > 1 ? 'es' : ''}  {open ? '▼' : '▲'}
      </button>

      {open && (
        <div style={{
          background: '#0a0a0a', color: '#f87171',
          maxHeight: '55vh', overflowY: 'auto',
          borderTop: '2px solid #ef4444',
          padding: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>JS Error Logger — AsmodeoDev</span>
            <button
              onClick={() => setErrors([])}
              style={{ background: 'transparent', color: '#9090b8', border: 'none', cursor: 'pointer' }}
            >
              Limpiar
            </button>
          </div>
          {errors.map((e, i) => (
            <div key={i} style={{
              borderBottom: '1px solid #1a1a1a', padding: '6px 0',
              color: e.msg.startsWith('⚠️') ? '#fbbf24' : '#f87171',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              <span style={{ color: '#50506a', marginRight: 8 }}>{e.time}</span>
              {e.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
