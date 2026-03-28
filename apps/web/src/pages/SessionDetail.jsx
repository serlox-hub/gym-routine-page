import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, Calendar, Trash2, TrendingUp, Trophy, Share2 } from 'lucide-react'
import { useSessionDetail, useDeleteSession } from '../hooks/useWorkout.js'
import { useSessionPRs } from '../hooks/useWorkout.js'
import { LoadingSpinner, ErrorMessage, Card, NotesBadge, ConfirmModal, PageHeader } from '../components/ui/index.js'
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
} from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../lib/muscleGroupStyles.js'
import { colors } from '../lib/styles.js'

function SessionDetail() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { data: session, isLoading, error } = useSessionDetail(sessionId)
  const { data: sessionPRs } = useSessionPRs(sessionId)
  const deleteSession = useDeleteSession()
  const [selectedSet, setSelectedSet] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  const prsByExercise = useMemo(() => buildPRsByExerciseMap(sessionPRs), [sessionPRs])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />
  if (!session) return <ErrorMessage message="Sesión no encontrada" className="m-4" />

  const menuItems = [
    { icon: Trash2, label: 'Eliminar', onClick: () => setShowDeleteConfirm(true), danger: true },
  ]

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <PageHeader
        title="Detalle de sesión"
        onBack={() => navigate(-1)}
        menuItems={menuItems}
      />

      {/* Info de la sesión */}
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
                style={{
                  backgroundColor: getSensationColor(session.overall_feeling),
                  color: colors.bgPrimary,
                }}
              >
                {SENSATION_LABELS[session.overall_feeling]}
              </span>
            </div>
          )}
        </div>
        {session.notes && (
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
            <div className="text-xs text-secondary mb-1">Notas</div>
            <p className="text-sm">{session.notes}</p>
          </div>
        )}
      </Card>

      {/* Ejercicios */}
      <h2 className="text-lg font-bold mb-3">Ejercicios</h2>
      <div className="space-y-3">
        {session.exercises?.map(({ sessionExerciseId, exercise, sets }) => {
          const prData = prsByExercise[exercise.id]
          const prSetNums = prData ? findPRSetNumbers(sets, prData) : null
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
              {!exercise.deleted_at && (
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
              {sets.map(set => {
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
              })}
            </div>
          </Card>
          )
        })}
      </div>

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
