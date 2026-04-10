import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus, Pin, ChevronRight } from 'lucide-react-native'
import { useRoutines } from '@gym/shared'
import { useStartSession } from '../../hooks/useWorkout'
import useWorkoutStore from '../../stores/workoutStore'
import { RoutineCard } from '../Routine'
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
  const [freePressed, setFreePressed] = useState(false)

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
        <View style={{ marginBottom: 10 }}>
          <RoutineCard
            routine={pinnedRoutine}
            isPinned
            onPress={() => navigation.navigate('RoutineDetail', { routineId: pinnedRoutine.id })}
          />
        </View>

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
        onPressIn={() => setFreePressed(true)}
        onPressOut={() => setFreePressed(false)}
        style={{
          backgroundColor: freePressed && !isRoutineSessionActive ? colors.bgAlt : colors.bgSecondary,
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
