import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '../../lib/styles.js'

function PrivateRoute({ children }) {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bgPrimary }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p style={{ color: colors.textSecondary }}>{t('common:buttons.loading')}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default PrivateRoute
