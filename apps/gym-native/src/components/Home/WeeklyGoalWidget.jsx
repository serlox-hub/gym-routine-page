import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Flame, X, Pause, Play, Settings, Check, Share2 } from 'lucide-react-native'
import { useTrainingGoal, useUpdateTrainingGoal, fetchWorkoutSummary, getLastCycleSession } from '@gym/shared'
import { Card } from '../ui'
import WorkoutSummaryModal from '../Workout/WorkoutSummaryModal'
import { colors } from '../../lib/styles'

function WeeklyGoalWidget({ onOpenSettings, navigation }) {
  const goal = useTrainingGoal()
  const updatePreference = useUpdateTrainingGoal()
  const [showSetup, setShowSetup] = useState(false)
  const [daysInput, setDaysInput] = useState(null)
  const [summaryData, setSummaryData] = useState(null)
  const [loadingShare, setLoadingShare] = useState(false)

  const handleShareLastSession = async (sessionId) => {
    setLoadingShare(true)
    try {
      setSummaryData(await fetchWorkoutSummary(sessionId))
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

  const { streak, cycleProgress, cycleDays, isRestCycle, currentCycleKey, restCycles } = goal

  const handleToggleRestCycle = () => {
    const newRestCycles = isRestCycle
      ? restCycles.filter(k => k !== currentCycleKey)
      : [...restCycles, currentCycleKey]
    updatePreference.mutate({ key: 'training_rest_weeks', value: newRestCycles })
  }

  const handleDayPress = (day) => {
    if (!day.hasSession || !navigation) return
    navigation.navigate('SessionDetail', { sessionId: day.sessions[day.sessions.length - 1].id })
  }

  const lastSession = !isRestCycle ? getLastCycleSession(cycleDays) : null

  return (
    <View className="mb-6">
      <Card className="px-3 py-3 overflow-hidden">
        {isRestCycle ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Pause size={14} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary }}>
                Descanso
              </Text>
              {streak > 0 && (
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  · racha protegida
                </Text>
              )}
            </View>
            <View className="flex-row items-center gap-1">
              <Pressable onPress={handleToggleRestCycle} className="p-1">
                <Play size={12} color={colors.textSecondary} />
              </Pressable>
              {onOpenSettings && (
                <Pressable onPress={onOpenSettings} className="p-1">
                  <Settings size={12} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontSize: 12, fontWeight: '500', color: cycleProgress.isComplete ? colors.success : colors.textSecondary }}>
                {cycleProgress.completed}/{cycleProgress.target}
              </Text>
              {streak > 0 && (
                <View className="flex-row items-center gap-1">
                  <Flame size={14} color={colors.warning} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.warning }}>
                    Racha de {streak}
                  </Text>
                </View>
              )}
              <View className="flex-row items-center gap-1">
                <Pressable onPress={handleToggleRestCycle} className="p-1">
                  <Pause size={12} color={colors.textSecondary} />
                </Pressable>
                {onOpenSettings && (
                  <Pressable onPress={onOpenSettings} className="p-1">
                    <Settings size={12} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            </View>

            <View className="flex-row items-center justify-between gap-1">
              {cycleDays.map((day) => (
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
                  {loadingShare ? 'Cargando...' : 'Compartir último entrenamiento'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
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
              ? 'rgba(88, 166, 255, 0.15)'
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
        {filled && <Check size={14} color="#fff" strokeWidth={3} />}
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
                  Establece un objetivo de entrenamiento
                </Text>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  Lleva el seguimiento de tu constancia
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
              Dias de entrenamiento por ciclo
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
                      color: n === daysInput ? '#fff' : colors.textSecondary,
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
                  color: daysInput ? '#fff' : colors.textSecondary,
                }}>
                  Guardar
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
