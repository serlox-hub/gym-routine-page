import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { APP_NAME, APP_URL, SUMMARY_MAX_EXERCISES } from '@gym/shared'
import { colors } from '../../lib/styles.js'

// Diseño base 540×720 (aspect 0.75). Todas las medidas escalan con `width`.
const BASE_W = 540
const BASE_H = 720
export const SUMMARY_CARD_ASPECT = BASE_W / BASE_H

const C = colors
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

// SVG inline con paths de Lucide Trophy — html2canvas lo captura
function TrophySVG({ size, color, strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

function StatBox({ value, label, k }) {
  return (
    <div style={{
      flex: 1,
      backgroundColor: C.bgTertiary,
      borderRadius: 10 * k,
      padding: `${12 * k}px ${8 * k}px`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 22 * k, fontWeight: 700, color: C.textPrimary, lineHeight: `${26 * k}px` }}>
        {value}
      </div>
      <div style={{
        fontSize: 10 * k,
        color: C.textSecondary,
        marginTop: 4 * k,
        textTransform: 'uppercase',
        letterSpacing: `${0.5 * k}px`,
      }}>{label}</div>
    </div>
  )
}

function ExerciseRow({ name, setsCompleted, k, t }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${6 * k}px 0`,
    }}>
      <span style={{
        flex: 1,
        fontSize: 14 * k,
        color: C.textPrimary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{name}</span>
      <span style={{
        fontSize: 12 * k,
        color: C.textSecondary,
        marginLeft: 8 * k,
        flexShrink: 0,
      }}>
        {setsCompleted} {setsCompleted === 1 ? t('workout:summary.singleSet') : t('workout:summary.multipleSets')}
      </span>
    </div>
  )
}

const WorkoutSummaryCard = forwardRef(function WorkoutSummaryCard({ summaryData, sessionNumber, width = BASE_W }, ref) {
  const { t } = useTranslation()
  if (!summaryData) return null

  const {
    dayName, routineName, date, durationFormatted,
    totalExercises, totalSetsCompleted,
    exercises, prs,
  } = summaryData

  const hasPRs = prs?.length > 0
  const visibleExercises = (exercises || []).slice(0, SUMMARY_MAX_EXERCISES)
  const hiddenCount = (exercises || []).length - visibleExercises.length

  const k = width / BASE_W
  const height = BASE_H * k

  return (
    <div
      ref={ref}
      style={{
        width,
        height,
        backgroundColor: C.bgPrimary,
        fontFamily: FONT,
        padding: 14 * k,
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        height: '100%',
        backgroundColor: C.bgSecondary,
        borderRadius: 24 * k,
        padding: `${18 * k}px ${22 * k}px`,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 14 * k }}>
          <div style={{
            fontSize: 12 * k,
            fontWeight: 700,
            color: C.success,
            letterSpacing: `${2.5 * k}px`,
            textTransform: 'uppercase',
          }}>{APP_NAME}</div>
          <div style={{
            width: 28 * k,
            height: 2 * k,
            backgroundColor: C.success,
            margin: `${6 * k}px auto 0`,
            borderRadius: 1 * k,
          }} />
        </div>

        {/* DayName · RoutineName · Date */}
        <div style={{ textAlign: 'center', marginBottom: 14 * k }}>
          <div style={{
            fontSize: 24 * k,
            fontWeight: 800,
            color: C.textPrimary,
            textTransform: 'uppercase',
            lineHeight: `${28 * k}px`,
          }}>{dayName}</div>
          {routineName && (
            <div style={{ fontSize: 13 * k, color: C.textSecondary, marginTop: 4 * k }}>
              {routineName}
            </div>
          )}
          <div style={{
            fontSize: 12 * k,
            color: C.textMuted,
            marginTop: 2 * k,
            textTransform: 'capitalize',
          }}>{date}</div>
        </div>

        {/* Duration hero */}
        <div style={{ textAlign: 'center', marginBottom: 14 * k }}>
          <div style={{
            fontSize: 52 * k,
            fontWeight: 800,
            color: C.success,
            lineHeight: `${58 * k}px`,
          }}>{durationFormatted}</div>
          <div style={{
            fontSize: 11 * k,
            color: C.textSecondary,
            marginTop: 2 * k,
            textTransform: 'uppercase',
            letterSpacing: `${1.5 * k}px`,
          }}>{t('workout:summary.duration')}</div>
        </div>

        {/* 3 stat boxes */}
        <div style={{ display: 'flex', gap: 8 * k, marginBottom: 12 * k }}>
          <StatBox value={totalExercises} label={t('workout:summary.totalExercises')} k={k} />
          <StatBox value={totalSetsCompleted} label={t('workout:summary.totalSets')} k={k} />
          <StatBox value={sessionNumber ? `#${sessionNumber}` : '—'} label={t('workout:history.session')} k={k} />
        </div>

        {/* PR badge */}
        {hasPRs && (
          <div style={{
            alignSelf: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: 8 * k,
            padding: `${8 * k}px ${14 * k}px`,
            backgroundColor: C.goldBg,
            borderLeft: `3px solid ${C.gold}`,
            borderRadius: 8 * k,
            marginBottom: 12 * k,
          }}>
            <TrophySVG size={14 * k} color={C.gold} />
            <span style={{
              fontSize: 12 * k,
              fontWeight: 700,
              color: C.gold,
              letterSpacing: `${1.2 * k}px`,
              textTransform: 'uppercase',
            }}>
              {prs.length} {prs.length === 1 ? t('workout:summary.singlePR') : t('workout:summary.multiplePRs')}
            </span>
          </div>
        )}

        {/* Exercises list */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{
            fontSize: 11 * k,
            fontWeight: 700,
            color: C.textSecondary,
            letterSpacing: `${1.2 * k}px`,
            textTransform: 'uppercase',
            marginBottom: 4 * k,
          }}>{t('workout:session.exercises')}</div>
          {visibleExercises.map((ex) => (
            <ExerciseRow key={ex.name} name={ex.name} setsCompleted={ex.setsCompleted} k={k} t={t} />
          ))}
          {hiddenCount > 0 && (
            <div style={{
              fontSize: 11 * k,
              color: C.textMuted,
              textAlign: 'center',
              marginTop: 4 * k,
            }}>+{hiddenCount} {t('workout:summary.moreExercises')}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: 10 * k,
          borderTop: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 11 * k, color: C.textSecondary, letterSpacing: `${1 * k}px` }}>
            {APP_URL}
          </div>
        </div>
      </div>
    </div>
  )
})

export default WorkoutSummaryCard
