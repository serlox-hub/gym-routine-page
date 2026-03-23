import { forwardRef } from 'react'
import { APP_NAME, APP_URL, SUMMARY_MAX_EXERCISES } from '@gym/shared'
import { colors } from '../../lib/styles.js'

// Alias para inline styles (html2canvas requiere inline, no Tailwind)
const C = colors

// html2canvas no renderiza SVGs inline (lucide), usar emoji
const TROPHY = '🏆'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

function StatBox({ value, label }) {
  return (
    <div style={{
      flex: 1,
      backgroundColor: C.bgTertiary,
      borderRadius: 12,
      padding: '16px 12px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 22,
        fontWeight: 700,
        color: C.textPrimary,
        fontFamily: FONT,
        lineHeight: 1.2,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11,
        color: C.textSecondary,
        fontFamily: FONT,
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {label}
      </div>
    </div>
  )
}

function PRItem({ exerciseName, details }) {
  const valueStr = details.map(d => `${d.newValue} ${d.unit}`).join(' · ')
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      backgroundColor: C.warningBg,
      borderRadius: 8,
      borderLeft: `3px solid ${C.warning}`,
    }}>
      <span style={{ fontSize: 14 }}>{TROPHY}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.warning,
          fontFamily: FONT,
        }}>
          {exerciseName}
        </div>
        <div style={{
          fontSize: 11,
          color: C.textSecondary,
          fontFamily: FONT,
        }}>
          {valueStr}
        </div>
      </div>
    </div>
  )
}

function ExerciseRow({ name, setsCompleted, bestSet, hasPR }) {
  return (
    <div style={{
      padding: '6px 0',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 13,
          color: C.textPrimary,
          fontFamily: FONT,
          flex: 1,
          minWidth: 0,
        }}>
          {name}
        </span>
        <span style={{
          fontSize: 12,
          color: C.textSecondary,
          fontFamily: FONT,
          flexShrink: 0,
          marginLeft: 8,
        }}>
          {setsCompleted} {setsCompleted === 1 ? 'serie' : 'series'}
        </span>
      </div>
      {hasPR && bestSet && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 3,
        }}>
          <span style={{ fontSize: 10 }}>{TROPHY}</span>
          <span style={{
            fontSize: 11,
            color: C.warning,
            fontFamily: FONT,
            fontWeight: 600,
          }}>
            {bestSet}
          </span>
        </div>
      )}
    </div>
  )
}

const WorkoutSummaryCard = forwardRef(function WorkoutSummaryCard({ summaryData, sessionNumber }, ref) {
  if (!summaryData) return null

  const {
    dayName, routineName, date, durationFormatted,
    totalExercises, totalSetsCompleted,
    exercises, prs,
  } = summaryData

  const hasPRs = prs?.length > 0
  const visibleExercises = exercises.slice(0, SUMMARY_MAX_EXERCISES)
  const hiddenCount = exercises.length - visibleExercises.length

  return (
    <div
      ref={ref}
      style={{
        width: 540,
        minHeight: 960,
        backgroundColor: C.bgPrimary,
        fontFamily: FONT,
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header / Branding */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: C.accent,
          letterSpacing: '3px',
          textTransform: 'uppercase',
        }}>
          {APP_NAME}
        </div>
        <div style={{
          width: 40,
          height: 2,
          backgroundColor: C.accent,
          margin: '12px auto 0',
          borderRadius: 1,
        }} />
      </div>

      {/* Session Name */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          fontSize: 28,
          fontWeight: 800,
          color: C.textPrimary,
          lineHeight: 1.2,
          textTransform: 'uppercase',
        }}>
          {dayName}
        </div>
        {routineName && (
          <div style={{
            fontSize: 14,
            color: C.textSecondary,
            marginTop: 6,
          }}>
            {routineName}
          </div>
        )}
        <div style={{
          fontSize: 13,
          color: C.textMuted,
          marginTop: 4,
          textTransform: 'capitalize',
        }}>
          {date}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <StatBox value={durationFormatted} label="Duración" />
        <StatBox value={totalExercises} label="Ejercicios" />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <StatBox value={totalSetsCompleted} label="Series" />
        <StatBox value={sessionNumber ? `#${sessionNumber}` : '—'} label="Sesión" />
      </div>

      {/* PRs Section */}
      {hasPRs && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.warning,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            Records personales
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {prs.slice(0, 3).map((pr) => (
              <PRItem key={pr.exerciseName} exerciseName={pr.exerciseName} details={pr.details} />
            ))}
            {prs.length > 3 && (
              <div style={{ fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 2 }}>
                +{prs.length - 3} más
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exercises List */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.textSecondary,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          Ejercicios
        </div>
        {visibleExercises.map((ex) => (
          <ExerciseRow key={ex.name} {...ex} />
        ))}
        {hiddenCount > 0 && (
          <div style={{
            fontSize: 11,
            color: C.textMuted,
            textAlign: 'center',
            marginTop: 8,
          }}>
            +{hiddenCount} más
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: 20,
        paddingTop: 16,
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontSize: 12,
          color: C.textMuted,
          letterSpacing: '1px',
        }}>
          {APP_URL}
        </div>
      </div>
    </div>
  )
})

export default WorkoutSummaryCard
