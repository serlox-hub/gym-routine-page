import { memo, useMemo, useState, useEffect } from 'react'
import { View, Text, Pressable, Modal } from 'react-native'
import { Info, Plus, Trash2, ArrowUpDown } from 'lucide-react-native'
import { Card, Badge, ConfirmModal, DropdownMenu } from '../ui'
import SetRow from './SetRow'
import PreviousWorkout from './PreviousWorkout'
import ExerciseHistoryModal from './ExerciseHistoryModal'
import useWorkoutStore from '../../stores/workoutStore'
import { usePreviousWorkout } from '../../hooks/useWorkout'
import { colors } from '../../lib/styles'
import { MeasurementType } from '../../lib/measurementTypes'
import { getMuscleGroupBorderStyle } from '../../lib/constants'

function WarmupExerciseCard({ exercise, series, reps, tempo, notes, rest_seconds }) {
  const [showNotes, setShowNotes] = useState(false)
  const hasNotes = exercise.instructions || notes

  return (
    <View
      className="p-3 rounded-lg"
      style={{
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        ...getMuscleGroupBorderStyle(exercise.muscle_group?.name),
      }}
    >
      <Text className="text-primary font-medium text-sm">{exercise.name}</Text>

      <View className="flex-row flex-wrap items-center gap-1.5 mt-2">
        {series > 0 && <Badge variant="accent">{series}×{reps}</Badge>}
        {tempo && <Badge variant="default">{tempo}</Badge>}
        {rest_seconds > 0 && <Badge variant="default">{rest_seconds}s</Badge>}
        {hasNotes && (
          <Pressable
            onPress={() => setShowNotes(!showNotes)}
            className="px-2 py-0.5 rounded"
            style={{ backgroundColor: showNotes ? 'rgba(136, 198, 190, 0.2)' : colors.bgTertiary }}
          >
            <Text className="text-xs" style={{ color: showNotes ? '#88c6be' : colors.textSecondary }}>
              {showNotes ? '▲' : '▼'} Notas
            </Text>
          </Pressable>
        )}
      </View>

      {showNotes && hasNotes && (
        <View className="mt-2 p-2 rounded gap-1" style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
          {exercise.instructions && (
            <Text className="text-xs" style={{ color: colors.textPrimary }}>
              <Text style={{ color: colors.accent }}>Ejecución: </Text>{exercise.instructions}
            </Text>
          )}
          {notes && (
            <Text className="text-xs" style={{ color: colors.textPrimary }}>
              <Text style={{ color: colors.warning }}>Nota: </Text>{notes}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

function ReorderModal({ visible, onClose, totalExercises, currentIndex, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable onPress={e => e.stopPropagation()} className="bg-surface-block border border-border rounded-t-2xl py-2 pb-8">
          <Text className="text-base font-semibold text-primary px-5 py-3">Mover a posición</Text>
          {Array.from({ length: totalExercises }, (_, i) => (
            <Pressable
              key={i}
              onPress={() => onSelect(i)}
              disabled={i === currentIndex}
              className={`px-5 py-3 ${i === currentIndex ? 'opacity-30' : 'active:bg-surface-card'}`}
            >
              <Text style={{ color: i === currentIndex ? '#8b949e' : '#e6edf3' }} className="text-base">
                Posición {i + 1}{i === currentIndex ? ' (actual)' : ''}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function WorkoutExerciseCard({
  sessionExercise,
  onCompleteSet,
  onUncompleteSet,
  isWarmup = false,
  onRemove,
  isSuperset = false,
  onReorder,
  currentIndex = 0,
  totalExercises = 1,
  isReordering = false,
}) {
  const { id, sessionExerciseId, exercise, series, reps, rir, tempo, notes, rest_seconds, routine_exercise } = sessionExercise
  const tempoRazon = routine_exercise?.tempo_razon
  const [showNotes, setShowNotes] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showReorder, setShowReorder] = useState(false)

  const measurementType = exercise.measurement_type || MeasurementType.WEIGHT_REPS
  const weightUnit = exercise.weight_unit || 'kg'
  const timeUnit = exercise.time_unit || 's'
  const distanceUnit = exercise.distance_unit || 'm'
  const exerciseKey = sessionExerciseId || id

  const setsCount = useWorkoutStore(state => state.exerciseSetCounts[exerciseKey] ?? series)
  const setExerciseSetCount = useWorkoutStore(state => state.setExerciseSetCount)
  const completedCount = useWorkoutStore(state =>
    Object.values(state.completedSets).filter(s => s.sessionExerciseId === exerciseKey).length
  )
  const { data: previousWorkout } = usePreviousWorkout(exercise.id)

  useEffect(() => {
    if (previousWorkout?.sets?.length && !useWorkoutStore.getState().exerciseSetCounts[exerciseKey]) {
      setExerciseSetCount(exerciseKey, previousWorkout.sets.length)
    }
  }, [previousWorkout, exerciseKey, setExerciseSetCount])

  const addSet = () => setExerciseSetCount(exerciseKey, setsCount + 1)
  const removeSet = () => { if (setsCount > 0) setExerciseSetCount(exerciseKey, setsCount - 1) }

  if (isWarmup) {
    return <WarmupExerciseCard exercise={exercise} series={series} reps={reps} tempo={tempo} notes={notes} rest_seconds={rest_seconds} />
  }

  const menuItems = [
    { label: 'Ver historial', icon: Info, onPress: () => setShowHistory(true) },
    { label: 'Añadir serie', icon: Plus, onPress: addSet },
    onReorder && totalExercises > 1 && { type: 'separator' },
    onReorder && totalExercises > 1 && { label: 'Reordenar', icon: ArrowUpDown, onPress: () => setShowReorder(true), disabled: isReordering },
    onRemove && { type: 'separator' },
    onRemove && { label: 'Quitar ejercicio', icon: Trash2, onPress: () => setShowRemoveConfirm(true), danger: true },
  ].filter(Boolean)

  const content = (
    <>
      <View className="flex-row justify-between items-start gap-2">
        <View className="flex-1">
          <Text className="text-primary font-medium">{exercise.name}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View
            className="px-2 py-0.5 rounded"
            style={{
              backgroundColor: completedCount === setsCount ? 'rgba(63, 185, 80, 0.15)' : 'rgba(88, 166, 255, 0.15)',
            }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: completedCount === setsCount ? colors.success : colors.accent }}
            >
              {completedCount}/{setsCount}
            </Text>
          </View>
          <DropdownMenu triggerSize={16} items={menuItems} />
        </View>
      </View>

      <View className="my-3 pt-3 flex-row flex-wrap items-center gap-2" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <Badge variant="accent">{series}×{reps}</Badge>
        {rir !== null && <Badge variant="purple">RIR {rir}</Badge>}
        {tempo && <Badge variant="default">{tempo}</Badge>}
        {rest_seconds > 0 && <Badge variant="default">{rest_seconds}s</Badge>}
        {(exercise.instructions || notes || tempoRazon) && (
          <Pressable
            onPress={() => setShowNotes(!showNotes)}
            className="px-2 py-1 rounded active:opacity-70"
            style={{ backgroundColor: showNotes ? 'rgba(136, 198, 190, 0.2)' : colors.bgTertiary }}
          >
            <Text className="text-xs" style={{ color: showNotes ? '#88c6be' : colors.textSecondary }}>
              {showNotes ? '▲ Ocultar notas' : '▼ Ver notas'}
            </Text>
          </Pressable>
        )}
      </View>

      {showNotes && (exercise.instructions || notes || tempoRazon) && (
        <View className="mb-3 p-3 rounded gap-2" style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
          {exercise.instructions && (
            <Text className="text-sm" style={{ color: colors.textPrimary }}>
              <Text style={{ color: colors.accent }}>Ejecución: </Text>{exercise.instructions}
            </Text>
          )}
          {tempoRazon && (
            <Text className="text-sm" style={{ color: colors.textPrimary }}>
              <Text style={{ color: colors.purple }}>Tempo: </Text>{tempoRazon}
            </Text>
          )}
          {notes && (
            <Text className="text-sm" style={{ color: colors.textPrimary }}>
              <Text style={{ color: colors.warning }}>Nota: </Text>{notes}
            </Text>
          )}
        </View>
      )}

      <View className="mb-3">
        <PreviousWorkout exerciseId={exercise.id} measurementType={measurementType} timeUnit={timeUnit} distanceUnit={distanceUnit} />
      </View>

      <View className="gap-2">
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
      </View>

      <ExerciseHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        measurementType={measurementType}
        weightUnit={weightUnit}
        timeUnit={timeUnit}
        distanceUnit={distanceUnit}
        routineDayId={routine_exercise?.routine_day_id}
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

      {showReorder && (
        <ReorderModal
          visible={showReorder}
          onClose={() => setShowReorder(false)}
          totalExercises={totalExercises}
          currentIndex={currentIndex}
          onSelect={(i) => { onReorder(currentIndex, i); setShowReorder(false) }}
        />
      )}
    </>
  )

  if (isSuperset) {
    return <View>{content}</View>
  }

  return (
    <Card className="p-4" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
      {content}
    </Card>
  )
}

export default memo(WorkoutExerciseCard)
