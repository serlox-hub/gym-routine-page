import { useState, useMemo } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Clock, Calendar, Trash2, Trophy, Share2, TrendingUp, Pencil, Plus, X } from 'lucide-react-native'
import { useSessionDetail, useDeleteSession, useSessionPRs, useUpdateSessionMetadata, useUpsertCompletedSet, useDeleteCompletedSet } from '../hooks/useWorkout'
import { LoadingSpinner, ErrorMessage, Card, NotesBadge, ConfirmModal, PageHeader, Button } from '../components/ui'
import { SetNotesView, WorkoutSummaryModal } from '../components/Workout'
import {
  SENSATION_LABELS,
  formatFullDate,
  formatSetValue,
  formatTime,
  getSensationColor,
  findPRSetNumbers,
  buildWorkoutSummaryFromSession,
  buildPRsByExerciseMap,
  recalculateExercisePRs,
  buildEmptySetData,
  getSetFieldsForMeasurementType,
} from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../lib/muscleGroupStyles'
import { colors, inputStyle } from '../lib/styles'

function EditableSetRow({ set, exercise, sessionId, sessionExerciseId, isSetPR, onUpsert, onDelete }) {
  const { showWeight, showReps, showTime, showDistance } = getSetFieldsForMeasurementType(exercise.measurement_type)

  const [weight, setWeight] = useState(String(set.weight ?? ''))
  const [reps, setReps] = useState(String(set.reps_completed ?? ''))
  const [timeSeconds, setTimeSeconds] = useState(String(set.time_seconds ?? ''))
  const [distanceMeters, setDistanceMeters] = useState(String(set.distance_meters ?? ''))
  const [setType, setSetType] = useState(set.set_type ?? 'normal')

  const buildPayload = (overrides = {}) => ({
    sessionId,
    sessionExerciseId,
    setNumber: set.set_number,
    weight: weight ? parseFloat(weight) : null,
    weightUnit: set.weight_unit || 'kg',
    repsCompleted: reps ? parseInt(reps, 10) : null,
    timeSeconds: timeSeconds ? parseInt(timeSeconds, 10) : null,
    distanceMeters: distanceMeters ? parseFloat(distanceMeters) : null,
    paceSeconds: set.pace_seconds,
    rirActual: set.rir_actual,
    notes: set.notes,
    videoUrl: set.video_url,
    setType,
    ...overrides,
  })

  const handleSave = () => onUpsert(buildPayload())

  const handleToggleDropset = () => {
    const newType = setType === 'dropset' ? 'normal' : 'dropset'
    setSetType(newType)
    onUpsert(buildPayload({ setType: newType }))
  }

  return (
    <View
      className="flex-row items-center gap-2 py-2 px-3 rounded"
      style={{
        backgroundColor: isSetPR ? 'rgba(210, 153, 34, 0.15)' : colors.bgTertiary,
        borderLeftWidth: 3,
        borderLeftColor: isSetPR ? colors.warning : 'transparent',
      }}
    >
      <Pressable
        onPress={handleToggleDropset}
        className="w-6 h-6 rounded-full items-center justify-center"
        style={{ backgroundColor: setType === 'dropset' ? colors.orange : isSetPR ? colors.warning : colors.success }}
      >
        <Text className="text-xs font-bold" style={{ color: colors.bgPrimary }}>
          {setType === 'dropset' ? 'D' : set.set_number}
        </Text>
      </Pressable>

      {showWeight && (
        <View className="flex-row items-center gap-1 flex-1">
          <TextInput
            value={weight}
            onChangeText={setWeight}
            onBlur={handleSave}
            keyboardType="decimal-pad"
            style={[inputStyle, { flex: 1, paddingVertical: 4, textAlign: 'center' }]}
            placeholderTextColor={colors.textMuted}
          />
          <Text className="text-xs" style={{ color: colors.textSecondary }}>{exercise.weight_unit || 'kg'}</Text>
        </View>
      )}
      {showWeight && showReps && <Text style={{ color: colors.textSecondary }}>×</Text>}
      {showReps && (
        <View className="flex-row items-center gap-1 flex-1">
          <TextInput
            value={reps}
            onChangeText={setReps}
            onBlur={handleSave}
            keyboardType="number-pad"
            style={[inputStyle, { flex: 1, paddingVertical: 4, textAlign: 'center' }]}
            placeholderTextColor={colors.textMuted}
          />
          <Text className="text-xs" style={{ color: colors.textSecondary }}>reps</Text>
        </View>
      )}
      {showTime && (
        <View className="flex-row items-center gap-1 flex-1">
          <TextInput
            value={timeSeconds}
            onChangeText={setTimeSeconds}
            onBlur={handleSave}
            keyboardType="number-pad"
            style={[inputStyle, { flex: 1, paddingVertical: 4, textAlign: 'center' }]}
            placeholderTextColor={colors.textMuted}
          />
          <Text className="text-xs" style={{ color: colors.textSecondary }}>{exercise.time_unit || 's'}</Text>
        </View>
      )}
      {showDistance && (
        <View className="flex-row items-center gap-1 flex-1">
          <TextInput
            value={distanceMeters}
            onChangeText={setDistanceMeters}
            onBlur={handleSave}
            keyboardType="decimal-pad"
            style={[inputStyle, { flex: 1, paddingVertical: 4, textAlign: 'center' }]}
            placeholderTextColor={colors.textMuted}
          />
          <Text className="text-xs" style={{ color: colors.textSecondary }}>{exercise.distance_unit || 'm'}</Text>
        </View>
      )}
      <Pressable onPress={() => onDelete({ sessionId, sessionExerciseId, setNumber: set.set_number })} hitSlop={8}>
        <X size={14} color={colors.danger} />
      </Pressable>
    </View>
  )
}

export default function SessionDetailScreen({ route, navigation }) {
  const { t } = useTranslation()
  const { sessionId } = route.params
  const { data: session, isLoading, error } = useSessionDetail(sessionId)
  const { data: sessionPRsData } = useSessionPRs(sessionId)
  const deleteSession = useDeleteSession()
  const updateMetadata = useUpdateSessionMetadata()
  const upsertSet = useUpsertCompletedSet()
  const deleteSet = useDeleteCompletedSet()

  const [selectedSet, setSelectedSet] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [editNotes, setEditNotes] = useState('')
  const [editCompletedAt, setEditCompletedAt] = useState('')
  const [editTimeText, setEditTimeText] = useState('')

  const prsByExercise = useMemo(() => buildPRsByExerciseMap(sessionPRsData), [sessionPRsData])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />
  if (!session) return <ErrorMessage message={t('workout:session.notFound')} className="m-4" />

  const formatTimeFromISO = (isoString) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    setEditNotes(session.notes || '')
    setEditCompletedAt(session.completed_at || '')
    setEditTimeText(formatTimeFromISO(session.completed_at))
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleSaveMetadata = async () => {
    const startedAt = new Date(session.started_at)
    const completedAt = editCompletedAt ? new Date(editCompletedAt) : new Date(session.completed_at)
    const durationMinutes = Math.round((completedAt - startedAt) / 60000)

    await updateMetadata.mutateAsync({
      sessionId,
      completedAt: completedAt.toISOString(),
      durationMinutes: Math.max(0, durationMinutes),
      overallFeeling: session.overall_feeling,
      notes: editNotes.trim() || null,
    })

    // Recalcular PRs
    const exerciseIds = session.exercises?.map(e => e.exercise?.id).filter(Boolean) || []
    if (exerciseIds.length > 0) {
      try {
        await Promise.all(exerciseIds.map(eid => recalculateExercisePRs(eid, session.started_at)))
      } catch { /* no bloquear */ }
    }

    setIsEditing(false)
  }

  const handleUpsertSet = (setData) => {
    upsertSet.mutate(setData)
  }

  const handleDeleteSet = (setData) => {
    deleteSet.mutate(setData)
  }

  const handleAddSet = (sessionExerciseId, exercise, currentMaxSetNumber) => {
    upsertSet.mutate(buildEmptySetData({
      sessionId,
      sessionExerciseId,
      setNumber: currentMaxSetNumber + 1,
      exercise,
    }))
  }

  const menuItems = [
    !isEditing && { icon: Pencil, label: t('common:buttons.edit'), onPress: handleStartEdit },
    { icon: Trash2, label: t('common:buttons.delete'), onPress: () => setShowDeleteConfirm(true), danger: true },
  ].filter(Boolean)

  const handleTimeBlur = () => {
    const match = editTimeText.match(/^(\d{1,2}):(\d{2})$/)
    if (match) {
      const d = new Date(session.completed_at || session.started_at)
      d.setHours(parseInt(match[1], 10), parseInt(match[2], 10))
      setEditCompletedAt(d.toISOString())
    } else {
      setEditTimeText(formatTimeFromISO(editCompletedAt || session.completed_at))
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader
        title={t('workout:history.viewDetail')}
        onBack={() => navigation.goBack()}
        menuItems={menuItems}
      />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: isEditing ? 120 : 40 }} keyboardShouldPersistTaps="handled">
        <Card className="p-4 mb-4">
          <View className="gap-3">
            <View>
              <Text className="text-xs text-secondary">{t('routine:day.title')}</Text>
              <Text className="text-sm font-medium text-primary">
                {session.day_name || session.routine_day?.name || t('workout:session.freeWorkout')}
              </Text>
            </View>

            {(session.routine_name || session.routine_day?.routine?.name) && (
              <View>
                <Text className="text-xs text-secondary">{t('routine:title')}</Text>
                <Text className="text-sm text-primary">
                  {session.routine_name || session.routine_day?.routine?.name}
                </Text>
              </View>
            )}

            <View className="flex-row gap-4">
              <View className="flex-row items-center gap-2">
                <Calendar size={16} color={colors.textSecondary} />
                <View>
                  <Text className="text-xs text-secondary">{t('workout:history.date')}</Text>
                  <Text className="text-sm text-primary capitalize">{formatFullDate(session.started_at)}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <Clock size={16} color={colors.textSecondary} />
                <View>
                  <Text className="text-xs text-secondary">{t('workout:history.time')}</Text>
                  <Text className="text-sm text-primary">{formatTime(session.started_at)}</Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-4">
              {isEditing ? (
                <View className="flex-1">
                  <Text className="text-xs text-secondary mb-1">{t('workout:history.endTime')}</Text>
                  <TextInput
                    value={editTimeText}
                    onChangeText={setEditTimeText}
                    onBlur={handleTimeBlur}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                    style={[inputStyle, { paddingVertical: 6 }]}
                  />
                </View>
              ) : (
                <>
                  {session.duration_minutes != null && (
                    <View>
                      <Text className="text-xs text-secondary">{t('workout:summary.duration')}</Text>
                      <Text className="text-sm text-primary">
                        {session.duration_minutes > 0 ? `${session.duration_minutes} ${t('common:time.min')}` : `< 1 ${t('common:time.min')}`}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {session.overall_feeling && (
                <View>
                  <Text className="text-xs text-secondary">{t('workout:sensation.label')}</Text>
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

          {isEditing ? (
            <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text className="text-xs text-secondary mb-1">{t('common:labels.notes')}</Text>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder={t('workout:session.notesPlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                style={[inputStyle, { textAlignVertical: 'top', minHeight: 56 }]}
              />
            </View>
          ) : (
            session.notes && (
              <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text className="text-xs text-secondary mb-1">{t('common:labels.notes')}</Text>
                <Text className="text-sm text-primary">{session.notes}</Text>
              </View>
            )
          )}
        </Card>

        <Text className="text-lg font-bold text-primary mb-3">{t('workout:session.exercises')}</Text>

        <View className="gap-3">
          {session.exercises?.map(({ sessionExerciseId, exercise, sets }) => {
            const prData = prsByExercise[exercise.id]
            const prSetNums = prData ? findPRSetNumbers(sets, prData) : null
            const maxSetNumber = sets.length > 0 ? Math.max(...sets.map(s => s.set_number)) : 0
            return (
            <Card key={sessionExerciseId} className="p-4" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
              <View className="flex-row items-start justify-between gap-2 mb-3">
                <View className="flex-1 flex-row flex-wrap items-center gap-2">
                  <Text
                    className={`font-medium ${exercise.deleted_at ? 'line-through' : ''}`}
                    style={{ color: exercise.deleted_at ? colors.textSecondary : colors.textPrimary }}
                  >
                    {exercise.name}
                  </Text>
                  {prData && (
                    <View
                      className="flex-row items-center gap-1 px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: colors.warningBg }}
                    >
                      <Trophy size={10} color={colors.warning} />
                      <Text className="text-xs font-bold" style={{ color: colors.warning }}>PR</Text>
                    </View>
                  )}
                  {exercise.deleted_at && (
                    <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.dangerBg }}>
                      <Text className="text-xs" style={{ color: colors.danger }}>{t('exercise:deleted')}</Text>
                    </View>
                  )}
                </View>
                {!exercise.deleted_at && (
                  <Pressable
                    onPress={() => navigation.navigate('ExerciseProgress', { exerciseId: exercise.id })}
                    className="p-1.5 rounded"
                    style={{ backgroundColor: colors.bgTertiary }}
                  >
                    <TrendingUp size={14} color={colors.purple} />
                  </Pressable>
                )}
              </View>

              <View className="gap-2">
                {isEditing ? (
                  <>
                    {sets.map(set => (
                      <EditableSetRow
                        key={set.id}
                        set={set}
                        exercise={exercise}
                        sessionId={sessionId}
                        sessionExerciseId={sessionExerciseId}
                        isSetPR={prSetNums?.has(set.set_number)}
                        onUpsert={handleUpsertSet}
                        onDelete={handleDeleteSet}
                      />
                    ))}
                    <Pressable
                      onPress={() => handleAddSet(sessionExerciseId, exercise, maxSetNumber)}
                      className="flex-row items-center justify-center gap-1 py-2 rounded"
                      style={{ backgroundColor: colors.bgTertiary }}
                    >
                      <Plus size={14} color={colors.accent} />
                      <Text className="text-xs" style={{ color: colors.accent }}>{t('workout:set.addSet')}</Text>
                    </Pressable>
                  </>
                ) : (
                  sets.map(set => {
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
                      {set.set_type === 'dropset' && (
                        <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.orangeBg }}>
                          <Text className="text-xs font-bold" style={{ color: colors.orange }}>D</Text>
                        </View>
                      )}
                      <NotesBadge
                        rir={set.rir_actual}
                        hasNotes={!!set.notes}
                        hasVideo={!!set.video_url}
                        onPress={(set.notes || set.video_url) ? () => setSelectedSet(set) : null}
                      />
                    </View>
                    )
                  })
                )}
              </View>
            </Card>
            )
          })}
        </View>
      </ScrollView>

      {isEditing ? (
        <View
          className="flex-row gap-3 px-4 py-3"
          style={{ backgroundColor: colors.bgSecondary, borderTopWidth: 1, borderTopColor: colors.border }}
        >
          <Button variant="secondary" className="flex-1" onPress={handleCancelEdit}>
            {t('common:buttons.cancel')}
          </Button>
          <Button className="flex-1" onPress={handleSaveMetadata} loading={updateMetadata.isPending}>
            {t('common:buttons.save')}
          </Button>
        </View>
      ) : (
        <View
          className="items-center px-4 py-3"
          style={{ borderTopWidth: 1, borderTopColor: colors.border }}
        >
          <Pressable
            onPress={() => setShowSummary(true)}
            className="flex-row items-center gap-2 px-5 py-2.5 rounded-lg"
            style={{ backgroundColor: colors.accent }}
          >
            <Share2 size={16} color={colors.white} />
            <Text style={{ color: colors.white, fontSize: 14, fontWeight: '500' }}>{t('common:buttons.share')}</Text>
          </Pressable>
        </View>
      )}
      </KeyboardAvoidingView>

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
        title={t('workout:history.deleteSession')}
        message={t('workout:session.deleteConfirm')}
        confirmText={t('common:buttons.delete')}
        loadingText={t('common:buttons.loading')}
        isLoading={deleteSession.isPending}
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
