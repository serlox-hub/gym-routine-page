import { useMemo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Flame, X, Pause, Play, Settings, Check, Share2, ChevronLeft, ChevronRight } from 'lucide-react-native'
import {
  useTrainingGoal, useUpdateTrainingGoal, usePreference, fetchWorkoutSummary, getLastCycleSession,
  getCurrentCycleDays, getCurrentCycleProgress, getCurrentCycleKey, countSessionsByCycle,
  getCycleDateRange, formatShortDate,
} from '@gym/shared'
import { Card } from '../ui'
import WorkoutSummaryModal from '../Workout/WorkoutSummaryModal'
import { colors } from '../../lib/styles'

const CYCLE_LENGTH = 7
const MAX_OFFSET = -12

function WeeklyGoalWidget({ onOpenSettings, navigation }) {
  const { t } = useTranslation()
  const goal = useTrainingGoal()
  const updatePreference = useUpdateTrainingGoal()
  const [showSetup, setShowSetup] = useState(false)
  const [daysInput, setDaysInput] = useState(null)
  const [summaryData, setSummaryData] = useState(null)
  const [loadingShare, setLoadingShare] = useState(false)
  const [cycleOffset, setCycleOffset] = useState(0)
  const { value: globalWeightUnit } = usePreference('weight_unit')

  // All hooks must be before any early return
  const { streak, restCycles, sessions = [], daysPerCycle, weekStartDay = 'monday' } = goal.isConfigured ? goal : {}
  const isCurrentCycle = cycleOffset === 0

  const referenceDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + cycleOffset * CYCLE_LENGTH)
    return d
  }, [cycleOffset])

  const sessionsByCycle = useMemo(
    () => sessions.length ? countSessionsByCycle(sessions, CYCLE_LENGTH, weekStartDay) : {},
    [sessions, weekStartDay]
  )

  const viewedCycleDays = useMemo(
    () => getCurrentCycleDays(sessions, CYCLE_LENGTH, referenceDate, weekStartDay),
    [sessions, referenceDate, weekStartDay]
  )

  const dateRangeLabel = useMemo(() => {
    const { start, end } = getCycleDateRange(CYCLE_LENGTH, referenceDate, weekStartDay)
    return `${formatShortDate(start)} – ${formatShortDate(end)}`
  }, [referenceDate, weekStartDay])

  const handleShareLastSession = async (sessionId) => {
    setLoadingShare(true)
    try {
      setSummaryData(await fetchWorkoutSummary(sessionId, { weightUnit: globalWeightUnit }))
    } finally {
      setLoadingShare(false)
    }
  }

  if (goal.isLoading) return null

  if (!goal.isConfigured && goal.showWidget) {
    return (
      <SetupPrompt
        showSetup={showSetup}
        daysInput={daysInput}
        onToggleSetup={() => setShowSetup(!showSetup)}
        onDaysChange={setDaysInput}
        onSave={() => {
          if (daysInput >= 1 && daysInput <= 7) {
            updatePreference.mutate({ key: 'training_days_per_week', value: daysInput })
            setShowSetup(false)
          }
        }}
        onDismiss={() => {
          updatePreference.mutate({ key: 'show_training_goal', value: false })
        }}
      />
    )
  }

  if (!goal.showWidget || !goal.isConfigured) return null

  const viewedCycleKey = getCurrentCycleKey(CYCLE_LENGTH, referenceDate, weekStartDay)
  const viewedProgress = getCurrentCycleProgress(sessionsByCycle, daysPerCycle, CYCLE_LENGTH, referenceDate, weekStartDay)
  const viewedIsRest = restCycles.includes(viewedCycleKey)

  const handleToggleRestCycle = () => {
    const newRestCycles = viewedIsRest
      ? restCycles.filter(k => k !== viewedCycleKey)
      : [...restCycles, viewedCycleKey]
    updatePreference.mutate({ key: 'training_rest_weeks', value: newRestCycles })
  }

  const handleDayPress = (day) => {
    if (!day.hasSession || !navigation) return
    navigation.navigate('SessionDetail', { sessionId: day.sessions[day.sessions.length - 1].id })
  }

  const lastSession = isCurrentCycle && !viewedIsRest ? getLastCycleSession(viewedCycleDays) : null

  return (
    <View className="mb-6">
      <Card className="overflow-hidden">
        {/* Cycle navigation */}
        <View className="flex-row items-center justify-between px-3 py-2" style={{ backgroundColor: colors.bgTertiary }}>
          <Pressable onPress={() => setCycleOffset(o => Math.max(o - 1, MAX_OFFSET))} className="p-1">
            <ChevronLeft size={14} color={colors.textSecondary} />
          </Pressable>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textSecondary }}>
            {dateRangeLabel}
          </Text>
          {isCurrentCycle ? (
            onOpenSettings ? (
              <Pressable onPress={onOpenSettings} className="p-1">
                <Settings size={14} color={colors.textSecondary} />
              </Pressable>
            ) : (
              <View style={{ width: 24 }} />
            )
          ) : (
            <Pressable onPress={() => setCycleOffset(o => o + 1)} className="p-1">
              <ChevronRight size={14} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <View className="px-3 py-3">
        {viewedIsRest ? (
          <View className="items-center gap-2 py-2">
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary }}>
              {t('common:preferences.rest')}
            </Text>
            {isCurrentCycle && streak > 0 && (
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {t('common:preferences.streakProtected')}
              </Text>
            )}
            <Pressable
              onPress={handleToggleRestCycle}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: colors.bgTertiary }}
            >
              <Play size={12} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary }}>
                {t('common:preferences.removeRest')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontSize: 12, fontWeight: '500', color: viewedProgress.isComplete ? colors.success : colors.textSecondary }}>
                {viewedProgress.completed}/{viewedProgress.target}
              </Text>
              {isCurrentCycle && streak > 0 && (
                <View className="flex-row items-center gap-1">
                  <Flame size={14} color={colors.warning} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.warning }}>
                    {t('common:preferences.streak', { count: streak })}
                  </Text>
                </View>
              )}
              <Pressable onPress={handleToggleRestCycle} className="p-1">
                <Pause size={12} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between gap-1">
              {viewedCycleDays.map((day) => (
                <DaySlot key={day.dateStr} day={day} onPress={() => handleDayPress(day)} />
              ))}
            </View>

            {lastSession && (
              <Pressable
                onPress={() => handleShareLastSession(lastSession.id)}
                disabled={loadingShare}
                className="flex-row items-center gap-1.5 mt-3 self-center"
              >
                <Share2 size={12} color={colors.accent} />
                <Text style={{ fontSize: 12, color: colors.accent }}>
                  {loadingShare ? t('common:buttons.loading') : t('common:preferences.shareLastWorkout')}
                </Text>
              </Pressable>
            )}
          </View>
        )}
        </View>
      </Card>

      <WorkoutSummaryModal
        summaryData={summaryData}
        isOpen={!!summaryData}
        onClose={() => setSummaryData(null)}
      />
    </View>
  )
}

function DaySlot({ day, onPress }) {
  const filled = day.hasSession
  const isToday = day.isToday
  const isFuture = !day.isPast && !day.isToday

  return (
    <Pressable onPress={onPress} disabled={!filled} className="items-center gap-1 flex-1">
      <Text style={{ fontSize: 10, fontWeight: '500', color: isToday ? colors.textPrimary : colors.textMuted }}>
        {day.label}
      </Text>
      <View
        className="w-7 h-7 rounded-md items-center justify-center"
        style={{
          backgroundColor: filled
            ? colors.success
            : isToday
              ? colors.accentBg
              : colors.bgTertiary,
          borderWidth: 2,
          borderStyle: filled ? 'solid' : 'dashed',
          borderColor: filled
            ? 'transparent'
            : isToday
              ? colors.accent
              : colors.border,
          opacity: isFuture && !filled ? 0.4 : 1,
        }}
      >
        {filled && <Check size={14} color={colors.white} strokeWidth={3} />}
        {!filled && day.isPast && (
          <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '700' }}>–</Text>
        )}
      </View>
      <View
        className="w-1 h-1 rounded-full mt-0.5"
        style={{ backgroundColor: isToday ? colors.accent : 'transparent' }}
      />
    </Pressable>
  )
}

function SetupPrompt({ showSetup, daysInput, onToggleSetup, onDaysChange, onSave, onDismiss }) {
  const { t } = useTranslation()
  return (
    <View className="mb-6">
      <Card className="p-4">
        {!showSetup ? (
          <View className="flex-row items-center justify-between">
            <Pressable className="flex-row items-center gap-3 flex-1" onPress={onToggleSetup}>
              <View className="p-2 rounded-lg" style={{ backgroundColor: colors.warningBg }}>
                <Flame size={20} color={colors.warning} />
              </View>
              <View>
                <Text className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                  {t('common:preferences.showTrainingGoal')}
                </Text>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  {t('common:preferences.trackConsistency')}
                </Text>
              </View>
            </Pressable>
            <Pressable onPress={onDismiss} className="p-1.5">
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : (
          <View>
            <Text className="text-sm font-medium mb-3" style={{ color: colors.textPrimary }}>
              {t('common:preferences.daysPerCycle')}
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-row gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <Pressable
                    key={n}
                    onPress={() => onDaysChange(n)}
                    className="w-9 h-9 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor: n === daysInput ? colors.accent : colors.bgTertiary,
                    }}
                  >
                    <Text className="text-sm font-medium" style={{
                      color: n === daysInput ? colors.white : colors.textSecondary,
                    }}>
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={onSave}
                disabled={!daysInput}
                className="px-3 h-9 rounded-lg items-center justify-center"
                style={{
                  backgroundColor: daysInput ? colors.success : colors.bgTertiary,
                  opacity: daysInput ? 1 : 0.5,
                }}
              >
                <Text className="text-sm font-medium" style={{
                  color: daysInput ? colors.white : colors.textSecondary,
                }}>
                  {t('common:buttons.save')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Card>
    </View>
  )
}

export default WeeklyGoalWidget
