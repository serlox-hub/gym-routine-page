import { useState, useMemo } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { Trash2, ChevronRight, Share2, Pencil, Plus, X, FileText, Video, Trophy } from 'lucide-react-native'
import { useSessionDetail, useDeleteSession, useSessionPRs, useUpdateSessionMetadata, useUpsertCompletedSet, useDeleteCompletedSet } from '../../hooks/useWorkout'
import { useUserExerciseOverride } from '../../hooks/useExercises'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, Button, DropdownMenu } from '../ui'
import { SetNotesView, WorkoutSummaryModal, ExerciseHistoryModal } from '../Workout'
import {
  SENSATION_LABELS,
  formatFullDate,
  formatSetValue,
  formatTime,
  getSensationColor,
  findPRSetNumbers,
  fetchWorkoutSummary,
  buildPRsByExerciseMap,
  recalculateExercisePRs,
  buildEmptySetData,
  getSetFieldsForMeasurementType,
  getExerciseName,
  getMuscleGroupName,
  getMuscleGroupColor,
  usePreference,
  resolveWeightUnit,
} from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'
import { colors, inputStyle } from '../../lib/styles'

function EditableSetRow({ set, exercise, sessionId, sessionExerciseId, isSetPR, onUpsert, onDelete, weightUnit }) {
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
        backgroundColor: isSetPR ? colors.warningBg : colors.bgTertiary,
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
          <Text className="text-xs" style={{ color: colors.textSecondary }}>{weightUnit}</Text>
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
          <Text className="text-xs" style={{ color: colors.textSecondary }}>s</Text>
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
          <Text className="text-xs" style={{ color: colors.textSecondary }}>m</Text>
        </View>
      )}
      <Pressable onPress={() => onDelete({ sessionId, sessionExerciseId, setNumber: set.set_number })} hitSlop={8}>
        <X size={14} color={colors.danger} />
      </Pressable>
    </View>
  )
}

function SessionExerciseBlock({ sessionExerciseId, exercise, sets, sessionId, prsByExercise, globalWeightUnit, isEditing, navigation, onUpsertSet, onDeleteSet, onAddSet, onSelectSet }) {
  const { t } = useTranslation()
  const { data: override } = useUserExerciseOverride(exercise.id)
  const weightUnit = resolveWeightUnit(override, { weight_unit: globalWeightUnit })
  const prData = prsByExercise[exercise.id]
  const prSetNums = prData ? findPRSetNumbers(sets, prData) : null
  const maxSetNumber = sets.length > 0 ? Math.max(...sets.map(s => s.set_number)) : 0
  const [showHistory, setShowHistory] = useState(false)
  const measurementType = exercise.measurement_type || 'weight_reps'

  return (
    <Card className="p-4" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
      <View className="flex-row items-start justify-between gap-2 mb-3">
        <View className="flex-1 flex-row flex-wrap items-center gap-2">
          <Text
            className={`font-medium ${exercise.deleted_at ? 'line-through' : ''}`}
            style={{ color: exercise.deleted_at ? colors.textSecondary : colors.textPrimary }}
          >
            {getExerciseName(exercise)}
          </Text>
          {exercise.deleted_at && (
            <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.dangerBg }}>
              <Text className="text-xs" style={{ color: colors.danger }}>{t('exercise:deleted')}</Text>
            </View>
          )}
        </View>
        {!exercise.deleted_at && !isEditing && (
          <Pressable onPress={() => setShowHistory(true)}>
            <ChevronRight size={16} color={colors.textMuted} />
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
                onUpsert={onUpsertSet}
                onDelete={onDeleteSet}
                weightUnit={weightUnit}
              />
            ))}
            <Pressable
              onPress={() => onAddSet(sessionExerciseId, exercise, maxSetNumber)}
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
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <Text style={{ color: isSetPR ? colors.warning : colors.textMuted, fontSize: 12, width: 14, textAlign: 'right', fontWeight: isSetPR ? '700' : '400' }}>
                {set.set_type === 'dropset' ? 'D' : set.set_number}
              </Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 13 }}>
                  {formatSetValue({ ...set, weight_unit: weightUnit })}
                </Text>
                {isSetPR && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Trophy size={10} color={colors.warning} />
                    <Text style={{ color: colors.warning, fontSize: 10, fontWeight: '600' }}>PR</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {set.notes && (
                  <Pressable onPress={() => onSelectSet(set)}>
                    <FileText size={14} color={colors.textMuted} />
                  </Pressable>
                )}
                {set.video_url && (
                  <Pressable onPress={() => onSelectSet(set)}>
                    <Video size={14} color={colors.textMuted} />
                  </Pressable>
                )}
                {set.rir_actual !== null && set.rir_actual !== undefined && (
                  <Text style={{ color: colors.textMuted, fontSize: 12, minWidth: 16, textAlign: 'right' }}>
                    {set.rir_actual}
                  </Text>
                )}
              </View>
            </View>
            )
          })
        )}
      </View>
      <ExerciseHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        exerciseId={exercise.id}
        exerciseName={getExerciseName(exercise)}
        measurementType={measurementType}
        weightUnit={weightUnit}
        onSessionClick={(sid, date) => {
          setShowHistory(false)
          navigation.navigate('MainTabs', { screen: 'History', params: { sessionId: sid, sessionDate: date } })
        }}
      />
    </Card>
  )
}

function SessionInlineDetail({ sessionId, navigation: navigationProp }) {
  const navigationHook = useNavigation()
  const navigation = navigationProp || navigationHook
  const { t } = useTranslation()
  const { data: session, isLoading, error } = useSessionDetail(sessionId)
  const { data: sessionPRsData } = useSessionPRs(sessionId)
  const deleteSession = useDeleteSession()
  const updateMetadata = useUpdateSessionMetadata()
  const upsertSet = useUpsertCompletedSet()
  const deleteSet = useDeleteCompletedSet()

  const [selectedSet, setSelectedSet] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [summaryData, setSummaryData] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [editCompletedAt, setEditCompletedAt] = useState('')
  const [editTimeText, setEditTimeText] = useState('')
  const { value: globalWeightUnit } = usePreference('weight_unit')

  const prsByExercise = useMemo(() => buildPRsByExerciseMap(sessionPRsData), [sessionPRsData])

  const muscleGroups = useMemo(() => {
    if (!session?.exercises) return []
    const seen = new Set()
    return session.exercises
      .map(e => e.exercise?.muscle_group)
      .filter(mg => mg && !seen.has(mg.name) && seen.add(mg.name))
  }, [session])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} />
  if (!session) return null

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
    <View>
      {/* Metadata */}
      {isEditing ? (
        <View style={{ marginBottom: 24, gap: 12 }}>
          <View>
            <Text className="text-xs text-secondary mb-1">{t('workout:history.session')}</Text>
            <Text className="text-sm font-medium text-primary">
              {session.day_name || session.routine_day?.name || t('workout:session.freeWorkout')}
            </Text>
          </View>
          <View>
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
          <View>
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
        </View>
      ) : (
        <View style={{ marginBottom: 24, gap: 4 }}>
          {/* Title + kebab */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>
              {session.day_name || session.routine_day?.name || t('workout:session.freeWorkout')}
            </Text>
            <DropdownMenu items={[
              { icon: Pencil, label: t('common:buttons.edit'), onPress: handleStartEdit },
              { icon: Share2, label: t('common:buttons.share'), onPress: async () => setSummaryData(await fetchWorkoutSummary(sessionId, { weightUnit: globalWeightUnit })) },
              { icon: Trash2, label: t('common:buttons.delete'), onPress: () => setShowDeleteConfirm(true), danger: true },
            ]} />
          </View>

          {/* Routine name */}
          {(session.routine_day?.routine?.name || session.routine_name) && (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              {session.routine_day?.routine?.name || session.routine_name}
            </Text>
          )}

          {/* Date, time, duration, sensation — one line */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, textTransform: 'capitalize' }}>{formatFullDate(session.started_at)}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>·</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{formatTime(session.started_at)}</Text>
            {session.duration_minutes != null && (
              <>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>·</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {session.duration_minutes > 0 ? `${session.duration_minutes} ${t('common:time.min')}` : `< 1 ${t('common:time.min')}`}
                </Text>
              </>
            )}
            {session.overall_feeling && (
              <>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>·</Text>
                <View style={{ backgroundColor: getSensationColor(session.overall_feeling), borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: colors.bgPrimary, fontSize: 10, fontWeight: '600' }}>
                    {SENSATION_LABELS[session.overall_feeling]}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Notes */}
          {session.notes && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>{session.notes}</Text>
          )}

          {/* Muscle groups */}
          {muscleGroups.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {muscleGroups.map(mg => (
                <View
                  key={mg.name}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${getMuscleGroupColor(mg.name)}20`, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: getMuscleGroupColor(mg.name) }} />
                  <Text style={{ color: getMuscleGroupColor(mg.name), fontSize: 10, fontWeight: '500' }}>
                    {getMuscleGroupName(mg)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Edit save/cancel */}
      {isEditing && (
        <View className="flex-row gap-2 mb-4">
          <Button variant="secondary" className="flex-1" onPress={handleCancelEdit}>
            {t('common:buttons.cancel')}
          </Button>
          <Button className="flex-1" onPress={handleSaveMetadata} loading={updateMetadata.isPending}>
            {t('common:buttons.save')}
          </Button>
        </View>
      )}

      {/* Exercises */}
      <Text className="text-lg font-bold text-primary mb-3">{t('workout:session.exercises')}</Text>

      <View className="gap-3">
        {session.exercises?.map(({ sessionExerciseId, exercise, sets }) => (
          <SessionExerciseBlock
            key={sessionExerciseId}
            sessionExerciseId={sessionExerciseId}
            exercise={exercise}
            sets={sets}
            sessionId={sessionId}
            prsByExercise={prsByExercise}
            globalWeightUnit={globalWeightUnit}
            isEditing={isEditing}
            navigation={navigation}
            onUpsertSet={handleUpsertSet}
            onDeleteSet={handleDeleteSet}
            onAddSet={handleAddSet}
            onSelectSet={setSelectedSet}
          />
        ))}
      </View>

      {/* Modals */}
      <SetNotesView
        isOpen={!!selectedSet}
        onClose={() => setSelectedSet(null)}
        rir={selectedSet?.rir_actual}
        notes={selectedSet?.notes}
        videoUrl={selectedSet?.video_url}
      />

      <WorkoutSummaryModal
        summaryData={summaryData}
        isOpen={!!summaryData}
        onClose={() => setSummaryData(null)}
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
            onSuccess: () => setShowDeleteConfirm(false),
          })
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </View>
  )
}

export default SessionInlineDetail
