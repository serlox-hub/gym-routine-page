import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import HistorySetRow from './HistorySetRow.jsx'
import { DEFAULT_TRACKED_FIELDS, EXERCISE_HISTORY_PAGE_SIZE, ROUTINE_MEMBERSHIP, formatShortDate, calculateExerciseVolume, getRoutineMembershipBadgeKey } from '@gym/shared'

// The same day stands out; another day of the routine only says so.
const BADGE_STYLES = {
  [ROUTINE_MEMBERSHIP.DAY]: { color: colors.teal, border: `1px solid ${colors.teal}` },
  [ROUTINE_MEMBERSHIP.ROUTINE]: { color: colors.textSecondary, border: `1px solid ${colors.border}` },
}

/**
 * `sessions` arrive already filtered; "See more" reveals them from memory. The parent remounts it
 * (key) when its filters change, so the list starts again at one page.
 * `membershipOf(session)` gives a ROUTINE_MEMBERSHIP value for its mark, or null for none.
 */
function HistoryTable({ sessions, trackedFields = DEFAULT_TRACKED_FIELDS, weightUnit = 'kg', distanceUnit = 'm', onSelectSet, onSessionClick, membershipOf }) {
  const { t } = useTranslation()
  const [visibleCount, setVisibleCount] = useState(EXERCISE_HISTORY_PAGE_SIZE)

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

      {sessions.slice(0, visibleCount).map(session => {
        const volume = calculateExerciseVolume(session.sets, trackedFields)
        const membership = membershipOf?.(session) ?? null
        const badgeKey = getRoutineMembershipBadgeKey(membership)
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
              className="flex items-center justify-between min-h-11 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ padding: '12px 14px 8px' }}
              onClick={() => onSessionClick(session.sessionId, session.date)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 700 }}>
                  {formatShortDate(session.date)}
                </span>
                {badgeKey && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 whitespace-nowrap"
                    style={{ ...BADGE_STYLES[membership], fontSize: 11, fontWeight: 600 }}
                  >
                    {t(badgeKey)}
                  </span>
                )}
              </div>
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
            <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column' }}>
              {session.sets.map(set => (
                <HistorySetRow key={set.id} set={set} weightUnit={weightUnit} distanceUnit={distanceUnit}
                  trackedFields={trackedFields} onSelectSet={onSelectSet} />
              ))}
            </div>
          </div>
        )
      })}

      {sessions.length > visibleCount && (
        <button
          onClick={() => setVisibleCount(count => count + EXERCISE_HISTORY_PAGE_SIZE)}
          className="w-full min-h-11 py-2 rounded-lg text-sm font-medium hover:opacity-80"
          style={{ backgroundColor: colors.bgTertiary, color: colors.success }}
        >
          {t('common:buttons.seeMore')}
        </button>
      )}
    </div>
  )
}

export default HistoryTable
