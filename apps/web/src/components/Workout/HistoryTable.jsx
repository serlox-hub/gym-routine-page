import { useTranslation } from 'react-i18next'
import { ChevronRight, FileText, Video } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { formatSetValue, formatShortDate, calculateTotalVolume } from '@gym/shared'

function HistoryTable({ sessions, weightUnit = 'kg', timeUnit = 's', distanceUnit = 'm', onSelectSet, onSessionClick, hasNextPage, isFetchingNextPage, onLoadMore }) {
  const { t } = useTranslation()

  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-center py-8" style={{ color: colors.textSecondary }}>
        {t('exercise:noHistory')}
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 600 }}>
        {t('workout:history.recentSessions')}
      </span>

      {sessions.map(session => {
        const volume = calculateTotalVolume(session.sets)
        return (
          <div
            key={session.sessionId}
            className="rounded-lg"
            style={{
              backgroundColor: colors.bgTertiary,
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              overflow: 'hidden',
            }}
          >
            {/* Session header — clickable to navigate */}
            <div
              className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
              style={{ padding: '12px 14px 8px' }}
              onClick={() => onSessionClick(session.sessionId, session.date)}
            >
              <span style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 700 }}>
                {formatShortDate(session.date)}
              </span>
              <div className="flex items-center gap-2">
                {volume > 0 && (
                  <span style={{ color: colors.textMuted, fontSize: 12 }}>
                    {volume.toLocaleString()} {weightUnit}
                  </span>
                )}
                <ChevronRight size={16} color={colors.textSecondary} />
              </div>
            </div>

            {/* Sets */}
            <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {session.sets.map(set => (
                <div key={set.id} className="flex items-center gap-3" style={{ fontSize: 13 }}>
                  <span style={{ color: colors.textMuted, fontSize: 12, width: 14, textAlign: 'right' }}>
                    {set.set_number}
                  </span>
                  <span className="flex-1" style={{ color: colors.textPrimary }}>
                    {formatSetValue({ ...set, weight_unit: weightUnit }, { timeUnit, distanceUnit })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {set.notes && (
                      <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); onSelectSet(set) }} className="hover:opacity-80 p-1">
                        <FileText size={14} color={colors.textMuted} />
                      </button>
                    )}
                    {set.video_url && (
                      <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); onSelectSet(set) }} className="hover:opacity-80 p-1">
                        <Video size={14} color={colors.textMuted} />
                      </button>
                    )}
                    {set.rir_actual !== null && set.rir_actual !== undefined && (
                      <span style={{ color: colors.textMuted, fontSize: 12, minWidth: 16, textAlign: 'right' }}>
                        {set.rir_actual}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

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
