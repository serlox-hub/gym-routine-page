import { useState, useEffect, useCallback } from 'react'
import { Check, AlertCircle, Info } from 'lucide-react'
import { colors, design } from '../../lib/styles.js'
import LoadingSpinner from './LoadingSpinner.jsx'

const TOAST_DURATION = 3000

const TYPE_CONFIG = {
  success: { Icon: Check, color: colors.success },
  error: { Icon: AlertCircle, color: colors.danger },
  info: { Icon: Info, color: colors.textSecondary },
}

let _showToast = null

export function getShowToast() {
  return _showToast
}

function Toast() {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  useEffect(() => {
    _showToast = show
    return () => { _showToast = null }
  }, [show])

  useEffect(() => {
    // type 'loading' no se autooculta: se sustituye por el toast de éxito/error que lo sigue
    if (!toast || toast.type === 'loading') return
    const timer = setTimeout(() => setToast(null), TOAST_DURATION)
    return () => clearTimeout(timer)
  }, [toast])

  if (!toast) return null

  const { Icon, color } = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm w-[calc(100%-2rem)] cursor-pointer"
      style={{
        // Abajo, como en native: arriba tapaba el ActiveSessionBanner, y varios avisos
        // (p. ej. "termina el entrenamiento en curso") piden justo la acción que escondían.
        bottom: design.tabBarFootprint,
        backgroundColor: colors.bgSecondary,
        border: `1px solid ${colors.border}`,
        animation: 'toast-slide-up 0.3s ease-out',
      }}
      onClick={() => setToast(null)}
    >
      {toast.type === 'loading'
        ? <LoadingSpinner inline />
        : <Icon size={18} style={{ color, flexShrink: 0 }} />}
      <span className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
        {toast.message}
      </span>
      <style>{`
        @keyframes toast-slide-up {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default Toast
