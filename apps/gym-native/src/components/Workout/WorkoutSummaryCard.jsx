import { forwardRef } from 'react'
import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Trophy } from 'lucide-react-native'
import { APP_NAME, APP_URL, SUMMARY_MAX_EXERCISES } from '@gym/shared'
import { colors } from '../../lib/styles'

// Diseño base 540×720 (aspect 0.75). Todas las medidas escalan con `width`.
const BASE_W = 540
const BASE_H = 720
export const SUMMARY_CARD_ASPECT = BASE_W / BASE_H

function StatBox({ value, label, k }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.bgTertiary,
      borderRadius: 10 * k,
      paddingVertical: 12 * k,
      paddingHorizontal: 8 * k,
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: 22 * k, fontWeight: '700', color: colors.textPrimary, lineHeight: 26 * k }}>
        {value}
      </Text>
      <Text style={{
        fontSize: 10 * k,
        color: colors.textSecondary,
        marginTop: 4 * k,
        textTransform: 'uppercase',
        letterSpacing: 0.5 * k,
      }}>{label}</Text>
    </View>
  )
}

function ExerciseRow({ name, setsCompleted, k, t }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6 * k,
    }}>
      <Text
        style={{ flex: 1, fontSize: 14 * k, color: colors.textPrimary }}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text style={{ fontSize: 12 * k, color: colors.textSecondary, marginLeft: 8 * k }}>
        {setsCompleted} {setsCompleted === 1 ? t('workout:summary.singleSet') : t('workout:summary.multipleSets')}
      </Text>
    </View>
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
    <View ref={ref} style={{ width, height, backgroundColor: colors.bgPrimary, padding: 14 * k }}>
      <View style={{
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: 24 * k,
        paddingVertical: 18 * k,
        paddingHorizontal: 22 * k,
      }}>
        {/* Brand */}
        <View style={{ alignItems: 'center', marginBottom: 14 * k }}>
          <Text style={{
            fontSize: 12 * k,
            fontWeight: '700',
            color: colors.success,
            letterSpacing: 2.5 * k,
            textTransform: 'uppercase',
          }}>{APP_NAME}</Text>
          <View style={{
            width: 28 * k,
            height: 2 * k,
            backgroundColor: colors.success,
            marginTop: 6 * k,
            borderRadius: 1 * k,
          }} />
        </View>

        {/* DayName · RoutineName · Date */}
        <View style={{ alignItems: 'center', marginBottom: 14 * k }}>
          <Text
            numberOfLines={2}
            style={{
              fontSize: 24 * k,
              fontWeight: '800',
              color: colors.textPrimary,
              textTransform: 'uppercase',
              textAlign: 'center',
              lineHeight: 28 * k,
            }}
          >{dayName}</Text>
          {routineName ? (
            <Text style={{ fontSize: 13 * k, color: colors.textSecondary, marginTop: 4 * k }}>
              {routineName}
            </Text>
          ) : null}
          <Text style={{
            fontSize: 12 * k,
            color: colors.textMuted,
            marginTop: 2 * k,
            textTransform: 'capitalize',
          }}>{date}</Text>
        </View>

        {/* Duration hero */}
        <View style={{ alignItems: 'center', marginBottom: 14 * k }}>
          <Text style={{
            fontSize: 52 * k,
            fontWeight: '800',
            color: colors.success,
            lineHeight: 58 * k,
          }}>{durationFormatted}</Text>
          <Text style={{
            fontSize: 11 * k,
            color: colors.textSecondary,
            marginTop: 2 * k,
            textTransform: 'uppercase',
            letterSpacing: 1.5 * k,
          }}>{t('workout:summary.duration')}</Text>
        </View>

        {/* 3 stat boxes */}
        <View style={{ flexDirection: 'row', gap: 8 * k, marginBottom: 12 * k }}>
          <StatBox value={totalExercises} label={t('workout:summary.totalExercises')} k={k} />
          <StatBox value={totalSetsCompleted} label={t('workout:summary.totalSets')} k={k} />
          <StatBox value={sessionNumber ? `#${sessionNumber}` : '—'} label={t('workout:history.session')} k={k} />
        </View>

        {/* PR badge */}
        {hasPRs ? (
          <View style={{
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8 * k,
            paddingVertical: 8 * k,
            paddingHorizontal: 14 * k,
            backgroundColor: colors.goldBg,
            borderLeftWidth: 3,
            borderLeftColor: colors.gold,
            borderRadius: 8 * k,
            marginBottom: 12 * k,
          }}>
            <Trophy size={14 * k} color={colors.gold} strokeWidth={2} />
            <Text style={{
              fontSize: 12 * k,
              fontWeight: '700',
              color: colors.gold,
              letterSpacing: 1.2 * k,
              textTransform: 'uppercase',
            }}>
              {prs.length} {prs.length === 1 ? t('workout:summary.singlePR') : t('workout:summary.multiplePRs')}
            </Text>
          </View>
        ) : null}

        {/* Exercises list */}
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 11 * k,
            fontWeight: '700',
            color: colors.textSecondary,
            letterSpacing: 1.2 * k,
            textTransform: 'uppercase',
            marginBottom: 4 * k,
          }}>{t('workout:session.exercises')}</Text>
          {visibleExercises.map((ex) => (
            <ExerciseRow key={ex.name} name={ex.name} setsCompleted={ex.setsCompleted} k={k} t={t} />
          ))}
          {hiddenCount > 0 ? (
            <Text style={{
              fontSize: 11 * k,
              color: colors.textMuted,
              textAlign: 'center',
              marginTop: 4 * k,
            }}>+{hiddenCount} {t('workout:summary.moreExercises')}</Text>
          ) : null}
        </View>

        {/* Footer */}
        <View style={{
          alignItems: 'center',
          paddingTop: 10 * k,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
          <Text style={{ fontSize: 11 * k, color: colors.textSecondary, letterSpacing: 1 * k }}>
            {APP_URL}
          </Text>
        </View>
      </View>
    </View>
  )
})

export default WorkoutSummaryCard
