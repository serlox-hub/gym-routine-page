import { forwardRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Trophy } from 'lucide-react-native'
import { APP_NAME, APP_URL, SUMMARY_MAX_EXERCISES } from '@gym/shared'
import { colors } from '../../lib/styles'

function StatBox({ value, label }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

function PRItem({ exerciseName, details }) {
  const valueStr = details.map(d => `${d.newValue} ${d.unit}`).join(' · ')
  return (
    <View style={s.prItem}>
      <Trophy size={16} color={colors.warning} />
      <View style={s.prContent}>
        <Text style={s.prName} numberOfLines={1}>{exerciseName}</Text>
        <Text style={s.prValue}>{valueStr}</Text>
      </View>
    </View>
  )
}

function ExerciseRow({ name, setsCompleted, bestSet, hasPR }) {
  return (
    <View style={s.exerciseRow}>
      <View style={s.exerciseMain}>
        <Text style={s.exerciseName} numberOfLines={1}>{name}</Text>
        <Text style={s.exerciseSets}>
          {setsCompleted} {setsCompleted === 1 ? 'serie' : 'series'}
        </Text>
      </View>
      {hasPR && bestSet ? (
        <View style={s.exercisePR}>
          <Trophy size={11} color={colors.warning} />
          <Text style={s.exercisePRText}>{bestSet}</Text>
        </View>
      ) : null}
    </View>
  )
}

const WorkoutSummaryCard = forwardRef(function WorkoutSummaryCard({ summaryData, sessionNumber }, ref) {
  const { t } = useTranslation()
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
    <View ref={ref} style={s.card}>
      {/* Header / Branding */}
      <View style={s.header}>
        <Text style={s.brandName}>{APP_NAME}</Text>
        <View style={s.brandLine} />
      </View>

      {/* Session Name */}
      <View style={s.sessionInfo}>
        <Text style={s.dayName}>{dayName}</Text>
        {routineName ? <Text style={s.routineName}>{routineName}</Text> : null}
        <Text style={s.date}>{date}</Text>
      </View>

      {/* Stats Grid */}
      <View style={s.statsRow}>
        <StatBox value={durationFormatted} label={t('workout:summary.duration')} />
        <StatBox value={totalExercises} label={t('workout:summary.totalExercises')} />
      </View>
      <View style={[s.statsRow, { marginBottom: 24 }]}>
        <StatBox value={totalSetsCompleted} label={t('workout:summary.totalSets')} />
        <StatBox value={sessionNumber ? `#${sessionNumber}` : '—'} label={t('workout:history.session')} />
      </View>

      {/* PRs Section */}
      {hasPRs ? (
        <View style={s.prsSection}>
          <Text style={s.prsSectionTitle}>{t('workout:summary.personalRecords')}</Text>
          {prs.slice(0, 3).map((pr) => (
            <PRItem key={pr.exerciseName} exerciseName={pr.exerciseName} details={pr.details} />
          ))}
          {prs.length > 3 ? (
            <Text style={s.moreText}>+{prs.length - 3} más</Text>
          ) : null}
        </View>
      ) : null}

      {/* Exercises List */}
      <View style={s.exercisesSection}>
        <Text style={s.exercisesSectionTitle}>{t('workout:session.exercises')}</Text>
        {visibleExercises.map((ex) => (
          <ExerciseRow key={ex.name} {...ex} />
        ))}
        {hiddenCount > 0 ? (
          <Text style={s.moreText}>+{hiddenCount} más</Text>
        ) : null}
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.footerText}>{APP_URL}</Text>
      </View>
    </View>
  )
})

const s = StyleSheet.create({
  card: {
    width: 540,
    minHeight: 960,
    backgroundColor: colors.bgPrimary,
    padding: 40,
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  brandLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.accent,
    marginTop: 12,
    borderRadius: 1,
  },
  sessionInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  dayName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  routineName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
  },
  date: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prsSection: {
    marginBottom: 20,
  },
  prsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  prItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(210, 153, 34, 0.15)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    marginBottom: 6,
  },
  prContent: {
    flex: 1,
  },
  prName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
  },
  prValue: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  exercisesSection: {
    flex: 1,
  },
  exercisesSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  exerciseRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseName: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  exerciseSets: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  exercisePR: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  exercisePRText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
})

export default WorkoutSummaryCard
