import { useState, useEffect, useCallback } from 'react'
import { Check, AlertCircle, Info } from 'lucide-react'
import { colors } from '../../lib/styles.js'

const TOAST_DURATION = 3000

const TYPE_CONFIG = {
  success: { Icon: Check, color: colors.success },
  error: { Icon: AlertCircle, color: colors.danger },
  info: { Icon: Info, color: colors.accent },
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
    if (!toast) return
    const timer = setTimeout(() => setToast(null), TOAST_DURATION)
    return () => clearTimeout(timer)
  }, [toast])

  if (!toast) return null

  const { Icon, color } = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm w-[calc(100%-2rem)] cursor-pointer"
      style={{
        backgroundColor: colors.bgSecondary,
        border: `1px solid ${colors.border}`,
        animation: 'toast-slide-down 0.3s ease-out',
      }}
      onClick={() => setToast(null)}
    >
      <Icon size={18} style={{ color, flexShrink: 0 }} />
      <span className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
        {toast.message}
      </span>
      <style>{`
        @keyframes toast-slide-down {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default Toast
