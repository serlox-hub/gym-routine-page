import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, Calendar, Trash2, TrendingUp, Trophy, Share2, Pencil, Plus, X } from 'lucide-react'
import { useSessionDetail, useDeleteSession, useUpdateSessionMetadata, useUpsertCompletedSet, useDeleteCompletedSet } from '../hooks/useWorkout.js'
import { useSessionPRs } from '../hooks/useWorkout.js'
import { LoadingSpinner, ErrorMessage, Card, NotesBadge, ConfirmModal, PageHeader, BottomActions } from '../components/ui/index.js'
import SetNotesView from '../components/Workout/SetNotesView.jsx'
import WorkoutSummaryModal from '../components/Workout/WorkoutSummaryModal.jsx'
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
import { getMuscleGroupBorderStyle } from '../lib/muscleGroupStyles.js'
import { colors } from '../lib/styles.js'

function EditableSetRow({ set, exercise, sessionId, sessionExerciseId, isSetPR, onUpsert, onDelete }) {
  const { showWeight, showReps, showTime, showDistance } = getSetFieldsForMeasurementType(exercise.measurement_type)

  const [weight, setWeight] = useState(String(set.weight ?? ''))
  const [reps, setReps] = useState(String(set.reps_completed ?? ''))
  const [timeSeconds, setTimeSeconds] = useState(String(set.time_seconds ?? ''))
  const [distanceMeters, setDistanceMeters] = useState(String(set.distance_meters ?? ''))

  const handleSave = () => {
    onUpsert({
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
    })
  }

  const inputCls = "w-16 text-center text-sm rounded-lg px-2 py-1"
  const inputSt = { backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}` }

  return (
    <div
      className="flex items-center gap-2 py-2 px-3 rounded"
      style={{
        backgroundColor: isSetPR ? 'rgba(210, 153, 34, 0.15)' : colors.bgTertiary,
        borderLeft: isSetPR ? `3px solid ${colors.warning}` : '3px solid transparent',
      }}
    >
      <span
        className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0"
        style={{ backgroundColor: isSetPR ? colors.warning : colors.success, color: colors.bgPrimary }}
      >
        {set.set_number}
      </span>

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
          <span className="text-xs shrink-0" style={{ color: colors.textSecondary }}>{exercise.weight_unit || 'kg'}</span>
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
          <span className="text-xs shrink-0" style={{ color: colors.textSecondary }}>{exercise.time_unit || 's'}</span>
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
          <span className="text-xs shrink-0" style={{ color: colors.textSecondary }}>{exercise.distance_unit || 'm'}</span>
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

function SessionDetail() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { data: session, isLoading, error } = useSessionDetail(sessionId)
  const { data: sessionPRs } = useSessionPRs(sessionId)
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

  const prsByExercise = useMemo(() => buildPRsByExerciseMap(sessionPRs), [sessionPRs])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />
  if (!session) return <ErrorMessage message="Sesión no encontrada" className="m-4" />

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

  const menuItems = [
    !isEditing && { icon: Pencil, label: 'Editar', onClick: handleStartEdit },
    { icon: Trash2, label: 'Eliminar', onClick: () => setShowDeleteConfirm(true), danger: true },
  ].filter(Boolean)

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <PageHeader
        title="Detalle de sesión"
        onBack={() => navigate(-1)}
        menuItems={menuItems}
      />

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <div className="text-xs text-secondary">Día</div>
            <div className="text-sm font-medium">
              {session.day_name || session.routine_day?.name || 'Entrenamiento Libre'}
            </div>
          </div>
          {(session.routine_name || session.routine_day?.routine?.name) && (
            <div className="col-span-2">
              <div className="text-xs text-secondary">Rutina</div>
              <div className="text-sm">
                {session.routine_name || session.routine_day?.routine?.name}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar size={16} style={{ color: colors.textSecondary }} />
            <div>
              <div className="text-xs text-secondary">Fecha</div>
              <div className="text-sm capitalize">{formatFullDate(session.started_at)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: colors.textSecondary }} />
            <div>
              <div className="text-xs text-secondary">Hora</div>
              <div className="text-sm">{formatTime(session.started_at)}</div>
            </div>
          </div>

          {isEditing ? (
            <>
              <div>
                <div className="text-xs text-secondary mb-1">Hora de fin</div>
                <input
                  type="time"
                  value={formatEditTime(editCompletedAt || session.completed_at)}
                  onChange={e => handleTimeChange(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg text-sm"
                  style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
                />
              </div>
            </>
          ) : (
            <>
              {session.duration_minutes != null && (
                <div>
                  <div className="text-xs text-secondary">Duración</div>
                  <div className="text-sm">
                    {session.duration_minutes > 0 ? `${session.duration_minutes} minutos` : '< 1 minuto'}
                  </div>
                </div>
              )}
              {session.overall_feeling && (
                <div>
                  <div className="text-xs text-secondary">Sensación</div>
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
            <div className="text-xs text-secondary mb-1">Notas</div>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="Notas de la sesión..."
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
            />
          </div>
        ) : (
          session.notes && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
              <div className="text-xs text-secondary mb-1">Notas</div>
              <p className="text-sm">{session.notes}</p>
            </div>
          )
        )}
      </Card>

      <h2 className="text-lg font-bold mb-3">Ejercicios</h2>
      <div className="space-y-3">
        {session.exercises?.map(({ sessionExerciseId, exercise, sets }) => {
          const prData = prsByExercise[exercise.id]
          const prSetNums = prData ? findPRSetNumbers(sets, prData) : null
          const maxSetNumber = sets.length > 0 ? Math.max(...sets.map(s => s.set_number)) : 0
          return (
          <Card key={sessionExerciseId} className="p-4" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h3 className={`font-medium ${exercise.deleted_at ? 'text-secondary line-through' : ''}`}>
                  {exercise.name}
                </h3>
                {prData && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
                    style={{ backgroundColor: 'rgba(210, 153, 34, 0.15)', color: colors.warning }}
                  >
                    <Trophy size={10} /> PR
                  </span>
                )}
                {exercise.deleted_at && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.dangerBg, color: colors.danger }}>
                    Eliminado
                  </span>
                )}
              </div>
              {!exercise.deleted_at && !isEditing && (
                <button
                  onClick={() => navigate(`/exercises/${exercise.id}/progress`)}
                  className="p-1.5 rounded hover:opacity-80"
                  style={{ backgroundColor: colors.bgTertiary }}
                  title="Ver progresión"
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
                      onUpsert={handleUpsertSet}
                      onDelete={handleDeleteSet}
                    />
                  ))}
                  <button
                    onClick={() => handleAddSet(sessionExerciseId, exercise, maxSetNumber)}
                    className="flex items-center justify-center gap-1 w-full py-2 rounded text-xs"
                    style={{ backgroundColor: colors.bgTertiary, color: colors.accent }}
                  >
                    <Plus size={14} /> Añadir serie
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
                      backgroundColor: isSetPR ? 'rgba(210, 153, 34, 0.15)' : colors.bgTertiary,
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
                      {formatSetValue(set, { timeUnit: exercise.time_unit, distanceUnit: exercise.distance_unit })}
                    </div>
                    <NotesBadge
                      rir={set.rir_actual}
                      hasNotes={!!set.notes}
                      hasVideo={!!set.video_url}
                      onClick={(set.notes || set.video_url) ? () => setSelectedSet(set) : null}
                    />
                  </div>
                  )
                })
              )}
            </div>
          </Card>
          )
        })}
      </div>

      {isEditing && (
        <BottomActions
          secondary={{ label: 'Cancelar', onClick: handleCancelEdit }}
          primary={{ label: updateMetadata.isPending ? 'Guardando...' : 'Guardar', onClick: handleSaveMetadata, disabled: updateMetadata.isPending }}
        />
      )}

      <SetNotesView
        isOpen={!!selectedSet}
        onClose={() => setSelectedSet(null)}
        rir={selectedSet?.rir_actual}
        notes={selectedSet?.notes}
        videoUrl={selectedSet?.video_url}
      />

      {showSummary && (
        <WorkoutSummaryModal
          summaryData={buildWorkoutSummaryFromSession(session, sessionPRs)}
          onClose={() => setShowSummary(false)}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Eliminar sesión"
        message="¿Seguro que quieres eliminar esta sesión? Se eliminarán todas las series registradas."
        confirmText="Eliminar"
        loadingText="Eliminando..."
        isLoading={deleteSession.isPending}
        onConfirm={() => {
          deleteSession.mutate({
            sessionId,
            exerciseIds: session.exercises?.map(e => e.exercise?.id).filter(Boolean) || [],
            sessionDate: session.started_at,
          }, {
            onSuccess: () => {
              setShowDeleteConfirm(false)
              navigate('/history')
            }
          })
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 py-3"
        style={{ backgroundColor: colors.bgPrimary, borderTop: `1px solid ${colors.border}` }}
      >
        <button
          onClick={() => setShowSummary(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: colors.accent, color: '#fff' }}
        >
          <Share2 size={16} />
          Compartir
        </button>
      </div>
      <div className="h-16" />
    </div>
  )
}

export default SessionDetail
