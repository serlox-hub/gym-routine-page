import { useState, useMemo } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Clock, Calendar, Trash2, Trophy, Share2 } from 'lucide-react-native'
import { useSessionDetail, useDeleteSession, useSessionPRs } from '../hooks/useWorkout'
import { LoadingSpinner, ErrorMessage, Card, NotesBadge, ConfirmModal, PageHeader } from '../components/ui'
import { SetNotesView, WorkoutSummaryModal } from '../components/Workout'
import {
  SENSATION_LABELS,
  formatFullDate,
  formatSetValue,
  formatTime,
  getSensationColor,
  findPRSetNumbers,
  buildWorkoutSummaryFromSession,
} from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../lib/muscleGroupStyles'
import { colors } from '../lib/styles'

export default function SessionDetailScreen({ route, navigation }) {
  const { sessionId } = route.params
  const { data: session, isLoading, error } = useSessionDetail(sessionId)
  const { data: sessionPRsData } = useSessionPRs(sessionId)
  const deleteSession = useDeleteSession()
  const [selectedSet, setSelectedSet] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  const prsByExercise = useMemo(() => {
    if (!sessionPRsData) return {}
    const map = {}
    for (const pr of sessionPRsData) {
      const hasPR = pr.is_pr_weight || pr.is_pr_reps || pr.is_pr_1rm || pr.is_pr_volume ||
        pr.is_pr_time || pr.is_pr_distance || pr.is_pr_pace
      if (hasPR) map[pr.exercise_id] = pr
    }
    return map
  }, [sessionPRsData])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />
  if (!session) return <ErrorMessage message="Sesión no encontrada" className="m-4" />

  const menuItems = [
    { icon: Share2, label: 'Compartir', onPress: () => setShowSummary(true) },
    { icon: Trash2, label: 'Eliminar', onPress: () => setShowDeleteConfirm(true), danger: true },
  ]

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader
        title="Detalle de sesión"
        onBack={() => navigation.goBack()}
        menuItems={menuItems}
      />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Card className="p-4 mb-4">
          <View className="gap-3">
            <View>
              <Text className="text-xs text-secondary">Día</Text>
              <Text className="text-sm font-medium text-primary">
                {session.day_name || session.routine_day?.name || 'Entrenamiento Libre'}
              </Text>
            </View>

            {(session.routine_name || session.routine_day?.routine?.name) && (
              <View>
                <Text className="text-xs text-secondary">Rutina</Text>
                <Text className="text-sm text-primary">
                  {session.routine_name || session.routine_day?.routine?.name}
                </Text>
              </View>
            )}

            <View className="flex-row gap-4">
              <View className="flex-row items-center gap-2">
                <Calendar size={16} color={colors.textSecondary} />
                <View>
                  <Text className="text-xs text-secondary">Fecha</Text>
                  <Text className="text-sm text-primary capitalize">{formatFullDate(session.started_at)}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <Clock size={16} color={colors.textSecondary} />
                <View>
                  <Text className="text-xs text-secondary">Hora</Text>
                  <Text className="text-sm text-primary">{formatTime(session.started_at)}</Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-4">
              {session.duration_minutes != null && (
                <View>
                  <Text className="text-xs text-secondary">Duración</Text>
                  <Text className="text-sm text-primary">
                    {session.duration_minutes > 0 ? `${session.duration_minutes} minutos` : '< 1 minuto'}
                  </Text>
                </View>
              )}
              {session.overall_feeling && (
                <View>
                  <Text className="text-xs text-secondary">Sensación</Text>
                  <View
                    className="px-2 py-0.5 rounded mt-1 self-start"
                    style={{ backgroundColor: getSensationColor(session.overall_feeling) }}
                  >
                    <Text className="text-xs font-medium" style={{ color: colors.bgPrimary }}>
                      {SENSATION_LABELS[session.overall_feeling]}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {session.notes && (
            <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text className="text-xs text-secondary mb-1">Notas</Text>
              <Text className="text-sm text-primary">{session.notes}</Text>
            </View>
          )}
        </Card>

        <Text className="text-lg font-bold text-primary mb-3">Ejercicios</Text>

        <View className="gap-3">
          {session.exercises?.map(({ sessionExerciseId, exercise, sets }) => {
            const prData = prsByExercise[exercise.id]
            const prSetNums = prData ? findPRSetNumbers(sets, prData) : null
            return (
            <Card key={sessionExerciseId} className="p-4" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
              <View className="flex-row items-start gap-2 mb-3">
                <Text
                  className={`font-medium flex-1 ${exercise.deleted_at ? 'line-through' : ''}`}
                  style={{ color: exercise.deleted_at ? colors.textSecondary : colors.textPrimary }}
                >
                  {exercise.name}
                </Text>
                {prData && (
                  <View
                    className="flex-row items-center gap-1 px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(210, 153, 34, 0.15)' }}
                  >
                    <Trophy size={10} color={colors.warning} />
                    <Text className="text-xs font-bold" style={{ color: colors.warning }}>PR</Text>
                  </View>
                )}
                {exercise.deleted_at && (
                  <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(248,81,73,0.3)' }}>
                    <Text className="text-xs" style={{ color: colors.danger }}>Eliminado</Text>
                  </View>
                )}
              </View>

              <View className="gap-2">
                {sets.map(set => {
                  const isSetPR = prSetNums?.has(set.set_number)
                  return (
                  <View
                    key={set.id}
                    className="flex-row items-center gap-3 py-2 px-3 rounded"
                    style={{
                      backgroundColor: isSetPR ? 'rgba(210, 153, 34, 0.15)' : colors.bgTertiary,
                      borderLeftWidth: 3,
                      borderLeftColor: isSetPR ? colors.warning : 'transparent',
                    }}
                  >
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{ backgroundColor: isSetPR ? colors.warning : colors.success }}
                    >
                      <Text className="text-xs font-bold" style={{ color: colors.bgPrimary }}>
                        {set.set_number}
                      </Text>
                    </View>
                    <Text className="flex-1 text-sm text-primary">
                      {formatSetValue(set, { timeUnit: exercise.time_unit, distanceUnit: exercise.distance_unit })}
                    </Text>
                    <NotesBadge
                      rir={set.rir_actual}
                      hasNotes={!!set.notes}
                      hasVideo={!!set.video_url}
                      onPress={(set.notes || set.video_url) ? () => setSelectedSet(set) : null}
                    />
                  </View>
                  )
                })}
              </View>
            </Card>
            )
          })}
        </View>
      </ScrollView>

      <SetNotesView
        isOpen={!!selectedSet}
        onClose={() => setSelectedSet(null)}
        rir={selectedSet?.rir_actual}
        notes={selectedSet?.notes}
        videoUrl={selectedSet?.video_url}
      />

      <WorkoutSummaryModal
        summaryData={showSummary ? buildWorkoutSummaryFromSession(session, sessionPRsData) : null}
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Eliminar sesión"
        message="¿Seguro que quieres eliminar esta sesión? Se eliminarán todas las series registradas."
        confirmText="Eliminar"
        onConfirm={() => {
          deleteSession.mutate({
            sessionId,
            exerciseIds: session.exercises?.map(e => e.exercise?.id).filter(Boolean) || [],
            sessionDate: session.started_at,
          }, {
            onSuccess: () => {
              setShowDeleteConfirm(false)
              navigation.goBack()
            },
          })
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </SafeAreaView>
  )
}
