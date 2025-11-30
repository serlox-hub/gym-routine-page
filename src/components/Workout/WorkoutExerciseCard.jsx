import { useMemo, useState, useEffect } from 'react'
import { History } from 'lucide-react'
import { Card, Badge } from '../ui/index.js'
import SetRow from './SetRow.jsx'
import PreviousWorkout from './PreviousWorkout.jsx'
import ExerciseHistoryModal from './ExerciseHistoryModal.jsx'
import useWorkoutStore from '../../stores/workoutStore.js'
import { usePreviousWorkout } from '../../hooks/usePreviousWorkout.js'

function WorkoutExerciseCard({ routineExercise, onCompleteSet, onUncompleteSet }) {
  const { id, exercise, series, reps, rir, tempo, tempo_razon, notas, measurement_type, descanso_seg } = routineExercise
  const [showNotes, setShowNotes] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Determinar tipo de medición: override en routine_exercise > default del ejercicio > weight_reps
  const measurementType = measurement_type || exercise.measurement_type || 'weight_reps'

  // Unidad de peso por defecto del equipamiento
  const defaultWeightUnit = exercise.equipment?.default_weight_unit || 'kg'

  const completedSets = useWorkoutStore(state => state.completedSets)
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
      .filter(set => set.routineExerciseId === id)
      .length
  }, [completedSets, id])

  const addSet = () => setSetsCount(prev => prev + 1)

  const removeSet = () => {
    if (setsCount > 0) {
      setSetsCount(prev => prev - 1)
    }
  }

  const equipmentInfo = buildEquipmentInfo(exercise)

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium">{exercise.nombre}</h4>
          {equipmentInfo && (
            <p className="text-sm text-secondary">{equipmentInfo}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="p-1.5 rounded hover:opacity-80"
            style={{ backgroundColor: '#21262d' }}
            title="Ver histórico"
          >
            <History size={14} style={{ color: '#8b949e' }} />
          </button>
          <span
            className="text-sm font-medium px-2 py-0.5 rounded"
            style={{
              backgroundColor: completedCount === setsCount ? 'rgba(63, 185, 80, 0.15)' : 'rgba(88, 166, 255, 0.15)',
              color: completedCount === setsCount ? '#3fb950' : '#58a6ff',
            }}
          >
            {completedCount}/{setsCount}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge variant="accent">{series}×{reps}</Badge>
        {rir !== null && <Badge variant="purple">RIR {rir}</Badge>}
        {tempo && <Badge variant="default">{tempo}</Badge>}
        {(notas || tempo_razon) && (
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

      {showNotes && (notas || tempo_razon) && (
        <div
          className="mb-3 p-3 rounded text-sm space-y-2"
          style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
        >
          {notas && (
            <p style={{ color: '#e6edf3' }}>{notas}</p>
          )}
          {tempo_razon && (
            <p style={{ color: '#8b949e' }}>
              <span style={{ color: '#a371f7' }}>Tempo:</span> {tempo_razon}
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
              routineExerciseId={id}
              exerciseId={exercise.id}
              measurementType={measurementType}
              defaultWeightUnit={defaultWeightUnit}
              descansoSeg={descanso_seg}
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
        exerciseName={exercise.nombre}
      />
    </Card>
  )
}

function buildEquipmentInfo(exercise) {
  const parts = []
  if (exercise.equipment?.nombre) parts.push(exercise.equipment.nombre)
  if (exercise.grip_type?.nombre && exercise.grip_type.nombre !== 'N/A') {
    parts.push(exercise.grip_type.nombre)
  }
  if (exercise.altura_polea) parts.push(`Polea ${exercise.altura_polea}`)
  return parts.join(' · ')
}

export default WorkoutExerciseCard
