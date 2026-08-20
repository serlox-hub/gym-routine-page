import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus, Pin, ChevronRight } from 'lucide-react-native'
import { useRoutines, useSelectedGym, getFreeWorkoutAction, WORKOUT_START_ACTION, getNotifier } from '@gym/shared'
import { useStartSession } from '../../hooks/useWorkout'
import useWorkoutStore from '../../stores/workoutStore'
import { RoutineCard } from '../Routine'
import { Skeleton } from '../ui'
import { colors, design } from '../../lib/styles'

function TodaysWorkout({ navigation }) {
  const { t } = useTranslation()
  const { data: routines, isLoading: routinesLoading } = useRoutines()
  const startSessionMutation = useStartSession()
  const { gymId } = useSelectedGym()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const freeAction = getFreeWorkoutAction({
    hasActiveSession,
    routineDayId: activeRoutineDayId,
    isStarting: startSessionMutation.isPending,
  })
  const isFreeSessionActive = freeAction === WORKOUT_START_ACTION.RESUME
  const isRoutineSessionActive = freeAction === WORKOUT_START_ACTION.BLOCKED

  const pinnedRoutine = routines?.find(r => r.is_favorite)
  const hasRoutines = routines && routines.length > 0
  const [freePressed, setFreePressed] = useState(false)

  // Un botón que no responde y no dice nada parece roto. El caso BLOCKED (hay una sesión
  // de rutina en marcha) se explica con un aviso en vez de ignorar la pulsación.
  const handleFreeWorkoutPress = () => {
    switch (freeAction) {
      case WORKOUT_START_ACTION.RESUME:
        useWorkoutStore.getState().showWorkout()
        return
      case WORKOUT_START_ACTION.BLOCKED:
        getNotifier()?.show(t('workout:session.finishRoutineFirst'), 'info')
        return
      case WORKOUT_START_ACTION.START:
        useWorkoutStore.getState().showWorkout()
        startSessionMutation.mutate({ gymId })
        return
      case WORKOUT_START_ACTION.BUSY:
        return  // el arranque está en vuelo, ignorar la pulsación
    }
  }

  return (
    <View>
      <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 14 }}>
        {t('common:home.workout')}
      </Text>

      {/* Loading skeleton */}
      {routinesLoading ? (
        <View
          style={{
            backgroundColor: colors.bgSecondary,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: design.routineCardRadius,
            padding: design.routineCardPadding,
            gap: design.routineCardGap,
            marginBottom: 10,
          }}
        >
          <Skeleton width="60%" height={18} />
          <Skeleton width="100%" height={28} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Skeleton width={80} height={22} />
            <Skeleton width={100} height={22} />
          </View>
        </View>
      ) : pinnedRoutine ? (
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
        onPress={handleFreeWorkoutPress}
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
