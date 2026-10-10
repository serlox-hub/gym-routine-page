import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Trophy, X } from 'lucide-react'
import { formatWeekdayDate } from '@gym/shared'
import { Modal, LoadingSpinner, IconButton } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import WeeklyPRExerciseCard from './WeeklyPRExerciseCard.jsx'

/**
 * The week's records, by session and exercise (records card of the home). An exercise opens its
 * session in the history.
 */
function WeeklyPRsModal({ isOpen, onClose, sessions, count, isLoading, isError }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const openSession = (session) => {
    onClose()
    navigate('/history', { state: { date: session.sessionDate, sessionId: session.sessionId } })
  }

  const showList = !isLoading && !isError && count > 0

  const renderBody = () => {
    if (isLoading) return <LoadingSpinner />
    if (!showList) {
      return (
        <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <Trophy size={32} color={colors.textMuted} />
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            {isError ? t('common:home.weeklyPRsError') : t('common:home.weeklyPRsEmpty')}
          </p>
        </div>
      )
    }
    return (
      <div className="min-h-0 overflow-y-auto px-4 pb-6 space-y-5">
        {sessions.map(session => (
          <section key={session.sessionId}>
            <h4 className="px-1 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>
              {formatWeekdayDate(session.sessionDate)} · {session.dayName || t('workout:session.freeWorkout')}
            </h4>
            <div className="space-y-2">
              {session.exercises.map(exercise => (
                <WeeklyPRExerciseCard key={exercise.key} exercise={exercise} onClick={() => openSession(session)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom" maxWidth="max-w-lg">
      <div className="flex items-center gap-3 pl-5 pr-2 pt-4 pb-4">
        <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.goldBg }}>
          <Trophy size={20} color={colors.gold} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold" style={{ color: colors.textPrimary }}>
            {t('common:home.weeklyPRsTitle')}
          </h3>
          {showList && (
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              {t('common:home.weeklyPRsCount', { count })} {t('common:home.weeklyPRsSessions', { count: sessions.length })}
            </p>
          )}
        </div>
        <IconButton icon={X} label={t('common:buttons.close')} onClick={onClose} />
      </div>
      {renderBody()}
    </Modal>
  )
}

export default WeeklyPRsModal
