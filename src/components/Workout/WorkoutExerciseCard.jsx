import { useMemo, useState, useEffect } from 'react'
import { Info, X } from 'lucide-react'
import { Card, Badge, ConfirmModal } from '../ui/index.js'
import SetRow from './SetRow.jsx'
import PreviousWorkout from './PreviousWorkout.jsx'
import ExerciseHistoryModal from './ExerciseHistoryModal.jsx'
import useWorkoutStore from '../../stores/workoutStore.js'
import { usePreviousWorkout } from '../../hooks/useWorkout.js'
import { colors } from '../../lib/styles.js'

function WorkoutExerciseCard({ sessionExercise, onCompleteSet, onUncompleteSet, isWarmup = false, onRemove, isSuperset = false }) {
  const { id, sessionExerciseId, exercise, series, reps, rir, tempo, notes, rest_seconds } = sessionExercise
  // sessionExerciseId es el id de session_exercises (puede ser igual a id si viene transformado)
  const [showNotes, setShowNotes] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  // Determinar tipo de medición del ejercicio
  const measurementType = exercise.measurement_type || 'weight_reps'

  // Unidad de peso del ejercicio
  const weightUnit = exercise.weight_unit || 'kg'

  // Usar sessionExerciseId (id de session_exercises) para rastrear sets
  const exerciseKey = sessionExerciseId || id

  const completedSets = useWorkoutStore(state => state.completedSets)
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const { data: previousWorkout } = usePreviousWorkout(exercise.id)
  const [setsCount, setSetsCount] = useState(series)

  // Actualizar cuando lleguen los datos de la sesión anterior
  useEffect(() => {
    if (previousWorkout?.sets?.length) {
      setSetsCount(previousWorkout.sets.length)
    }
  }, [previousWorkout])

  const completedCount = useMemo(() => {
    return Object.values(completedSets)
      .filter(set => set.sessionExerciseId === exerciseKey)
      .length
  }, [completedSets, exerciseKey])

  const addSet = () => setSetsCount(prev => prev + 1)

  const removeSet = () => {
    if (setsCount > 0) {
      setSetsCount(prev => prev - 1)
    }
  }

  // Simplified warmup card
  if (isWarmup) {
    return (
      <WarmupExerciseCard
        exercise={exercise}
        series={series}
        reps={reps}
        tempo={tempo}
        notes={notes}
        rest_seconds={rest_seconds}
      />
    )
  }

  // Si está dentro de un superset, no usar Card (ya tiene contenedor)
  const Wrapper = isSuperset ? 'div' : Card
  const wrapperProps = isSuperset ? {} : { className: 'p-4' }

  return (
    <Wrapper {...wrapperProps}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium">{exercise.name}</h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHistory(true)}
            className="p-1.5 rounded hover:opacity-80"
            style={{ backgroundColor: colors.bgTertiary }}
            title="Info del ejercicio"
          >
            <Info size={14} style={{ color: colors.textSecondary }} />
          </button>
          {onRemove && (
            <button
              onClick={() => setShowRemoveConfirm(true)}
              className="p-1.5 rounded hover:opacity-80"
              style={{ backgroundColor: 'rgba(248, 81, 73, 0.15)' }}
              title="Quitar de la sesión"
            >
              <X size={14} style={{ color: colors.danger }} />
            </button>
          )}
          <span
            className="text-sm font-medium px-2 py-0.5 rounded"
            style={{
              backgroundColor: completedCount === setsCount ? 'rgba(63, 185, 80, 0.15)' : 'rgba(88, 166, 255, 0.15)',
              color: completedCount === setsCount ? colors.success : colors.accent,
            }}
          >
            {completedCount}/{setsCount}
          </span>
        </div>
      </div>

      <div className="my-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
        <Badge variant="accent">{series}×{reps}</Badge>
        {rir !== null && <Badge variant="purple">RIR {rir}</Badge>}
        {tempo && <Badge variant="default">{tempo}</Badge>}
        {(exercise.instructions || notes) && (
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{
              backgroundColor: showNotes ? 'rgba(136, 198, 190, 0.2)' : '#21262d',
              color: showNotes ? '#88c6be' : '#8b949e',
            }}
          >
            {showNotes ? '▲ Ocultar notas' : '▼ Ver notas'}
          </button>
        )}
      </div>

      {showNotes && (exercise.instructions || notes) && (
        <div
          className="mb-3 p-3 rounded text-sm space-y-2"
          style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
        >
          {exercise.instructions && (
            <p style={{ color: '#e6edf3' }}>
              <span style={{ color: colors.accent }}>Ejecución:</span> {exercise.instructions}
            </p>
          )}
          {notes && (
            <p style={{ color: '#e6edf3' }}>
              <span style={{ color: colors.warning }}>Nota:</span> {notes}
            </p>
          )}
        </div>
      )}

      <div className="mb-3">
        <PreviousWorkout exerciseId={exercise.id} measurementType={measurementType} />
      </div>

      <div className="space-y-2">
        {Array.from({ length: setsCount }, (_, i) => {
          const previousSet = previousWorkout?.sets?.find(s => s.setNumber === i + 1)
          return (
            <SetRow
              key={i + 1}
              setNumber={i + 1}
              sessionExerciseId={exerciseKey}
              exerciseId={exercise.id}
              measurementType={measurementType}
              weightUnit={weightUnit}
              descansoSeg={rest_seconds}
              previousSet={previousSet}
              onComplete={onCompleteSet}
              onUncomplete={onUncompleteSet}
              canRemove={setsCount > 0}
              onRemove={removeSet}
            />
          )
        })}
      </div>

      <button
        onClick={addSet}
        className="w-full mt-3 py-2 rounded text-sm font-medium transition-colors"
        style={{
          backgroundColor: '#21262d',
          color: '#8b949e',
        }}
      >
        + Añadir serie
      </button>

      <ExerciseHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        measurementType={measurementType}
        weightUnit={weightUnit}
        routineDayId={routineDayId}
      />

      <ConfirmModal
        isOpen={showRemoveConfirm}
        title="Quitar ejercicio"
        message={`¿Seguro que quieres quitar "${exercise.name}" de esta sesión?`}
        confirmText="Quitar"
        onConfirm={() => {
          setShowRemoveConfirm(false)
          onRemove(exerciseKey)
        }}
        onCancel={() => setShowRemoveConfirm(false)}
      />
    </Wrapper>
  )
}

// Simplified card for warmup exercises (read-only list)
function WarmupExerciseCard({ exercise, series, reps, tempo, notes, rest_seconds }) {
  const [showNotes, setShowNotes] = useState(false)
  const hasNotes = exercise.instructions || notes

  return (
    <div
      className="p-3 rounded-lg"
      style={{
        backgroundColor: colors.bgSecondary,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm" style={{ color: colors.textPrimary }}>
          {exercise.name}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {series > 0 && <Badge variant="accent">{series}×{reps}</Badge>}
        {tempo && <Badge variant="default">{tempo}</Badge>}
        {rest_seconds > 0 && (
          <Badge variant="default">{rest_seconds}s</Badge>
        )}
        {hasNotes && (
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="text-xs px-2 py-0.5 rounded transition-colors"
            style={{
              backgroundColor: showNotes ? 'rgba(136, 198, 190, 0.2)' : '#21262d',
              color: showNotes ? '#88c6be' : '#8b949e',
            }}
          >
            {showNotes ? '▲' : '▼'} Notas
          </button>
        )}
      </div>

      {showNotes && hasNotes && (
        <div
          className="mt-2 p-2 rounded text-xs space-y-1"
          style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
        >
          {exercise.instructions && (
            <p style={{ color: '#e6edf3' }}>
              <span style={{ color: colors.accent }}>Ejecución:</span> {exercise.instructions}
            </p>
          )}
          {notes && (
            <p style={{ color: '#e6edf3' }}>
              <span style={{ color: colors.warning }}>Nota:</span> {notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default WorkoutExerciseCard
