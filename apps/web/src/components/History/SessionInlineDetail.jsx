import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trash2, TrendingUp, Trophy, Share2, Pencil, Plus, X } from 'lucide-react'
import { useSessionDetail, useDeleteSession, useUpdateSessionMetadata, useUpsertCompletedSet, useDeleteCompletedSet, useSessionPRs } from '../../hooks/useWorkout.js'
import { useUserExerciseOverride } from '../../hooks/useExercises.js'
import { LoadingSpinner, ErrorMessage, Card, NotesBadge, ConfirmModal, DropdownMenu } from '../ui/index.js'
import SetNotesView from '../Workout/SetNotesView.jsx'
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
  recalculateExercisePRs,
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

  const inputCls = "w-16 text-center text-sm rounded-lg px-2 py-1"
  const inputSt = { backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}` }

  return (
    <div
      className="flex items-center gap-2 py-2 px-3 rounded"
      style={{
        backgroundColor: isSetPR ? colors.warningBg : colors.bgTertiary,
        borderLeft: isSetPR ? `3px solid ${colors.warning}` : '3px solid transparent',
      }}
    >
      <button
        onClick={handleToggleDropset}
        className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0"
        style={{ backgroundColor: setType === 'dropset' ? colors.orange : isSetPR ? colors.warning : colors.success, color: colors.bgPrimary }}
        title={setType === 'dropset' ? t('workout:set.removeDropset') : t('workout:set.markDropset')}
      >
        {setType === 'dropset' ? 'D' : set.set_number}
      </button>

      {showWeight && (
        <div className="flex items-center gap-1">
          <input
            value={weight}
            onChange={e => setWeight(e.target.value)}
            onBlur={handleSave}
            type="number"
            step="0.1"
            className={inputCls}
            style={inputSt}
          />
          <span className="text-xs shrink-0" style={{ color: colors.textSecondary }}>{weightUnit}</span>
        </div>
      )}
      {showWeight && showReps && <span style={{ color: colors.textSecondary }}>×</span>}
      {showReps && (
        <div className="flex items-center gap-1">
          <input
            value={reps}
            onChange={e => setReps(e.target.value)}
            onBlur={handleSave}
            type="number"
            className={inputCls}
            style={inputSt}
          />
          <span className="text-xs shrink-0" style={{ color: colors.textSecondary }}>reps</span>
        </div>
      )}
      {showTime && (
        <div className="flex items-center gap-1">
          <input
            value={timeSeconds}
            onChange={e => setTimeSeconds(e.target.value)}
            onBlur={handleSave}
            type="number"
            className={inputCls}
            style={inputSt}
          />
          <span className="text-xs shrink-0" style={{ color: colors.textSecondary }}>s</span>
        </div>
      )}
      {showDistance && (
        <div className="flex items-center gap-1">
          <input
            value={distanceMeters}
            onChange={e => setDistanceMeters(e.target.value)}
            onBlur={handleSave}
            type="number"
            step="0.1"
            className={inputCls}
            style={inputSt}
          />
          <span className="text-xs shrink-0" style={{ color: colors.textSecondary }}>m</span>
        </div>
      )}
      <button
        onClick={() => onDelete({ sessionId, sessionExerciseId, setNumber: set.set_number })}
        className="p-1 rounded hover:opacity-70 shrink-0"
      >
        <X size={14} style={{ color: colors.danger }} />
      </button>
    </div>
  )
}

function SessionExerciseBlock({ sessionExerciseId, exercise, sets, sessionId, prsByExercise, globalWeightUnit, isEditing, navigate, onUpsertSet, onDeleteSet, onAddSet, onSelectSet }) {
  const { t } = useTranslation()
  const { data: override } = useUserExerciseOverride(exercise.id)
  const weightUnit = resolveWeightUnit(override, { weight_unit: globalWeightUnit })
  const prData = prsByExercise[exercise.id]
  const prSetNums = prData ? findPRSetNumbers(sets, prData) : null
  const maxSetNumber = sets.length > 0 ? Math.max(...sets.map(s => s.set_number)) : 0

  return (
    <Card className="p-4" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h3 className={`font-medium ${exercise.deleted_at ? 'text-secondary line-through' : ''}`}>
            {getExerciseName(exercise)}
          </h3>
          {prData && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
              style={{ backgroundColor: colors.warningBg, color: colors.warning }}
            >
              <Trophy size={10} /> PR
            </span>
          )}
          {exercise.deleted_at && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.dangerBg, color: colors.danger }}>
              {t('exercise:deleted')}
            </span>
          )}
        </div>
        {!exercise.deleted_at && !isEditing && (
          <button
            onClick={() => navigate(`/exercises/${exercise.id}/progress`)}
            className="p-1.5 rounded hover:opacity-80"
            style={{ backgroundColor: colors.bgTertiary }}
            title={t('exercise:progression')}
          >
            <TrendingUp size={14} style={{ color: colors.purple }} />
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
              style={{ backgroundColor: colors.bgTertiary, color: colors.accent }}
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
              className="flex items-center gap-3 py-2 px-3 rounded"
              style={{
                backgroundColor: isSetPR ? colors.warningBg : colors.bgTertiary,
                borderLeft: isSetPR ? `3px solid ${colors.warning}` : '3px solid transparent',
              }}
            >
              <span
                className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
                style={{ backgroundColor: isSetPR ? colors.warning : colors.success, color: colors.bgPrimary }}
              >
                {set.set_number}
              </span>
              <div className="flex-1 text-sm">
                {formatSetValue({ ...set, weight_unit: weightUnit })}
              </div>
              {set.set_type === 'dropset' && (
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{ backgroundColor: colors.orangeBg, color: colors.orange }}
                >
                  D
                </span>
              )}
              <NotesBadge
                rir={set.rir_actual}
                hasNotes={!!set.notes}
                hasVideo={!!set.video_url}
                onClick={(set.notes || set.video_url) ? () => onSelectSet(set) : null}
              />
            </div>
            )
          })
        )}
      </div>
    </Card>
  )
}

function SessionInlineDetail({ sessionId }) {
  const navigate = useNavigate()
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

  const handleCancelEdit = () => setIsEditing(false)

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
      {/* Actions menu */}
      {!isEditing && (
        <div className="flex justify-end mb-3">
          <DropdownMenu items={[
            { icon: Pencil, label: t('common:buttons.edit'), onClick: handleStartEdit },
            { icon: Share2, label: t('common:buttons.share'), onClick: async () => setSummaryData(await fetchWorkoutSummary(sessionId, { weightUnit: globalWeightUnit })) },
            { icon: Trash2, label: t('common:buttons.delete'), onClick: () => setShowDeleteConfirm(true), danger: true },
          ]} />
        </div>
      )}

      {/* Metadata */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <div className="text-xs text-secondary">{t('workout:history.session')}</div>
            <div className="text-sm font-medium">
              {session.day_name || session.routine_day?.name || t('workout:session.freeWorkout')}
            </div>
          </div>
          {(session.routine_name || session.routine_day?.routine?.name) && (
            <div className="col-span-2">
              <div className="text-xs text-secondary">{t('routine:title')}</div>
              <div className="text-sm">
                {session.routine_name || session.routine_day?.routine?.name}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-secondary">{t('workout:session.date')}</div>
            <div className="text-sm capitalize">{formatFullDate(session.started_at)}</div>
          </div>
          <div>
            <div className="text-xs text-secondary">{t('workout:session.time')}</div>
            <div className="text-sm">{formatTime(session.started_at)}</div>
          </div>

          {isEditing ? (
            <div>
              <div className="text-xs text-secondary mb-1">{t('workout:session.endTime')}</div>
              <input
                type="time"
                value={formatEditTime(editCompletedAt || session.completed_at)}
                onChange={e => handleTimeChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-sm"
                style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
              />
            </div>
          ) : (
            <>
              {session.duration_minutes != null && (
                <div>
                  <div className="text-xs text-secondary">{t('workout:summary.duration')}</div>
                  <div className="text-sm">
                    {session.duration_minutes > 0 ? `${session.duration_minutes} ${t('common:time.min')}` : `< 1 ${t('common:time.min')}`}
                  </div>
                </div>
              )}
              {session.overall_feeling && (
                <div>
                  <div className="text-xs text-secondary">{t('workout:sensation.label')}</div>
                  <span
                    className="text-xs px-2 py-0.5 rounded inline-block mt-1"
                    style={{ backgroundColor: getSensationColor(session.overall_feeling), color: colors.bgPrimary }}
                  >
                    {SENSATION_LABELS[session.overall_feeling]}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {isEditing ? (
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
            <div className="text-xs text-secondary mb-1">{t('common:labels.notes')}</div>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder={t('workout:session.notesPlaceholder')}
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
            />
          </div>
        ) : (
          session.notes && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
              <div className="text-xs text-secondary mb-1">{t('common:labels.notes')}</div>
              <p className="text-sm">{session.notes}</p>
            </div>
          )
        )}

        {muscleGroups.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
            <div className="text-xs text-secondary mb-2">{t('workout:session.musclesWorked')}</div>
            <div className="flex flex-wrap gap-1.5">
              {muscleGroups.map(mg => (
                <span
                  key={mg.name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ backgroundColor: `${getMuscleGroupColor(mg.name)}20`, color: getMuscleGroupColor(mg.name), border: `1px solid ${getMuscleGroupColor(mg.name)}40` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getMuscleGroupColor(mg.name) }} />
                  {getMuscleGroupName(mg)}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Edit save/cancel */}
      {isEditing && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleCancelEdit}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
          >
            {t('common:buttons.cancel')}
          </button>
          <button
            onClick={handleSaveMetadata}
            disabled={updateMetadata.isPending}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}
          >
            {updateMetadata.isPending ? t('common:buttons.loading') : t('common:buttons.save')}
          </button>
        </div>
      )}

      {/* Exercises */}
      <h2 className="text-lg font-bold mb-3">{t('workout:session.exercises')}</h2>
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
            navigate={navigate}
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
            onSuccess: () => setShowDeleteConfirm(false),
          })
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

export default SessionInlineDetail
