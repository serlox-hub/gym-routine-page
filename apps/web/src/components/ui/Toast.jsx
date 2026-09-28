import { useState, useEffect, useCallback } from 'react'
import { Check, AlertCircle, Info } from 'lucide-react'
import { colors, design } from '../../lib/styles.js'
import LoadingSpinner from './LoadingSpinner.jsx'
import { useIsTabBarVisible } from '../../hooks/useTabBar.js'

const TOAST_DURATION = 3000
// Separación del borde inferior cuando no hay barra de pestañas (sesión, rutina, ajustes).
const TOAST_EDGE_GAP = 16

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
  const tabBarVisible = useIsTabBarVisible()

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

  // Región viva SIEMPRE montada: si naciera junto con el mensaje, los lectores de pantalla no la
  // anuncian. Sin ella, un botón bloqueado que "responde" con un toast seguía mudo para VoiceOver.
  const liveRegion = (
    <div role="status" aria-live="polite" className="sr-only">{toast?.message ?? ''}</div>
  )

  if (!toast) return liveRegion

  const { Icon, color } = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info

  return (
    <>
    {liveRegion}
    <div
      aria-hidden="true"
      className="fixed left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm w-[calc(100%-2rem)] cursor-pointer"
      style={{
        // Abajo, como en native: arriba tapaba el ActiveSessionBanner, y varios avisos
        // (p. ej. "termina el entrenamiento en curso") piden justo la acción que escondían.
        // Encima de la barra solo si se está pintando: sin ella el hueco dejaba el aviso flotando.
        bottom: tabBarVisible ? design.tabBarFootprint : `calc(${TOAST_EDGE_GAP}px + env(safe-area-inset-bottom))`,
        backgroundColor: colors.bgSecondary,
        border: `1px solid ${colors.border}`,
        animation: 'toast-slide-up 0.3s ease-out',
      }}
      onClick={() => setToast(null)}
    >
      {toast.type === 'loading'
        ? <LoadingSpinner inline />
        : <Icon size={18} style={{ color, flexShrink: 0 }} />}
      {/* `pre-line`: a message can carry several lines (a result plus what was left out), as a
          native <Text> already renders them. */}
      <span className="text-sm font-semibold whitespace-pre-line" style={{ color: colors.textPrimary }}>
        {toast.message}
      </span>
      <style>{`
        @keyframes toast-slide-up {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
    </>
  )
}

export default Toast
