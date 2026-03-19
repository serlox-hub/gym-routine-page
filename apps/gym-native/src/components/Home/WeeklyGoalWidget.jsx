import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Flame, X, Pause, Play, Settings } from 'lucide-react-native'
import { useTrainingGoal, useUpdateTrainingGoal } from '@gym/shared'
import { Card } from '../ui'
import { colors } from '../../lib/styles'

function WeeklyGoalWidget({ onOpenSettings }) {
  const goal = useTrainingGoal()
  const updatePreference = useUpdateTrainingGoal()
  const [showSetup, setShowSetup] = useState(false)
  const [daysInput, setDaysInput] = useState(null)

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

  const { streak, weekProgress, isRestWeek, currentWeekKey, restWeeks } = goal

  const handleToggleRestWeek = () => {
    const newRestWeeks = isRestWeek
      ? restWeeks.filter(w => w !== currentWeekKey)
      : [...restWeeks, currentWeekKey]
    updatePreference.mutate({ key: 'training_rest_weeks', value: newRestWeeks })
  }

  const progressPercent = Math.min((weekProgress.completed / weekProgress.target) * 100, 100)

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-medium" style={{ color: colors.textSecondary }}>
          Objetivo semanal
        </Text>
        <View className="flex-row items-center gap-1">
          <Pressable onPress={handleToggleRestWeek} className="p-1.5">
            {isRestWeek
              ? <Play size={14} color={colors.textSecondary} />
              : <Pause size={14} color={colors.textSecondary} />
            }
          </Pressable>
          {onOpenSettings && (
            <Pressable onPress={onOpenSettings} className="p-1.5">
              <Settings size={14} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <Card className="p-4">
        {isRestWeek ? (
          <View className="flex-row items-center gap-3">
            <View className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(139, 148, 158, 0.15)' }}>
              <Pause size={20} color={colors.textSecondary} />
            </View>
            <View>
              <Text className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                Semana de descanso
              </Text>
              {streak > 0 && (
                <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                  Racha de {streak} {streak === 1 ? 'semana' : 'semanas'} protegida
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                {streak > 0 && (
                  <View className="flex-row items-center gap-1">
                    <Flame size={16} color={colors.warning} />
                    <Text className="text-sm font-bold" style={{ color: colors.warning }}>
                      {streak} {streak === 1 ? 'semana en racha' : 'semanas en racha'}
                    </Text>
                  </View>
                )}
                <Text className="text-sm" style={{ color: colors.textPrimary }}>
                  {weekProgress.completed}/{weekProgress.target} dias esta semana
                </Text>
              </View>
              {weekProgress.isComplete && (
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(63, 185, 80, 0.15)' }}>
                  <Text className="text-xs" style={{ color: colors.success }}>Completado</Text>
                </View>
              )}
            </View>

            <View className="w-full rounded-full h-2" style={{ backgroundColor: colors.bgTertiary }}>
              <View
                className="h-2 rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: weekProgress.isComplete ? colors.success : colors.accent,
                }}
              />
            </View>
          </View>
        )}
      </Card>
    </View>
  )
}

function SetupPrompt({ showSetup, daysInput, onToggleSetup, onDaysChange, onSave, onDismiss }) {
  return (
    <View className="mb-6">
      <Card className="p-4">
        {!showSetup ? (
          <View className="flex-row items-center justify-between">
            <Pressable className="flex-row items-center gap-3 flex-1" onPress={onToggleSetup}>
              <View className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(210, 153, 34, 0.15)' }}>
                <Flame size={20} color={colors.warning} />
              </View>
              <View>
                <Text className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                  Establece un objetivo semanal
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
              Dias de entrenamiento por semana
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
