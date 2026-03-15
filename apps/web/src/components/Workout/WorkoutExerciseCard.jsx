import { useMemo, useState, useEffect, useRef } from 'react'
import { Info, Plus, Trash2, ArrowUpDown, Repeat2 } from 'lucide-react'
import { Card, Badge, ConfirmModal, DropdownMenu } from '../ui/index.js'
import SetRow from './SetRow.jsx'
import PreviousWorkout from './PreviousWorkout.jsx'
import ExerciseHistoryModal from './ExerciseHistoryModal.jsx'
import ExercisePickerModal from '../Routine/ExercisePickerModal.jsx'
import useWorkoutStore from '../../stores/workoutStore.js'
import { usePreviousWorkout } from '../../hooks/useWorkout.js'
import { colors } from '../../lib/styles.js'
import { MeasurementType } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/constants.js'

function WorkoutExerciseCard({ sessionExercise, onCompleteSet, onUncompleteSet, isWarmup = false, onRemove, onReplace, isSuperset = false, onReorderToPosition, currentIndex = 0, totalExercises = 1, isReordering = false, positionLabels = [] }) {
  const { id, sessionExerciseId, exercise, series, reps, rir, tempo, notes, rest_seconds, routine_exercise } = sessionExercise
  const tempoRazon = routine_exercise?.tempo_razon
  // sessionExerciseId es el id de session_exercises (puede ser igual a id si viene transformado)
  const [showNotes, setShowNotes] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Determinar tipo de medición del ejercicio
  const measurementType = exercise.measurement_type || MeasurementType.WEIGHT_REPS

  // Unidades del ejercicio
  const weightUnit = exercise.weight_unit || 'kg'
  const timeUnit = exercise.time_unit || 's'
  const distanceUnit = exercise.distance_unit || 'm'

  // Usar sessionExerciseId (id de session_exercises) para rastrear sets
  const exerciseKey = sessionExerciseId || id

  const completedSets = useWorkoutStore(state => state.completedSets)
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const exerciseSetCounts = useWorkoutStore(state => state.exerciseSetCounts)
  const setExerciseSetCount = useWorkoutStore(state => state.setExerciseSetCount)
  const { data: previousWorkout } = usePreviousWorkout(exercise.id)

  // Usar el store para el conteo de series, con fallback a series planificadas
  const setsCount = exerciseSetCounts[exerciseKey] ?? series

  // Inicializar con datos de sesión anterior si existen
  useEffect(() => {
    if (previousWorkout?.sets?.length && exerciseSetCounts[exerciseKey] === undefined) {
      setExerciseSetCount(exerciseKey, previousWorkout.sets.length)
    }
  }, [previousWorkout, exerciseKey, exerciseSetCounts, setExerciseSetCount])

  const completedCount = useMemo(() => {
    return Object.values(completedSets)
      .filter(set => set.sessionExerciseId === exerciseKey)
      .length
  }, [completedSets, exerciseKey])

  const isCompleted = completedCount === setsCount && setsCount > 0
  const prevCompletedRef = useRef(isCompleted)

  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current) {
      const timer = setTimeout(() => setCollapsed(true), 1000)
      return () => clearTimeout(timer)
    }
    if (!isCompleted && prevCompletedRef.current) {
      setCollapsed(false)
    }
    prevCompletedRef.current = isCompleted
  }, [isCompleted])

  const addSet = () => setExerciseSetCount(exerciseKey, setsCount + 1)

  const removeSet = () => {
    if (setsCount > 0) {
      setExerciseSetCount(exerciseKey, setsCount - 1)
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

  const justCompleted = isCompleted && !collapsed

  // Si está dentro de un superset, no usar Card (ya tiene contenedor)
  const Wrapper = isSuperset ? 'div' : Card
  const baseStyle = isSuperset ? {} : getMuscleGroupBorderStyle(exercise.muscle_group?.name)
  const wrapperProps = isSuperset
    ? { style: justCompleted ? { backgroundColor: 'rgba(63, 185, 80, 0.08)' } : undefined }
    : { className: 'p-4', style: { ...baseStyle, ...(justCompleted ? { backgroundColor: 'rgba(63, 185, 80, 0.08)' } : {}) } }

  return (
    <Wrapper {...wrapperProps}>
      <div
        className="flex justify-between items-start gap-2"
        onClick={() => setCollapsed(c => !c)}
        style={{ cursor: 'pointer' }}
      >
        <span className="text-xs" style={{ color: colors.textSecondary }}>{collapsed ? '▶' : '▼'}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium" style={collapsed ? { opacity: 0.7 } : undefined}>{exercise.name}</h4>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-sm font-medium px-2 py-0.5 rounded"
            style={{
              backgroundColor: isCompleted ? 'rgba(63, 185, 80, 0.15)' : 'rgba(88, 166, 255, 0.15)',
              color: isCompleted ? colors.success : colors.accent,
            }}
          >
            {completedCount}/{setsCount}
          </span>
          {!collapsed && (
            <DropdownMenu
              triggerSize={16}
              items={[
                { label: 'Ver historial', icon: Info, onClick: () => setShowHistory(true) },
                { label: 'Añadir serie', icon: Plus, onClick: addSet },
                onReplace && { label: 'Sustituir', icon: Repeat2, onClick: () => setShowReplace(true) },
                onReorderToPosition && totalExercises > 1 && { type: 'separator' },
                onReorderToPosition && totalExercises > 1 && {
                  icon: ArrowUpDown,
                  label: 'Reordenar',
                  disabled: isReordering,
                  children: Array.from({ length: totalExercises }, (_, i) => ({
                    label: `${i + 1}. ${positionLabels[i] || ''}`,
                    onClick: () => onReorderToPosition(i),
                    active: i === currentIndex,
                    disabled: i === currentIndex || isReordering,
                  })),
                },
                onRemove && { type: 'separator' },
                onRemove && { label: 'Quitar ejercicio', icon: Trash2, onClick: () => setShowRemoveConfirm(true), danger: true },
              ]}
            />
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="my-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
            <Badge variant="accent">{series}×{reps}</Badge>
            {rir !== null && <Badge variant="purple">RIR {rir}</Badge>}
            {tempo && <Badge variant="default">{tempo}</Badge>}
            {rest_seconds > 0 && <Badge variant="default">{rest_seconds}s</Badge>}
            {(exercise.instructions || notes || tempoRazon) && (
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{
                  backgroundColor: showNotes ? 'rgba(136, 198, 190, 0.2)' : colors.bgTertiary,
                  color: showNotes ? colors.teal : colors.textSecondary,
                }}
              >
                {showNotes ? '▲ Ocultar notas' : '▼ Ver notas'}
              </button>
            )}
          </div>

          {showNotes && (exercise.instructions || notes || tempoRazon) && (
            <div
              className="mb-3 p-3 rounded text-sm space-y-2"
              style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
            >
              {exercise.instructions && (
                <p style={{ color: colors.textPrimary }}>
                  <span style={{ color: colors.accent }}>Ejecución:</span> {exercise.instructions}
                </p>
              )}
              {tempoRazon && (
                <p style={{ color: colors.textPrimary }}>
                  <span style={{ color: colors.purple }}>Tempo:</span> {tempoRazon}
                </p>
              )}
              {notes && (
                <p style={{ color: colors.textPrimary }}>
                  <span style={{ color: colors.warning }}>Nota:</span> {notes}
                </p>
              )}
            </div>
          )}

          <div className="mb-3">
            <PreviousWorkout exerciseId={exercise.id} measurementType={measurementType} timeUnit={timeUnit} distanceUnit={distanceUnit} />
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
                  timeUnit={timeUnit}
                  distanceUnit={distanceUnit}
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
        </>
      )}

      <ExerciseHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        measurementType={measurementType}
        weightUnit={weightUnit}
        timeUnit={timeUnit}
        distanceUnit={distanceUnit}
        routineDayId={routineDayId}
      />

      <ExercisePickerModal
        isOpen={showReplace}
        onClose={() => setShowReplace(false)}
        title="Sustituir ejercicio"
        subtitle={`Sustituyendo: ${exercise.name}`}
        initialMuscleGroup={exercise.muscle_group?.id}
        onSelect={(newExercise) => {
          setShowReplace(false)
          onReplace(exerciseKey, newExercise.id)
        }}
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
        ...getMuscleGroupBorderStyle(exercise.muscle_group?.name),
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
              backgroundColor: showNotes ? 'rgba(136, 198, 190, 0.2)' : colors.bgTertiary,
              color: showNotes ? colors.teal : colors.textSecondary,
            }}
          >
            {showNotes ? '▲' : '▼'} Notas
          </button>
        )}
      </div>

      {showNotes && hasNotes && (
        <div
          className="mt-2 p-2 rounded text-xs space-y-1"
          style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        >
          {exercise.instructions && (
            <p style={{ color: colors.textPrimary }}>
              <span style={{ color: colors.accent }}>Ejecución:</span> {exercise.instructions}
            </p>
          )}
          {notes && (
            <p style={{ color: colors.textPrimary }}>
              <span style={{ color: colors.warning }}>Nota:</span> {notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default WorkoutExerciseCard
