import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import './Toast.css'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2)
    setToasts(prev => [...prev, { id, message, type }])

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Global Listener for non-React code (e.g. API interceptors) ──
  useEffect(() => {
    const handleGlobalToast = (e) => {
      const { message, type, duration } = e.detail || {}
      if (message) addToast(message, type, duration)
    }
    window.addEventListener('cymonic-toast', handleGlobalToast)
    return () => window.removeEventListener('cymonic-toast', handleGlobalToast)
  }, [addToast])

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item toast-${t.type}`}>
            <div className="toast-icon">
              {t.type === 'success' && '✅'}
              {t.type === 'error' && '❌'}
              {t.type === 'info' && '💡'}
              {t.type === 'warning' && '⚠️'}
            </div>
            <div className="toast-message">{t.message}</div>
            <button className="toast-close" onClick={() => removeToast(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
