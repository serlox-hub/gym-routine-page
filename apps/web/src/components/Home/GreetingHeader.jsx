import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Settings } from 'lucide-react'
import { getGreetingKey } from '@gym/shared'
import { useAuth } from '../../hooks/useAuth.js'
import { colors } from '../../lib/styles.js'

function GreetingHeader() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()

  const greetingKey = getGreetingKey(new Date().getHours())
  const userName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || ''

  return (
    <header className="flex items-start justify-between mb-4">
      <div>
        <p className="text-sm" style={{ color: colors.textSecondary }}>
          {t(greetingKey)}
        </p>
        <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          {userName}
        </h1>
      </div>
      <button
        onClick={() => navigate('/preferences')}
        className="p-2 rounded-full"
        style={{ color: colors.textSecondary, backgroundColor: colors.bgTertiary }}
      >
        <Settings size={20} />
      </button>
    </header>
  )
}

export default GreetingHeader
