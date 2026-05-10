import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, ChevronRight } from 'lucide-react'
import { usePendingReminders } from '@gym/shared'
import { colors } from '../../lib/styles.js'

function ReminderRow({ message, onClick }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 px-4 rounded-xl transition-colors"
      style={{
        backgroundColor: colors.warningBg,
        border: `1px solid ${colors.warning}33`,
      }}
    >
      <Bell size={16} style={{ color: colors.warning, flexShrink: 0 }} />
      <span className="flex-1 text-left text-sm font-medium" style={{ color: colors.textPrimary }}>
        {message}
      </span>
      <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: colors.warning }}>
        {t('common:reminders.cta')}
        <ChevronRight size={14} />
      </span>
    </button>
  )
}

function RemindersBanner() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { weight, measurements } = usePendingReminders()

  if (!weight && !measurements) return null

  const goToBody = () => navigate('/body-metrics')

  return (
    <div className="flex flex-col gap-2 mb-4">
      {weight && (
        <ReminderRow
          message={t('common:reminders.weightTitle', { count: weight.daysSince })}
          onClick={goToBody}
        />
      )}
      {measurements && (
        <ReminderRow
          message={t('common:reminders.measurementsTitle', { count: measurements.daysSince })}
          onClick={goToBody}
        />
      )}
    </div>
  )
}

export default RemindersBanner
