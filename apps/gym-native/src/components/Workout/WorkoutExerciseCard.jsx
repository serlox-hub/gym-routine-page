import { memo, useState, useEffect, useRef } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Info, Trash2, ArrowUpDown, Repeat2, Pencil } from 'lucide-react-native'
import { Card, ConfirmModal, ReorderModal } from '../ui'
import ExerciseHistoryModal from './ExerciseHistoryModal'
import { ExercisePickerModal } from '../Routine'
import ExerciseCardHeader from './ExerciseCardHeader'
import ExerciseCardNotes from './ExerciseCardNotes'
import NotesToggleBar from './NotesToggleBar'
import EditSessionExerciseModal from './EditSessionExerciseModal'
import SetsList from './SetsList'
import useWorkoutStore from '../../stores/workoutStore'
import { usePreviousWorkout, useUpdateSessionExerciseFields } from '../../hooks/useWorkout'
import { useUserExerciseOverride } from '../../hooks/useExercises'
import { MeasurementType, getHaptics, getExerciseName, usePreference, resolveWeightUnit, hasExerciseNotes, useExpandedExercise, useLazyMountToggle } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'

function WorkoutExerciseCard({ sessionExercise, onCompleteSet, onUncompleteSet, onRemove, onReplace, isSuperset = false, onReorder, currentIndex = 0, totalExercises = 1, positionLabels = [], isReordering = false, existingSupersets = [] }) {
  const { t } = useTranslation()
  const { id, sessionExerciseId, exercise, series, reps, rir, notes, rest_seconds } = sessionExercise
  const [showHistory, setShowHistory] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [showReorder, setShowReorder] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const updateFieldsMutation = useUpdateSessionExerciseFields()
  const { data: override } = useUserExerciseOverride(exercise?.id)
  const { value: globalWeightUnit } = usePreference('weight_unit')
  const measurementType = exercise.measurement_type || MeasurementType.WEIGHT_REPS
  const weightUnit = resolveWeightUnit(override, { weight_unit: globalWeightUnit })
  const exerciseKey = sessionExerciseId || id

  const { expanded, toggle: toggleExpanded } = useExpandedExercise(exerciseKey)
  const collapsed = !expanded
  // Notas montadas perezosamente y ocultadas (no desmontadas) al cerrar, para no
  // re-pedir el GIF que contienen al alternarlas; se olvida la apertura al colapsar
  const { open: showNotes, mounted: notesMounted, toggle: toggleNotes } = useLazyMountToggle(collapsed)

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
    }
    prevCompletedRef.current = isCompleted
  }, [isCompleted])

  const menuItems = [
    { label: t('workout:history.title'), icon: Info, onPress: () => setShowHistory(true) },
    { label: t('common:buttons.edit'), icon: Pencil, onPress: () => setShowEdit(true) },
    onReplace && { label: t('routine:exercise.replace'), icon: Repeat2, onPress: () => setShowReplace(true) },
    onReorder && totalExercises > 1 && { label: t('routine:reorder'), icon: ArrowUpDown, onPress: () => setShowReorder(true), disabled: isReordering },
    onRemove && { label: t('workout:exercise.removeFromSession'), icon: Trash2, onPress: () => setShowRemoveConfirm(true), danger: true },
  ].filter(Boolean)

  const cardStyle = getMuscleGroupBorderStyle(exercise.muscle_group?.name)

  const hasNotes = hasExerciseNotes(exercise, override, notes)

  const content = (
    <>
      <ExerciseCardHeader
        exerciseName={getExerciseName(exercise)}
        muscleGroup={exercise.muscle_group}
        series={series} reps={reps} rir={rir} rest_seconds={rest_seconds}
        collapsed={collapsed}
        isCompleted={isCompleted}
        onToggleCollapse={toggleExpanded}
        menuItems={menuItems}
      />
      {!collapsed && (
        <>
          {hasNotes && (
            <View style={{ marginTop: 14 }}>
              <NotesToggleBar showNotes={showNotes} onToggle={toggleNotes} />
            </View>
          )}
          {notesMounted && (
            <View style={{ display: showNotes ? 'flex' : 'none' }}>
              <ExerciseCardNotes exercise={exercise} notes={notes} />
            </View>
          )}
          <SetsList exerciseKey={exerciseKey} exercise={exercise} setsCount={setsCount} previousWorkout={previousWorkout} measurementType={measurementType} weightUnit={weightUnit} rest_seconds={rest_seconds} reps={reps} onCompleteSet={onCompleteSet} onUncompleteSet={onUncompleteSet} onRemoveSet={removeSet} onAddSet={addSet} />
        </>
      )}
      <ExerciseHistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} exerciseId={exercise.id} exerciseName={getExerciseName(exercise)} measurementType={measurementType} weightUnit={weightUnit} routineDayId={routineDayId} />
      <ConfirmModal isOpen={showRemoveConfirm} title={t('workout:exercise.removeFromSession')} message={t('workout:exercise.removeFromSessionConfirm', { name: getExerciseName(exercise) })} confirmText={t('common:buttons.delete')} onConfirm={() => { setShowRemoveConfirm(false); onRemove(exerciseKey) }} onCancel={() => setShowRemoveConfirm(false)} />
      <ExercisePickerModal isOpen={showReplace} onClose={() => setShowReplace(false)} title={t('routine:exercise.replace')} subtitle={`${t('routine:exercise.replacing')}: ${getExerciseName(exercise)}`} initialMuscleGroup={exercise.muscle_group?.id} onSelect={(newExercise) => { setShowReplace(false); onReplace(exerciseKey, newExercise.id) }} />
      {showReorder && <ReorderModal visible onClose={() => setShowReorder(false)} totalItems={totalExercises} currentIndex={currentIndex} positionLabels={positionLabels} onSelect={(i) => { onReorder(currentIndex, i); setShowReorder(false) }} />}
      <EditSessionExerciseModal isOpen={showEdit} onClose={() => setShowEdit(false)} onSave={handleSaveEdit} sessionExercise={sessionExercise} existingSupersets={existingSupersets} />
    </>
  )

  if (isSuperset) return <View>{content}</View>
  return <Card className={collapsed ? 'px-4 py-2.5' : 'p-4'} style={cardStyle}>{content}</Card>
}

export default memo(WorkoutExerciseCard)
