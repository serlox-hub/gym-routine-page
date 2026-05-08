import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trash2, ChevronRight, Trophy, Share2, Pencil, Plus, FileText, Video, SlidersHorizontal, AlertCircle } from 'lucide-react'
import { useSessionDetail, useDeleteSession, useUpdateSessionMetadata, useUpsertCompletedSet, useDeleteCompletedSet, useSessionPRs } from '../../hooks/useWorkout.js'
import { useUserExerciseOverride } from '../../hooks/useExercises.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, DropdownMenu } from '../ui/index.js'
import SetNotesView from '../Workout/SetNotesView.jsx'
import SetDetailsModal from '../Workout/SetDetailsModal.jsx'
import ExerciseHistoryModal from '../Workout/ExerciseHistoryModal.jsx'
import { uploadVideo } from '../../lib/videoStorage.js'
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
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'
import { colors } from '../../lib/styles.js'

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
      const uploadedUrl = await uploadVideo(file, setUploadProgress)
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

  const inputCls = "w-full text-center text-xs rounded px-1.5 py-0.5"
  const inputSt = { backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: 'none', borderBottom: `1px solid ${colors.border}` }

  const containerStyle = isWeightReps
    ? { display: 'grid', gridTemplateColumns: '24px 1fr 1fr 132px', alignItems: 'center', gap: 12, fontSize: 12 }
    : { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }

  const badgeStyle = {
    backgroundColor: colors.bgTertiary,
    borderRadius: 6,
    padding: '4px 6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
  }

  const hasVideo = !!set.video_url
  const hasNotes = !!set.notes
  const hasRir = set.rir_actual != null

  const trailingBadges = (
    <>
      {hasNotes && (
        <button onClick={() => setShowDetails(true)} style={badgeStyle} title={t('workout:set.notes')}>
          <FileText size={13} color={colors.textSecondary} />
        </button>
      )}
      {videoUploadError && (
        <button onClick={handleRetryVideoUpload} style={{ ...badgeStyle, backgroundColor: colors.dangerBg }} title={t('common:buttons.retry')}>
          <AlertCircle size={13} color={colors.danger} />
        </button>
      )}
      {isUploadingVideo && (
        <span style={{ ...badgeStyle, padding: '3px 7px', cursor: 'default' }}>
          <span style={{ color: colors.purple, fontSize: 11, fontWeight: 600 }}>{uploadProgress}%</span>
        </span>
      )}
      {hasVideo && !isUploadingVideo && !videoUploadError && (
        <button onClick={() => setShowDetails(true)} style={badgeStyle} title={t('workout:set.addVideo')}>
          <Video size={13} color={colors.textSecondary} />
        </button>
      )}
      {hasRir && (
        <button onClick={() => setShowDetails(true)} style={{ ...badgeStyle, padding: '3px 7px' }} title={t('workout:set.rir')}>
          <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600 }}>
            {formatEffortBadge(set.rir_actual, measurementType)}
          </span>
        </button>
      )}
    </>
  )

  const menu = (
    <DropdownMenu
      triggerSize={14}
      triggerClassName="shrink-0 -my-2"
      items={[
        {
          label: t('common:buttons.edit'),
          icon: SlidersHorizontal,
          onClick: () => setShowDetails(true),
        },
        {
          label: t('common:buttons.delete'),
          icon: Trash2,
          onClick: () => onDelete({ sessionId, sessionExerciseId, setNumber: set.set_number }),
          danger: true,
        },
      ]}
    />
  )

  const trailingActions = (
    <div className="flex items-center gap-1.5 justify-end">
      {trailingBadges}
      {menu}
    </div>
  )

  return (
    <>
      <div style={containerStyle}>
        <button
          onClick={handleToggleDropset}
          className="shrink-0"
          style={{ color: isSetPR ? colors.warning : setType === 'dropset' ? colors.orange : colors.textMuted, fontSize: 12, textAlign: 'center', fontWeight: isSetPR || setType === 'dropset' ? 700 : 400 }}
          title={setType === 'dropset' ? t('workout:set.removeDropset') : t('workout:set.markDropset')}
        >
          {setType === 'dropset' ? 'D' : set.set_number}
        </button>

        {showWeight && (
          <input
            value={weight}
            onChange={e => setWeight(e.target.value)}
            onBlur={handleSave}
            type="number"
            step="0.1"
            className={inputCls}
            style={inputSt}
          />
        )}
        {showReps && (
          <input
            value={reps}
            onChange={e => setReps(e.target.value)}
            onBlur={handleSave}
            type="number"
            className={inputCls}
            style={inputSt}
          />
        )}
        {showTime && (
          <div className="flex items-center gap-0.5 flex-1 min-w-0">
            <input
              value={timeSeconds}
              onChange={e => setTimeSeconds(e.target.value)}
              onBlur={handleSave}
              type="number"
              className={inputCls}
              style={inputSt}
            />
            <span className="text-[10px] shrink-0" style={{ color: colors.textMuted }}>s</span>
          </div>
        )}
        {showDistance && (
          <div className="flex items-center gap-0.5 flex-1 min-w-0">
            <input
              value={distanceMeters}
              onChange={e => setDistanceMeters(e.target.value)}
              onBlur={handleSave}
              type="number"
              step="0.1"
              className={inputCls}
              style={inputSt}
            />
            <span className="text-[10px] shrink-0" style={{ color: colors.textMuted }}>m</span>
          </div>
        )}
        {trailingActions}
      </div>
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

function SessionExerciseBlock({ sessionExerciseId, exercise, sets, sessionId, prsByExercise, globalWeightUnit, isEditing, onUpsertSet, onDeleteSet, onAddSet, onSelectSet }) {
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
      <div
        onClick={isHistoryClickable ? () => setShowHistory(true) : undefined}
        className={`flex items-start justify-between gap-2 mb-2 ${isHistoryClickable ? 'cursor-pointer hover:opacity-80' : ''}`}
      >
        <div className="flex items-center gap-2">
          <h3 className={`font-medium ${exercise.deleted_at ? 'text-secondary line-through' : ''}`}>
            {getExerciseName(exercise)}
          </h3>
          {exercise.deleted_at && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.dangerBg, color: colors.danger }}>
              {t('exercise:deleted')}
            </span>
          )}
        </div>
        {isHistoryClickable && (
          <ChevronRight size={16} color={colors.textMuted} />
        )}
      </div>
      {isEditing && measurementType === MeasurementType.WEIGHT_REPS && sets.length > 0 && (
        <div className="mb-1.5 px-1" style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 132px', gap: 12 }}>
          <span style={{ color: colors.textSecondary, fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textAlign: 'center' }}>
            {t('workout:set.set').toUpperCase()}
          </span>
          <span style={{ color: colors.textSecondary, fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textAlign: 'center' }}>
            {weightUnit?.toUpperCase() || 'KG'}
          </span>
          <span style={{ color: colors.textSecondary, fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textAlign: 'center' }}>
            {t('workout:set.reps').toUpperCase()}
          </span>
          <span />
        </div>
      )}
      <div className="space-y-2">
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
            <button
              onClick={() => onAddSet(sessionExerciseId, exercise, maxSetNumber)}
              className="flex items-center justify-center gap-1 w-full py-2 rounded text-xs"
              style={{ border: `1px dashed ${colors.border}`, color: colors.success }}
            >
              <Plus size={14} /> {t('workout:set.addSet')}
            </button>
          </>
        ) : (
          sets.map(set => {
            const isSetPR = prSetNums?.has(set.set_number)
            return (
            <div
              key={set.id}
              className="flex items-center gap-3"
              style={{ fontSize: 13 }}
            >
              <span style={{ color: isSetPR ? colors.warning : colors.textMuted, fontSize: 12, width: 14, textAlign: 'right', fontWeight: isSetPR ? 700 : 400 }}>
                {set.set_type === 'dropset' ? 'D' : set.set_number}
              </span>
              <span className="flex-1 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                {formatSetValue({ ...set, weight_unit: weightUnit })}
                {isSetPR && (
                  <span className="inline-flex items-center gap-0.5" style={{ color: colors.warning, fontSize: 10, fontWeight: 600 }}>
                    <Trophy size={10} /> PR
                  </span>
                )}
              </span>
              <div className="flex items-center gap-0.5 -my-2">
                {set.notes && (
                  <button onClick={() => onSelectSet(set)} className="p-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity">
                    <FileText size={14} color={colors.textMuted} />
                  </button>
                )}
                {set.video_url && (
                  <button onClick={() => onSelectSet(set)} className="p-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity">
                    <Video size={14} color={colors.textMuted} />
                  </button>
                )}
                {set.rir_actual !== null && set.rir_actual !== undefined && (
                  <span style={{ color: colors.textMuted, fontSize: 12, minWidth: 16, textAlign: 'center' }}>
                    {formatEffortBadge(set.rir_actual, measurementType)}
                  </span>
                )}
              </div>
            </div>
            )
          })
        )}
      </div>
      <ExerciseHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        exerciseId={exercise.id}
        exerciseName={getExerciseName(exercise)}
        measurementType={measurementType}
        weightUnit={weightUnit}
      />
    </Card>
  )
}

function SessionInlineDetail({ sessionId, onSessionDeleted }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: session, isLoading, error } = useSessionDetail(sessionId)
  const { data: sessionPRs } = useSessionPRs(sessionId)
  const deleteSession = useDeleteSession()
  const updateMetadata = useUpdateSessionMetadata()
  const upsertSet = useUpsertCompletedSet()
  const deleteSet = useDeleteCompletedSet()

  const [selectedSet, setSelectedSet] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [editCompletedAt, setEditCompletedAt] = useState('')
  const { value: globalWeightUnit } = usePreference('weight_unit')

  const prsByExercise = useMemo(() => buildPRsByExerciseMap(sessionPRs), [sessionPRs])

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

  const handleStartEdit = () => {
    setIsEditing(true)
    setEditNotes(session.notes || '')
    setEditCompletedAt(session.completed_at || '')
  }

  const handleSaveTime = () => {
    if (!editCompletedAt) return
    const startedAt = new Date(session.started_at)
    const completedAt = new Date(editCompletedAt)
    const durationMinutes = Math.round((completedAt - startedAt) / 60000)

    updateMetadata.mutate({
      sessionId,
      completedAt: completedAt.toISOString(),
      durationMinutes: Math.max(0, durationMinutes),
      overallFeeling: session.overall_feeling,
      notes: session.notes,
    })
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

  const handleUpsertSet = (setData) => upsertSet.mutate(setData)
  const handleDeleteSet = (setData) => deleteSet.mutate(setData)

  const handleAddSet = (sessionExerciseId, exercise, currentMaxSetNumber) => {
    upsertSet.mutate(buildEmptySetData({
      sessionId,
      sessionExerciseId,
      setNumber: currentMaxSetNumber + 1,
      exercise,
    }))
  }

  const formatEditTime = (isoString) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const handleTimeChange = (text) => {
    const match = text.match(/^(\d{1,2}):(\d{2})$/)
    if (match) {
      const d = new Date(session.completed_at || session.started_at)
      d.setHours(parseInt(match[1], 10), parseInt(match[2], 10))
      setEditCompletedAt(d.toISOString())
    }
  }

  return (
    <div>
      {/* Header — always visible */}
      <div className="mb-6" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="flex items-center justify-between">
          {isEditing ? (
            <>
              <span className="truncate flex-1 min-w-0" style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 700 }}>
                {session.day_name || session.routine_day?.name || t('workout:session.freeWorkout')}
              </span>
              <button onClick={() => setIsEditing(false)} className="shrink-0 ml-3 hover:opacity-80" style={{ color: colors.success, fontSize: 14, fontWeight: 600 }}>
                {t('common:buttons.done')}
              </button>
            </>
          ) : (
            <>
              <span style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 700 }}>
                {session.day_name || session.routine_day?.name || t('workout:session.freeWorkout')}
              </span>
              <DropdownMenu items={[
                { icon: Pencil, label: t('common:buttons.edit'), onClick: handleStartEdit },
                { icon: Share2, label: t('common:buttons.share'), onClick: async () => {
                  const summaryData = await fetchWorkoutSummary(sessionId, { weightUnit: globalWeightUnit })
                  navigate('/workout/summary', { state: { summaryData, fromHistory: true } })
                } },
                { icon: Trash2, label: t('common:buttons.delete'), onClick: () => setShowDeleteConfirm(true), danger: true },
              ]} />
            </>
          )}
        </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <div>
            <div style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>{t('workout:history.endTime')}</div>
            <input
              type="time"
              value={formatEditTime(editCompletedAt || session.completed_at)}
              onChange={e => handleTimeChange(e.target.value)}
              onBlur={handleSaveTime}
              className="w-full px-2 py-1 rounded text-xs"
              style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: 'none', borderBottom: `1px solid ${colors.border}` }}
            />
          </div>
          <div>
            <div style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>{t('common:labels.notes')}</div>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder={t('workout:session.notesPlaceholder')}
              rows={2}
              className="w-full rounded px-2 py-1 text-xs"
              style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: 'none', borderBottom: `1px solid ${colors.border}`, resize: 'none' }}
            />
          </div>
        </div>
      ) : (
        <>

          {/* Routine name */}
          {(session.routine_day?.routine?.name || session.routine_name) && (
            <span style={{ color: colors.textSecondary, fontSize: 13 }}>
              {session.routine_day?.routine?.name || session.routine_name}
            </span>
          )}

          {/* Date, time, duration, sensation — one line */}
          <div className="flex items-center flex-wrap gap-x-1" style={{ color: colors.textMuted, fontSize: 12 }}>
            <span className="capitalize">{formatFullDate(session.started_at)}</span>
            <span>·</span>
            <span>{formatTime(session.started_at)}</span>
            {session.duration_minutes != null && (
              <>
                <span>·</span>
                <span>{session.duration_minutes > 0 ? `${session.duration_minutes} ${t('common:time.min')}` : `< 1 ${t('common:time.min')}`}</span>
              </>
            )}
            {session.overall_feeling && (
              <>
                <span>·</span>
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: getSensationColor(session.overall_feeling), color: colors.bgPrimary, fontSize: 10, fontWeight: 600 }}
                >
                  {SENSATION_LABELS[session.overall_feeling]}
                </span>
              </>
            )}
          </div>

          {/* Notes */}
          {session.notes && (
            <p style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>{session.notes}</p>
          )}

          {/* Muscle groups */}
          {muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5" style={{ marginTop: 6 }}>
              {muscleGroups.map(mg => (
                <span
                  key={mg.name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${getMuscleGroupColor(mg.name)}20`, color: getMuscleGroupColor(mg.name), fontSize: 10, fontWeight: 500 }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getMuscleGroupColor(mg.name) }} />
                  {getMuscleGroupName(mg)}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      </div>

      {/* Exercises */}
      <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block' }}>{t('workout:session.exercises')}</span>
      <div className="space-y-3">
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
            onUpsertSet={handleUpsertSet}
            onDeleteSet={handleDeleteSet}
            onAddSet={handleAddSet}
            onSelectSet={setSelectedSet}
          />
        ))}
      </div>

      {/* Modals */}
      <SetNotesView
        isOpen={!!selectedSet}
        onClose={() => setSelectedSet(null)}
        notes={selectedSet?.notes}
        videoUrl={selectedSet?.video_url}
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
    </div>
  )
}

export default SessionInlineDetail
