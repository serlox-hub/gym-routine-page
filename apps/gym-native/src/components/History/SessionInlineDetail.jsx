import { useState, useMemo } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { Trash2, ChevronRight, Share2, Pencil, Plus, FileText, Video, Trophy, SlidersHorizontal, AlertCircle } from 'lucide-react-native'
import { useSessionDetail, useDeleteSession, useSessionPRs, useUpdateSessionMetadata, useUpsertCompletedSet, useDeleteCompletedSet } from '../../hooks/useWorkout'
import { useUserExerciseOverride } from '../../hooks/useExercises'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, DropdownMenu } from '../ui'
import { SetNotesView, WorkoutSummaryModal, ExerciseHistoryModal, SetDetailsModal } from '../Workout'
import { uploadVideo } from '../../lib/videoStorage'
import {
  SENSATION_LABELS,
  MeasurementType,
  formatFullDate,
  formatSetValue,
  formatTime,
  getSensationColor,
  findPRSetNumbers,
  fetchWorkoutSummary,
  buildPRsByExerciseMap,
  buildEmptySetData,
  getSetFieldsForMeasurementType,
  getExerciseName,
  getMuscleGroupName,
  getMuscleGroupColor,
  usePreference,
  resolveWeightUnit,
  toNullableFloat,
  toNullableInt,
  getNotifier,
  formatEffortBadge,
} from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'
import { colors } from '../../lib/styles'

function EditableSetRow({ set, exercise, sessionId, sessionExerciseId, isSetPR, onUpsert, onDelete, weightUnit }) {
  const { t } = useTranslation()
  const measurementType = exercise.measurement_type || MeasurementType.WEIGHT_REPS
  const { showWeight, showReps, showTime, showDistance } = getSetFieldsForMeasurementType(measurementType)
  const isWeightReps = measurementType === MeasurementType.WEIGHT_REPS

  const [weight, setWeight] = useState(String(set.weight ?? ''))
  const [reps, setReps] = useState(String(set.reps_completed ?? ''))
  const [timeSeconds, setTimeSeconds] = useState(String(set.time_seconds ?? ''))
  const [distanceMeters, setDistanceMeters] = useState(String(set.distance_meters ?? ''))
  const [setType, setSetType] = useState(set.set_type ?? 'normal')
  const [showDetails, setShowDetails] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoUploadError, setVideoUploadError] = useState(false)
  const [pendingVideoFile, setPendingVideoFile] = useState(null)

  const buildPayload = (overrides = {}) => ({
    sessionId,
    sessionExerciseId,
    setNumber: set.set_number,
    weight: toNullableFloat(weight),
    repsCompleted: toNullableInt(reps),
    timeSeconds: toNullableInt(timeSeconds),
    distanceMeters: toNullableFloat(distanceMeters),
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

  const uploadVideoInBackground = async (file) => {
    setIsUploadingVideo(true)
    setUploadProgress(0)
    setVideoUploadError(false)
    setPendingVideoFile(file)
    try {
      const uploadedUrl = await uploadVideo(file?.uri, setUploadProgress)
      onUpsert(buildPayload({ videoUrl: uploadedUrl }))
      setPendingVideoFile(null)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Video upload failed:', err)
      setVideoUploadError(true)
      getNotifier()?.show(t('workout:set.videoUploadError'), 'error')
    } finally {
      setIsUploadingVideo(false)
    }
  }

  const handleRetryVideoUpload = () => {
    if (pendingVideoFile) {
      uploadVideoInBackground(pendingVideoFile)
    }
  }

  const handleDetailsSubmit = ({ rir, notes, videoUrl, videoFile, setType: newSetType, weight: newWeight, reps: newReps }) => {
    setShowDetails(false)
    setSetType(newSetType)
    setWeight(String(newWeight ?? ''))
    setReps(String(newReps ?? ''))
    const overrides = {
      rirActual: rir,
      notes,
      videoUrl,
      setType: newSetType,
      weight: toNullableFloat(newWeight),
      repsCompleted: toNullableInt(newReps),
    }
    onUpsert(buildPayload(overrides))
    if (videoFile) {
      uploadVideoInBackground(videoFile)
    }
  }

  const inputStyle = { flex: 1, paddingVertical: 2, textAlign: 'center', fontSize: 13, color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border }

  const badgeStyle = {
    backgroundColor: colors.bgTertiary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  }

  const hasVideo = !!set.video_url
  const hasNotes = !!set.notes
  const hasRir = set.rir_actual != null

  const trailingBadges = (
    <>
      {hasNotes && (
        <Pressable onPress={() => setShowDetails(true)} style={badgeStyle} accessibilityLabel={t('workout:set.notes')}>
          <FileText size={13} color={colors.textSecondary} />
        </Pressable>
      )}
      {videoUploadError && (
        <Pressable onPress={handleRetryVideoUpload} style={[badgeStyle, { backgroundColor: colors.dangerBg }]} accessibilityLabel={t('common:buttons.retry')}>
          <AlertCircle size={13} color={colors.danger} />
        </Pressable>
      )}
      {isUploadingVideo && (
        <View style={[badgeStyle, { paddingHorizontal: 7, paddingVertical: 3 }]}>
          <Text style={{ color: colors.purple, fontSize: 11, fontWeight: '600' }}>{uploadProgress}%</Text>
        </View>
      )}
      {hasVideo && !isUploadingVideo && !videoUploadError && (
        <Pressable onPress={() => setShowDetails(true)} style={badgeStyle} accessibilityLabel={t('workout:set.addVideo')}>
          <Video size={13} color={colors.textSecondary} />
        </Pressable>
      )}
      {hasRir && (
        <Pressable onPress={() => setShowDetails(true)} style={[badgeStyle, { paddingHorizontal: 7, paddingVertical: 3 }]} accessibilityLabel={t('workout:set.rir')}>
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>
            {formatEffortBadge(set.rir_actual, measurementType)}
          </Text>
        </Pressable>
      )}
    </>
  )

  const menu = (
    <DropdownMenu
      triggerSize={14}
      items={[
        {
          label: t('common:buttons.edit'),
          icon: SlidersHorizontal,
          onPress: () => setShowDetails(true),
        },
        {
          label: t('common:buttons.delete'),
          icon: Trash2,
          onPress: () => onDelete({ sessionId, sessionExerciseId, setNumber: set.set_number }),
          danger: true,
        },
      ]}
    />
  )

  const trailingActions = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, width: 132 }}>
      {trailingBadges}
      {menu}
    </View>
  )

  if (isWeightReps) {
    return (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={handleToggleDropset}
            accessibilityLabel={t(setType === 'dropset' ? 'workout:set.removeDropset' : 'workout:set.markDropset')}
            style={{ width: 24, alignItems: 'center' }}
          >
            <Text style={{
              color: isSetPR ? colors.warning : setType === 'dropset' ? colors.orange : colors.textMuted,
              fontSize: 12,
              fontWeight: isSetPR || setType === 'dropset' ? '700' : '400',
            }}>
              {setType === 'dropset' ? 'D' : set.set_number}
            </Text>
          </Pressable>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            onBlur={handleSave}
            keyboardType="decimal-pad"
            style={inputStyle}
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            value={reps}
            onChangeText={setReps}
            onBlur={handleSave}
            keyboardType="number-pad"
            style={inputStyle}
            placeholderTextColor={colors.textMuted}
          />
          {trailingActions}
        </View>
        <SetDetailsModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          onSubmit={handleDetailsSubmit}
          mode="edit"
          setNumber={set.set_number}
          initialRir={set.rir_actual}
          initialNote={set.notes}
          initialVideoUrl={set.video_url}
          initialSetType={setType}
          measurementType={measurementType}
          weightUnit={weightUnit}
          weight={weight}
          reps={reps}
        />
      </>
    )
  }

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={handleToggleDropset}
          accessibilityLabel={t(setType === 'dropset' ? 'workout:set.removeDropset' : 'workout:set.markDropset')}
        >
          <Text style={{
            color: isSetPR ? colors.warning : setType === 'dropset' ? colors.orange : colors.textMuted,
            fontSize: 12, width: 14, textAlign: 'right',
            fontWeight: isSetPR || setType === 'dropset' ? '700' : '400',
          }}>
            {setType === 'dropset' ? 'D' : set.set_number}
          </Text>
        </Pressable>

        {showWeight && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 }}>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              onBlur={handleSave}
              keyboardType="decimal-pad"
              style={inputStyle}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>{weightUnit}</Text>
          </View>
        )}
        {showTime && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 }}>
            <TextInput
              value={timeSeconds}
              onChangeText={setTimeSeconds}
              onBlur={handleSave}
              keyboardType="number-pad"
              style={inputStyle}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>s</Text>
          </View>
        )}
        {showDistance && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 }}>
            <TextInput
              value={distanceMeters}
              onChangeText={setDistanceMeters}
              onBlur={handleSave}
              keyboardType="decimal-pad"
              style={inputStyle}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>m</Text>
          </View>
        )}
        {showReps && !isWeightReps && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 }}>
            <TextInput
              value={reps}
              onChangeText={setReps}
              onBlur={handleSave}
              keyboardType="number-pad"
              style={inputStyle}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>reps</Text>
          </View>
        )}
        {trailingActions}
      </View>
      <SetDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        onSubmit={handleDetailsSubmit}
        mode="edit"
        setNumber={set.set_number}
        initialRir={set.rir_actual}
        initialNote={set.notes}
        initialVideoUrl={set.video_url}
        initialSetType={setType}
        measurementType={measurementType}
        weightUnit={weightUnit}
      />
    </>
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
  const isHistoryClickable = !exercise.deleted_at && !isEditing

  return (
    <Card className="p-3" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
      <Pressable
        onPress={isHistoryClickable ? () => setShowHistory(true) : undefined}
        disabled={!isHistoryClickable}
        className={`flex-row items-start justify-between gap-2 mb-3 ${isHistoryClickable ? 'active:opacity-70' : ''}`}
      >
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
        {isHistoryClickable && (
          <ChevronRight size={16} color={colors.textMuted} />
        )}
      </Pressable>

      {isEditing && measurementType === MeasurementType.WEIGHT_REPS && sets.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, width: 24, textAlign: 'center' }}>
            {t('workout:set.set').toUpperCase()}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, flex: 1, textAlign: 'center' }}>
            {weightUnit?.toUpperCase() || 'KG'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, flex: 1, textAlign: 'center' }}>
            {t('workout:set.reps').toUpperCase()}
          </Text>
          <View style={{ width: 132 }} />
        </View>
      )}
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
              className="flex-row items-center justify-center gap-1 rounded self-center"
              style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, paddingVertical: 8, width: '90%' }}
            >
              <Plus size={14} color={colors.success} />
              <Text className="text-xs" style={{ color: colors.success }}>{t('workout:set.addSet')}</Text>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginVertical: -8 }}>
                {set.notes && (
                  <Pressable onPress={() => onSelectSet(set)} style={{ padding: 8 }} className="active:opacity-50">
                    <FileText size={14} color={colors.textMuted} />
                  </Pressable>
                )}
                {set.video_url && (
                  <Pressable onPress={() => onSelectSet(set)} style={{ padding: 8 }} className="active:opacity-50">
                    <Video size={14} color={colors.textMuted} />
                  </Pressable>
                )}
                {set.rir_actual !== null && set.rir_actual !== undefined && (
                  <Text style={{ color: colors.textMuted, fontSize: 12, minWidth: 16, textAlign: 'center' }}>
                    {formatEffortBadge(set.rir_actual, measurementType)}
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
          navigation.navigate('MainTabs', { screen: 'History', params: { sessionId: sid, date } })
        }}
      />
    </Card>
  )
}

function SessionInlineDetail({ sessionId, navigation: navigationProp, onSessionDeleted }) {
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

  const handleSaveNotes = () => {
    updateMetadata.mutate({
      sessionId,
      completedAt: session.completed_at,
      durationMinutes: session.duration_minutes,
      overallFeeling: session.overall_feeling,
      notes: editNotes.trim() || null,
    })
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
      const iso = d.toISOString()
      setEditCompletedAt(iso)
      const startedAt = new Date(session.started_at)
      const durationMinutes = Math.round((d - startedAt) / 60000)
      updateMetadata.mutate({
        sessionId,
        completedAt: iso,
        durationMinutes: Math.max(0, durationMinutes),
        overallFeeling: session.overall_feeling,
        notes: session.notes,
      })
    } else {
      setEditTimeText(formatTimeFromISO(editCompletedAt || session.completed_at))
    }
  }

  return (
    <View>
      {/* Header — always visible */}
      <View style={{ marginBottom: 24, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {isEditing ? (
            <>
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                {session.day_name || session.routine_day?.name || t('workout:session.freeWorkout')}
              </Text>
              <Pressable onPress={() => setIsEditing(false)} style={{ marginLeft: 12 }}>
                <Text style={{ color: colors.success, fontSize: 14, fontWeight: '600' }}>{t('common:buttons.done')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                {session.day_name || session.routine_day?.name || t('workout:session.freeWorkout')}
              </Text>
              <DropdownMenu items={[
                { icon: Pencil, label: t('common:buttons.edit'), onPress: handleStartEdit },
                { icon: Share2, label: t('common:buttons.share'), onPress: async () => setSummaryData(await fetchWorkoutSummary(sessionId, { weightUnit: globalWeightUnit })) },
                { icon: Trash2, label: t('common:buttons.delete'), onPress: () => setShowDeleteConfirm(true), danger: true },
              ]} />
            </>
          )}
        </View>

      {isEditing ? (
        <View style={{ gap: 8, marginTop: 8 }}>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>{t('workout:history.endTime')}</Text>
            <TextInput
              value={editTimeText}
              onChangeText={setEditTimeText}
              onBlur={handleTimeBlur}
              placeholder="HH:MM"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              style={{ color: colors.textPrimary, fontSize: 13, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}
            />
          </View>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>{t('common:labels.notes')}</Text>
            <TextInput
              value={editNotes}
              onChangeText={setEditNotes}
              onBlur={handleSaveNotes}
              placeholder={t('workout:session.notesPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              style={{ color: colors.textPrimary, fontSize: 13, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border, textAlignVertical: 'top', minHeight: 40 }}
            />
          </View>
        </View>
      ) : (
        <>

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
        </>
      )}
      </View>

      {/* Exercises */}
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>{t('workout:session.exercises')}</Text>

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
            onSuccess: () => {
              setShowDeleteConfirm(false)
              onSessionDeleted?.()
            },
          })
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </View>
  )
}

export default SessionInlineDetail
