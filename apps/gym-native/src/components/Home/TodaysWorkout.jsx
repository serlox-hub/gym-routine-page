import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus, ChevronRight, Pin, Repeat, Layers } from 'lucide-react-native'
import { useRoutines } from '@gym/shared'
import { useStartSession } from '../../hooks/useWorkout'
import useWorkoutStore from '../../stores/workoutStore'
import { colors, design } from '../../lib/styles'

function TodaysWorkout({ navigation }) {
  const { t } = useTranslation()
  const { data: routines } = useRoutines()
  const startSessionMutation = useStartSession()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const isFreeSessionActive = hasActiveSession && activeRoutineDayId === null
  const isRoutineSessionActive = hasActiveSession && activeRoutineDayId !== null

  const pinnedRoutine = routines?.find(r => r.is_favorite)
  const hasRoutines = routines && routines.length > 0

  const handleStartFreeWorkout = () => {
    useWorkoutStore.getState().showWorkout()
    startSessionMutation.mutate(undefined)
  }

  return (
    <View>
      <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 14 }}>
        {t('common:home.workout')}
      </Text>

      {/* Pinned routine card */}
      {pinnedRoutine ? (
        <Pressable
          onPress={() => navigation.navigate('RoutineDetail', { routineId: pinnedRoutine.id })}
          style={{
            backgroundColor: colors.bgSecondary,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            padding: 16,
            marginBottom: 10,
          }}
        >
          <View className="flex-row items-center gap-1.5 mb-2">
            <Pin size={12} color={colors.success} />
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              {t('common:home.pinnedToHome')}
            </Text>
          </View>
          <Text style={{ color: colors.textPrimary, fontSize: design.cardTitleSize + 1, fontWeight: '700' }}>
            {pinnedRoutine.name}
          </Text>
          {pinnedRoutine.description && (
            <Text style={{ color: colors.textSecondary, fontSize: design.cardMetaSize, marginTop: 4, lineHeight: 17 }}>
              {pinnedRoutine.description}
            </Text>
          )}
          <View className="flex-row items-center gap-2 mt-3">
            {pinnedRoutine.days_count > 0 && (
              <View className="flex-row items-center gap-1" style={{ backgroundColor: colors.bgAlt, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }}>
                <Repeat size={11} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '500' }}>
                  {t('common:home.nDays', { count: pinnedRoutine.days_count })}
                </Text>
              </View>
            )}
            {pinnedRoutine.exercises_count > 0 && (
              <View className="flex-row items-center gap-1" style={{ backgroundColor: colors.bgAlt, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }}>
                <Layers size={11} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '500' }}>
                  {t('common:home.nExercises', { count: pinnedRoutine.exercises_count })}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

      ) : !hasRoutines ? (
        <Pressable
          onPress={() => navigation.navigate('Routines', { openNewRoutine: true })}
          className="flex-row items-center justify-center gap-2"
          style={{
            backgroundColor: colors.success,
            borderRadius: 14,
            height: 48,
            marginBottom: 10,
          }}
        >
          <Plus size={18} color={colors.bgPrimary} />
          <Text style={{ color: colors.bgPrimary, fontSize: design.cardTitleSize, fontWeight: '700' }}>
            {t('common:home.createRoutine')}
          </Text>
        </Pressable>

      ) : (
        <Pressable
          onPress={() => navigation.navigate('Routines')}
          className="flex-row items-center"
          style={{
            backgroundColor: colors.bgSecondary,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            paddingVertical: 14,
            paddingHorizontal: 16,
            gap: 10,
            marginBottom: 10,
          }}
        >
          <Pin size={18} color={colors.textMuted} />
          <View className="flex-1">
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
              {t('common:home.pinRoutine')}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>
              {t('common:home.pinRoutineDesc')}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>
      )}

      {/* Free workout button */}
      <Pressable
        onPress={
          isFreeSessionActive
            ? () => useWorkoutStore.getState().showWorkout()
            : isRoutineSessionActive
              ? undefined
              : !startSessionMutation.isPending
                ? handleStartFreeWorkout
                : undefined
        }
        className="flex-row items-center justify-center gap-2"
        style={{
          backgroundColor: colors.bgSecondary,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          height: 48,
          opacity: isRoutineSessionActive ? 0.5 : 1,
        }}
      >
        <Plus size={16} color={colors.success} />
        <Text style={{ color: colors.textPrimary, fontSize: design.cardTitleSize, fontWeight: '600' }}>
          {isFreeSessionActive
            ? t('workout:session.resume')
            : t('common:home.freeWorkout')
          }
        </Text>
      </Pressable>
    </View>
  )
}

export default TodaysWorkout
