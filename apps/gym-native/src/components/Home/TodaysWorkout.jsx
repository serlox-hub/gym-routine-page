import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Dumbbell, Plus, Play, ChevronRight, Star } from 'lucide-react-native'
import LinearGradient from 'react-native-linear-gradient'
import { useRoutines, useNextRoutineDay } from '@gym/shared'
import { useStartSession } from '../../hooks/useWorkout'
import { Card } from '../ui'
import useWorkoutStore from '../../stores/workoutStore'
import { colors, gradients, design } from '../../lib/styles'

function IconBg({ gradient, children }) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: design.iconBgSize, height: design.iconBgSize, borderRadius: design.iconBgRadius, alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </LinearGradient>
  )
}

function TodaysWorkout({ navigation }) {
  const { t } = useTranslation()
  const { data: routines } = useRoutines()
  const startSessionMutation = useStartSession()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const isFreeSessionActive = hasActiveSession && activeRoutineDayId === null
  const isRoutineSessionActive = hasActiveSession && activeRoutineDayId !== null

  const favoriteRoutine = routines?.find(r => r.is_favorite)
  const { nextDay, isLoading, isError } = useNextRoutineDay(favoriteRoutine?.id)

  const handleStartFreeWorkout = () => {
    useWorkoutStore.getState().showWorkout()
    startSessionMutation.mutate(undefined)
  }

  const hasRoutines = routines && routines.length > 0

  return (
    <View>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text style={{ color: colors.textPrimary, fontSize: design.sectionTitleSize, fontWeight: '700', letterSpacing: -0.3 }}>
          {t('common:home.todaysWorkout')}
        </Text>
        {hasRoutines && (
          <Text
            onPress={() => navigation.navigate('Routines')}
            style={{ color: colors.success, fontSize: 13, fontWeight: '500' }}
          >
            {t('common:buttons.seeAll')}
          </Text>
        )}
      </View>

      {/* Next routine day OR create routine */}
      {favoriteRoutine && nextDay && !isLoading && !isError ? (
        <Card
          className="p-3 mb-3"
          onPress={() => {
            useWorkoutStore.getState().setRoutineContext(favoriteRoutine.id, nextDay.id)
            useWorkoutStore.getState().showWorkout()
          }}
          style={isRoutineSessionActive ? { opacity: 0.5 } : {}}
        >
          <View className="flex-row items-center gap-3">
            <IconBg gradient={gradients.lime}>
              <Dumbbell size={design.iconSize} color={colors.bgPrimary} />
            </IconBg>
            <View className="flex-1">
              <Text style={{ color: colors.textPrimary, fontSize: design.cardTitleSize, fontWeight: '600' }}>
                {nextDay.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: design.cardMetaSize, marginTop: 2 }}>
                {favoriteRoutine.name}
                {nextDay.estimated_duration_min ? ` · ${nextDay.estimated_duration_min} min` : ''}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </View>
        </Card>
      ) : !hasRoutines ? (
        <Card
          className="p-3 mb-3"
          onPress={() => navigation.navigate('Routines', { openNewRoutine: true })}
        >
          <View className="flex-row items-center gap-3">
            <IconBg gradient={gradients.lime}>
              <Plus size={design.iconSize} color={colors.bgPrimary} />
            </IconBg>
            <View className="flex-1">
              <Text style={{ color: colors.textPrimary, fontSize: design.cardTitleSize, fontWeight: '600' }}>
                {t('common:home.createRoutine')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: design.cardMetaSize, marginTop: 2 }}>
                {t('common:home.createRoutineDesc')}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </View>
        </Card>
      ) : !favoriteRoutine ? (
        <Card
          className="p-3 mb-3"
          onPress={() => navigation.navigate('Routines')}
        >
          <View className="flex-row items-center gap-3">
            <View style={{ width: design.iconBgSize, height: design.iconBgSize, borderRadius: design.iconBgRadius, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgTertiary }}>
              <Star size={design.iconSize} color={colors.textSecondary} />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.textPrimary, fontSize: design.cardTitleSize, fontWeight: '600' }}>
                {t('common:home.setupFavorite')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: design.cardMetaSize, marginTop: 2 }}>
                {t('common:home.setupFavoriteDesc')}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </View>
        </Card>
      ) : null}

      {/* Free workout */}
      <Card
        className="p-3"
        onPress={
          isFreeSessionActive
            ? () => useWorkoutStore.getState().showWorkout()
            : isRoutineSessionActive
              ? undefined
              : !startSessionMutation.isPending
                ? handleStartFreeWorkout
                : undefined
        }
        style={isRoutineSessionActive ? { opacity: 0.5 } : {}}
      >
        <View className="flex-row items-center gap-3">
          <IconBg gradient={gradients.orange}>
            <Play size={design.iconSize} color={colors.white} />
          </IconBg>
          <View className="flex-1">
            <Text style={{ color: colors.textPrimary, fontSize: design.cardTitleSize, fontWeight: '600' }}>
              {isFreeSessionActive
                ? t('workout:session.resume')
                : t('common:home.freeWorkout')
              }
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: design.cardMetaSize, marginTop: 2 }}>
              {t('common:home.freeWorkoutDesc')}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
      </Card>
    </View>
  )
}

export default TodaysWorkout
