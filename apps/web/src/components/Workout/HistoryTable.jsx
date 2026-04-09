import { useTranslation } from 'react-i18next'
import { ChevronRight, FileText, Video } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { formatSetValue, formatShortDate } from '@gym/shared'

const RIR_LABELS = {
  [-1]: 'F',
  0: '0',
  1: '1',
  2: '2',
  3: '3+',
}

function HistoryTable({ sessions, weightUnit = 'kg', timeUnit = 's', distanceUnit = 'm', onSelectSet, onSessionClick, hasNextPage, isFetchingNextPage, onLoadMore }) {
  const { t } = useTranslation()

  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-center text-secondary py-8">
        {t('workout:history.noSessions')}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map(session => (
        <div
          key={session.sessionId}
          className="p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: colors.bgTertiary }}
          onClick={() => onSessionClick(session.sessionId)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-secondary">
              {formatShortDate(session.date)}
            </span>
            <ChevronRight size={14} style={{ color: colors.textSecondary }} />
          </div>
          <div className="space-y-1">
            {session.sets.map(set => (
              <div
                key={set.id}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className="w-5 h-5 flex items-center justify-center rounded text-xs font-bold"
                  style={{ backgroundColor: set.set_type === 'dropset' ? colors.orangeBg : colors.border, color: set.set_type === 'dropset' ? colors.orange : colors.textSecondary }}
                >
                  {set.set_type === 'dropset' ? 'D' : set.set_number}
                </span>
                <span className="flex-1">{formatSetValue({ ...set, weight_unit: weightUnit }, { timeUnit, distanceUnit })}</span>
                {(set.rir_actual !== null || set.notes || set.video_url) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (set.notes || set.video_url) onSelectSet(set)
                    }}
                    className={`flex items-center justify-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded ${(set.notes || set.video_url) ? 'hover:opacity-80' : ''}`}
                    style={{
                      backgroundColor: 'rgba(163, 113, 247, 0.15)',
                      color: colors.purple,
                      cursor: (set.notes || set.video_url) ? 'pointer' : 'default',
                      minWidth: '24px',
                    }}
                  >
                    {set.rir_actual !== null && (
                      <span className="w-4 text-center">{RIR_LABELS[set.rir_actual] ?? set.rir_actual}</span>
                    )}
                    {set.video_url && <Video size={12} />}
                    {set.notes && <FileText size={12} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {hasNextPage && (
        <button
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          className="w-full py-2 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: colors.bgTertiary, color: colors.accent }}
        >
          {isFetchingNextPage ? t('common:buttons.loading') : t('common:buttons.seeMore')}
        </button>
      )}
    </div>
  )
}

export default HistoryTable
