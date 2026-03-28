import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'
import { colors } from '../../lib/styles.js'

function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div
      className="flex items-center justify-center gap-2 py-2 px-4"
      style={{ backgroundColor: colors.danger }}
    >
      <WifiOff size={14} color={colors.white} />
      <span className="text-xs font-medium" style={{ color: colors.white }}>
        Sin conexion. Los cambios se sincronizaran al volver.
      </span>
    </div>
  )
}

export default OfflineBanner
