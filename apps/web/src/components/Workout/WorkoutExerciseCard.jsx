import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Info, Trash2, ArrowUpDown, Repeat2, Pencil } from 'lucide-react'
import { Card, ConfirmModal } from '../ui/index.js'
import ExerciseHistoryModal from './ExerciseHistoryModal.jsx'
import ExercisePickerModal from '../Routine/ExercisePickerModal.jsx'
import EditSessionExerciseModal from './EditSessionExerciseModal.jsx'
import ExerciseCardHeader from './ExerciseCardHeader.jsx'
import ExerciseCardNotes from './ExerciseCardNotes.jsx'
import NotesToggleBar from './NotesToggleBar.jsx'
import SetsList from './SetsList.jsx'
import useWorkoutStore from '../../stores/workoutStore.js'
import { usePreviousWorkout, useUpdateSessionExerciseFields } from '../../hooks/useWorkout.js'
import { useUserExerciseOverride } from '../../hooks/useExercises.js'
import { colors } from '../../lib/styles.js'
import { MeasurementType, getExerciseName, usePreference, resolveWeightUnit, hasExerciseNotes, useExpandedExercise } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'

function WorkoutExerciseCard({ sessionExercise, onCompleteSet, onUncompleteSet, onRemove, onReplace, isSuperset = false, onReorderToPosition, currentIndex = 0, totalExercises = 1, isReordering = false, positionLabels = [], existingSupersets = [] }) {
  const { t } = useTranslation()
  const { id, sessionExerciseId, exercise, series, reps, rir, notes, rest_seconds } = sessionExercise
  const [showNotes, setShowNotes] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const { data: override } = useUserExerciseOverride(exercise?.id)
  const { value: globalWeightUnit } = usePreference('weight_unit')
  const measurementType = exercise.measurement_type || MeasurementType.WEIGHT_REPS
  const weightUnit = resolveWeightUnit(override, { weight_unit: globalWeightUnit })
  const exerciseKey = sessionExerciseId || id

  const { expanded, toggle: toggleExpanded } = useExpandedExercise(exerciseKey)
  const collapsed = !expanded

  const completedSets = useWorkoutStore(state => state.completedSets)
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const exerciseSetCounts = useWorkoutStore(state => state.exerciseSetCounts)
  const setExerciseSetCount = useWorkoutStore(state => state.setExerciseSetCount)
  const { data: previousWorkout } = usePreviousWorkout(exercise.id)
  const setsCount = exerciseSetCounts[exerciseKey] ?? series

  useEffect(() => {
    if (previousWorkout?.sets?.length && exerciseSetCounts[exerciseKey] === undefined) {
      setExerciseSetCount(exerciseKey, previousWorkout.sets.length)
    }
  }, [previousWorkout, exerciseKey, exerciseSetCounts, setExerciseSetCount])

  const completedCount = useMemo(() => Object.values(completedSets).filter(set => set.sessionExerciseId === exerciseKey).length, [completedSets, exerciseKey])
  const isCompleted = completedCount === setsCount && setsCount > 0

  const updateFieldsMutation = useUpdateSessionExerciseFields()
  const addSet = () => setExerciseSetCount(exerciseKey, setsCount + 1)
  const removeSet = () => { if (setsCount > 0) setExerciseSetCount(exerciseKey, setsCount - 1) }
  const handleSaveEdit = (sessionExerciseId, fields, newSeries) => {
    updateFieldsMutation.mutate({ sessionExerciseId, fields })
    if (newSeries && newSeries !== setsCount) setExerciseSetCount(exerciseKey, newSeries)
  }

  const menuItems = [
    { label: t('workout:history.title'), icon: Info, onClick: () => setShowHistory(true) },
    { label: t('common:buttons.edit'), icon: Pencil, onClick: () => setShowEdit(true) },
    onReplace && { label: t('routine:exercise.replace'), icon: Repeat2, onClick: () => setShowReplace(true) },
    onReorderToPosition && totalExercises > 1 && {
      icon: ArrowUpDown, label: t('routine:reorder'), disabled: isReordering,
      children: Array.from({ length: totalExercises }, (_, i) => ({
        label: `${i + 1}. ${positionLabels[i] || ''}`, onClick: () => onReorderToPosition(i),
        active: i === currentIndex, disabled: i === currentIndex || isReordering,
      })),
    },
    onRemove && { label: t('workout:exercise.removeFromSession'), icon: Trash2, onClick: () => setShowRemoveConfirm(true), danger: true },
  ]

  const justCompleted = isCompleted && !collapsed
  const Wrapper = isSuperset ? 'div' : Card
  const completedBg = justCompleted ? { backgroundColor: colors.successBgSubtle } : null
  const wrapperProps = isSuperset
    ? { style: completedBg }
    : {
        className: collapsed ? 'px-4 py-2.5' : 'p-4',
        style: { ...getMuscleGroupBorderStyle(exercise.muscle_group?.name), ...completedBg },
      }

  const hasNotes = hasExerciseNotes(exercise, override, notes)

  return (
    <Wrapper {...wrapperProps}>
      <ExerciseCardHeader
        exerciseName={getExerciseName(exercise)}
        muscleGroup={exercise.muscle_group}
        series={series} reps={reps} rir={rir} rest_seconds={rest_seconds}
        collapsed={collapsed}
        onToggleCollapse={toggleExpanded}
        menuItems={menuItems}
      />
      {!collapsed && (
        <>
          {hasNotes && (
            <div style={{ marginTop: 14 }}>
              <NotesToggleBar showNotes={showNotes} onToggle={() => setShowNotes(!showNotes)} />
            </div>
          )}
          {showNotes && <ExerciseCardNotes exercise={exercise} notes={notes} />}
          <SetsList exerciseKey={exerciseKey} exercise={exercise} setsCount={setsCount} previousWorkout={previousWorkout} measurementType={measurementType} weightUnit={weightUnit} rest_seconds={rest_seconds} onCompleteSet={onCompleteSet} onUncompleteSet={onUncompleteSet} onRemoveSet={removeSet} onAddSet={addSet} />
        </>
      )}
      <ExerciseHistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} exerciseId={exercise.id} exerciseName={getExerciseName(exercise)} measurementType={measurementType} weightUnit={weightUnit} routineDayId={routineDayId} />
      <ExercisePickerModal isOpen={showReplace} onClose={() => setShowReplace(false)} title={t('routine:exercise.replace')} subtitle={`${t('routine:exercise.replacing')}: ${getExerciseName(exercise)}`} initialMuscleGroup={exercise.muscle_group?.id} onSelect={(newExercise) => { setShowReplace(false); onReplace(exerciseKey, newExercise.id) }} />
      <ConfirmModal isOpen={showRemoveConfirm} title={t('workout:exercise.removeFromSession')} message={t('workout:exercise.removeFromSessionConfirm', { name: getExerciseName(exercise) })} confirmText={t('common:buttons.delete')} onConfirm={() => { setShowRemoveConfirm(false); onRemove(exerciseKey) }} onCancel={() => setShowRemoveConfirm(false)} />
      <EditSessionExerciseModal isOpen={showEdit} onClose={() => setShowEdit(false)} onSave={handleSaveEdit} sessionExercise={sessionExercise} existingSupersets={existingSupersets} />
    </Wrapper>
  )
}

export default WorkoutExerciseCard
