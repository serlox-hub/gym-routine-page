import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, ChevronRight, Trophy, Share2, Pencil, Plus, FileText, Video } from 'lucide-react'
import { useSessionDetail, useDeleteSession, useUpdateSessionMetadata, useUpsertCompletedSet, useDeleteCompletedSet, useSessionPRs } from '../../hooks/useWorkout.js'
import { useUserExerciseOverride } from '../../hooks/useExercises.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, DropdownMenu } from '../ui/index.js'
import SetNotesView from '../Workout/SetNotesView.jsx'
import ExerciseHistoryModal from '../Workout/ExerciseHistoryModal.jsx'
import WorkoutSummaryModal from '../Workout/WorkoutSummaryModal.jsx'
import {
  SENSATION_LABELS,
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
} from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'
import { colors } from '../../lib/styles.js'

function EditableSetRow({ set, exercise, sessionId, sessionExerciseId, isSetPR, onUpsert, onDelete, weightUnit }) {
  const { t } = useTranslation()
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

  const inputCls = "w-full text-center text-xs rounded px-1.5 py-0.5"
  const inputSt = { backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: 'none', borderBottom: `1px solid ${colors.border}` }

  return (
    <div className="flex items-center gap-2" style={{ fontSize: 12 }}>
      <button
        onClick={handleToggleDropset}
        className="shrink-0"
        style={{ color: isSetPR ? colors.warning : setType === 'dropset' ? colors.orange : colors.textMuted, fontSize: 12, width: 14, textAlign: 'right', fontWeight: isSetPR || setType === 'dropset' ? 700 : 400 }}
        title={setType === 'dropset' ? t('workout:set.removeDropset') : t('workout:set.markDropset')}
      >
        {setType === 'dropset' ? 'D' : set.set_number}
      </button>

      {showWeight && (
        <div className="flex items-center gap-0.5 flex-1 min-w-0">
          <input
            value={weight}
            onChange={e => setWeight(e.target.value)}
            onBlur={handleSave}
            type="number"
            step="0.1"
            className={inputCls}
            style={inputSt}
          />
          <span className="text-[10px] shrink-0" style={{ color: colors.textMuted }}>{weightUnit}</span>
        </div>
      )}
      {showWeight && showReps && <span style={{ color: colors.textMuted, fontSize: 10 }}>×</span>}
      {showReps && (
        <div className="flex items-center gap-0.5 flex-1 min-w-0">
          <input
            value={reps}
            onChange={e => setReps(e.target.value)}
            onBlur={handleSave}
            type="number"
            className={inputCls}
            style={inputSt}
          />
          <span className="text-[10px] shrink-0" style={{ color: colors.textMuted }}>reps</span>
        </div>
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
      <button
        onClick={() => onDelete({ sessionId, sessionExerciseId, setNumber: set.set_number })}
        className="p-2 rounded-lg opacity-50 hover:opacity-100 transition-opacity shrink-0 -my-2"
      >
        <Trash2 size={14} color={colors.textMuted} />
      </button>
    </div>
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

  return (
    <Card className="p-3" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
      <div className="flex items-start justify-between gap-2 mb-2">
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
        {!exercise.deleted_at && !isEditing && (
          <button
            onClick={() => setShowHistory(true)}
            className="hover:opacity-80"
          >
            <ChevronRight size={16} color={colors.textMuted} />
          </button>
        )}
      </div>
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
                    {set.rir_actual}
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
  const { data: session, isLoading, error } = useSessionDetail(sessionId)
  const { data: sessionPRs } = useSessionPRs(sessionId)
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
                { icon: Pencil, label: t('common:buttons.edit'), onClick: handleStartEdit, accent: true },
                { icon: Share2, label: t('common:buttons.share'), onClick: async () => setSummaryData(await fetchWorkoutSummary(sessionId, { weightUnit: globalWeightUnit })) },
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
        rir={selectedSet?.rir_actual}
        notes={selectedSet?.notes}
        videoUrl={selectedSet?.video_url}
      />

      {summaryData && (
        <WorkoutSummaryModal
          summaryData={summaryData}
          onClose={() => setSummaryData(null)}
        />
      )}

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
