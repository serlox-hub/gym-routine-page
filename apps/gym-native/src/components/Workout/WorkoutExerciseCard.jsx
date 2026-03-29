import { memo, useState, useEffect, useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Info, Plus, Trash2, ArrowUpDown, Repeat2, Pencil } from 'lucide-react-native'
import { Card, Badge, ConfirmModal, ReorderModal } from '../ui'
import ExerciseHistoryModal from './ExerciseHistoryModal'
import { ExercisePickerModal } from '../Routine'
import ExerciseCardHeader from './ExerciseCardHeader'
import ExerciseCardNotes from './ExerciseCardNotes'
import EditSessionExerciseModal from './EditSessionExerciseModal'
import SetsList from './SetsList'
import useWorkoutStore from '../../stores/workoutStore'
import { usePreviousWorkout, useUpdateSessionExerciseFields } from '../../hooks/useWorkout'
import { colors } from '../../lib/styles'
import { MeasurementType, getHaptics } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'

function WarmupExerciseCard({ exercise, series, reps, tempo, notes, rest_seconds }) {
  const { t } = useTranslation()
  const [showNotes, setShowNotes] = useState(false)
  const hasNotes = exercise.instructions || notes

  return (
    <View className="p-3 rounded-lg" style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, ...getMuscleGroupBorderStyle(exercise.muscle_group?.name) }}>
      <Text className="text-primary font-medium text-sm">{exercise.name}</Text>
      <View className="flex-row flex-wrap items-center gap-1.5 mt-2">
        {series > 0 && <Badge variant="accent">{series}×{reps}</Badge>}
        {tempo && <Badge variant="default">{tempo}</Badge>}
        {rest_seconds > 0 && <Badge variant="default">{rest_seconds}s</Badge>}
        {hasNotes && (
          <Pressable onPress={() => setShowNotes(!showNotes)} className="px-2 py-0.5 rounded" style={{ backgroundColor: showNotes ? 'rgba(136, 198, 190, 0.2)' : colors.bgTertiary }}>
            <Text className="text-xs" style={{ color: showNotes ? colors.teal : colors.textSecondary }}>{showNotes ? '▲' : '▼'} {t('common:labels.notes')}</Text>
          </Pressable>
        )}
      </View>
      {showNotes && hasNotes && (
        <View className="mt-2 p-2 rounded gap-1" style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
          {exercise.instructions && <Text className="text-xs" style={{ color: colors.textPrimary }}><Text style={{ color: colors.accent }}>{t('exercise:instructions')}: </Text>{exercise.instructions}</Text>}
          {notes && <Text className="text-xs" style={{ color: colors.textPrimary }}><Text style={{ color: colors.warning }}>{t('common:labels.notes')}: </Text>{notes}</Text>}
        </View>
      )}
    </View>
  )
}

function RegularExerciseCard({ sessionExercise, onCompleteSet, onUncompleteSet, onRemove, onReplace, isSuperset, onReorder, currentIndex, totalExercises, positionLabels, isReordering, existingSupersets = [] }) {
  const { t } = useTranslation()
  const { id, sessionExerciseId, exercise, series, reps, rir, tempo, notes, rest_seconds, routine_exercise } = sessionExercise
  const tempoRazon = routine_exercise?.tempo_razon
  const [showNotes, setShowNotes] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [showReorder, setShowReorder] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const updateFieldsMutation = useUpdateSessionExerciseFields()
  const measurementType = exercise.measurement_type || MeasurementType.WEIGHT_REPS
  const weightUnit = exercise.weight_unit || 'kg'
  const timeUnit = exercise.time_unit || 's'
  const distanceUnit = exercise.distance_unit || 'm'
  const exerciseKey = sessionExerciseId || id

  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const setsCount = useWorkoutStore(state => state.exerciseSetCounts[exerciseKey] ?? series)
  const setExerciseSetCount = useWorkoutStore(state => state.setExerciseSetCount)
  const completedCount = useWorkoutStore(state => { let c = 0; for (const k in state.completedSets) { if (k.startsWith(`${exerciseKey}-`)) c++ } return c })
  const { data: previousWorkout } = usePreviousWorkout(exercise.id)

  useEffect(() => {
    if (previousWorkout?.sets?.length && !useWorkoutStore.getState().exerciseSetCounts[exerciseKey]) {
      setExerciseSetCount(exerciseKey, previousWorkout.sets.length)
    }
  }, [previousWorkout, exerciseKey, setExerciseSetCount])

  const addSet = () => setExerciseSetCount(exerciseKey, setsCount + 1)
  const removeSet = () => { if (setsCount > 0) setExerciseSetCount(exerciseKey, setsCount - 1) }
  const handleSaveEdit = (sessionExerciseId, fields, newSeries) => {
    updateFieldsMutation.mutate({ sessionExerciseId, fields })
    if (newSeries && newSeries !== setsCount) setExerciseSetCount(exerciseKey, newSeries)
  }
  const isCompleted = completedCount === setsCount && setsCount > 0
  const prevCompletedRef = useRef(isCompleted)

  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current) {
      getHaptics()?.onExerciseComplete?.()
      const timer = setTimeout(() => setCollapsed(true), 1000)
      return () => clearTimeout(timer)
    }
    if (!isCompleted && prevCompletedRef.current) setCollapsed(false)
    prevCompletedRef.current = isCompleted
  }, [isCompleted])

  const menuItems = [
    { label: t('workout:history.title'), icon: Info, onPress: () => setShowHistory(true) },
    { label: t('common:buttons.edit'), icon: Pencil, onPress: () => setShowEdit(true) },
    { label: t('workout:set.addSet'), icon: Plus, onPress: addSet },
    onReplace && { label: t('routine:exercise.replace'), icon: Repeat2, onPress: () => setShowReplace(true) },
    onReorder && totalExercises > 1 && { type: 'separator' },
    onReorder && totalExercises > 1 && { label: t('routine:reorder'), icon: ArrowUpDown, onPress: () => setShowReorder(true), disabled: isReordering },
    onRemove && { type: 'separator' },
    onRemove && { label: t('routine:exercise.removeFromRoutine'), icon: Trash2, onPress: () => setShowRemoveConfirm(true), danger: true },
  ].filter(Boolean)

  const justCompleted = isCompleted && !collapsed
  const cardStyle = { ...getMuscleGroupBorderStyle(exercise.muscle_group?.name), ...(justCompleted ? { backgroundColor: 'rgba(63, 185, 80, 0.08)' } : {}) }

  const content = (
    <>
      <ExerciseCardHeader exerciseName={exercise.name} completedCount={completedCount} setsCount={setsCount} isCompleted={isCompleted} collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} menuItems={menuItems} />
      {!collapsed && (
        <>
          <ExerciseCardNotes series={series} reps={reps} rir={rir} tempo={tempo} rest_seconds={rest_seconds} showNotes={showNotes} onToggleNotes={() => setShowNotes(!showNotes)} exercise={exercise} tempoRazon={tempoRazon} notes={notes} />
          <SetsList exerciseKey={exerciseKey} exercise={exercise} setsCount={setsCount} previousWorkout={previousWorkout} measurementType={measurementType} weightUnit={weightUnit} timeUnit={timeUnit} distanceUnit={distanceUnit} rest_seconds={rest_seconds} onCompleteSet={onCompleteSet} onUncompleteSet={onUncompleteSet} onRemoveSet={removeSet} />
        </>
      )}
      <ExerciseHistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} exerciseId={exercise.id} exerciseName={exercise.name} measurementType={measurementType} weightUnit={weightUnit} timeUnit={timeUnit} distanceUnit={distanceUnit} routineDayId={routineDayId} />
      <ConfirmModal isOpen={showRemoveConfirm} title={t('routine:exercise.removeFromRoutine')} message={t('routine:exercise.removeConfirm', { name: exercise.name })} confirmText={t('common:buttons.delete')} onConfirm={() => { setShowRemoveConfirm(false); onRemove(exerciseKey) }} onCancel={() => setShowRemoveConfirm(false)} />
      <ExercisePickerModal isOpen={showReplace} onClose={() => setShowReplace(false)} title={t('routine:exercise.replace')} subtitle={`${t('routine:exercise.replacing')}: ${exercise.name}`} initialMuscleGroup={exercise.muscle_group?.id} onSelect={(newExercise) => { setShowReplace(false); onReplace(exerciseKey, newExercise.id) }} />
      {showReorder && <ReorderModal visible onClose={() => setShowReorder(false)} totalItems={totalExercises} currentIndex={currentIndex} positionLabels={positionLabels} onSelect={(i) => { onReorder(currentIndex, i); setShowReorder(false) }} />}
      <EditSessionExerciseModal isOpen={showEdit} onClose={() => setShowEdit(false)} onSave={handleSaveEdit} sessionExercise={sessionExercise} existingSupersets={existingSupersets} />
    </>
  )

  if (isSuperset) return <View style={justCompleted ? { backgroundColor: 'rgba(63, 185, 80, 0.08)' } : undefined}>{content}</View>
  return <Card className="p-4" style={cardStyle}>{content}</Card>
}

function WorkoutExerciseCard({ sessionExercise, onCompleteSet, onUncompleteSet, isWarmup = false, onRemove, onReplace, isSuperset = false, onReorder, currentIndex = 0, totalExercises = 1, positionLabels = [], isReordering = false, existingSupersets = [] }) {
  const { exercise, series, reps, tempo, notes, rest_seconds } = sessionExercise
  if (isWarmup) return <WarmupExerciseCard exercise={exercise} series={series} reps={reps} tempo={tempo} notes={notes} rest_seconds={rest_seconds} />
  return <RegularExerciseCard sessionExercise={sessionExercise} onCompleteSet={onCompleteSet} onUncompleteSet={onUncompleteSet} onRemove={onRemove} onReplace={onReplace} isSuperset={isSuperset} onReorder={onReorder} currentIndex={currentIndex} totalExercises={totalExercises} positionLabels={positionLabels} isReordering={isReordering} existingSupersets={existingSupersets} />
}

export default memo(WorkoutExerciseCard)
