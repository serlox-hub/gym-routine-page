import { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Info, Plus, Trash2, ArrowUpDown, Repeat2, Pencil } from 'lucide-react'
import { Card, Badge, ConfirmModal } from '../ui/index.js'
import ExerciseHistoryModal from './ExerciseHistoryModal.jsx'
import ExercisePickerModal from '../Routine/ExercisePickerModal.jsx'
import EditSessionExerciseModal from './EditSessionExerciseModal.jsx'
import ExerciseCardHeader from './ExerciseCardHeader.jsx'
import ExerciseCardNotes from './ExerciseCardNotes.jsx'
import SetsList from './SetsList.jsx'
import useWorkoutStore from '../../stores/workoutStore.js'
import { usePreviousWorkout, useUpdateSessionExerciseFields } from '../../hooks/useWorkout.js'
import { colors } from '../../lib/styles.js'
import { MeasurementType, getExerciseInstructions, getExerciseName } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'

function WorkoutExerciseCard({ sessionExercise, onCompleteSet, onUncompleteSet, isWarmup = false, onRemove, onReplace, isSuperset = false, onReorderToPosition, currentIndex = 0, totalExercises = 1, isReordering = false, positionLabels = [], existingSupersets = [] }) {
  const { t } = useTranslation()
  const { id, sessionExerciseId, exercise, series, reps, rir, notes, rest_seconds } = sessionExercise
  const [showNotes, setShowNotes] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const measurementType = exercise.measurement_type || MeasurementType.WEIGHT_REPS
  const weightUnit = exercise.weight_unit || 'kg'
  const exerciseKey = sessionExerciseId || id

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
  const prevCompletedRef = useRef(isCompleted)

  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current) {
      const timer = setTimeout(() => setCollapsed(true), 1000)
      return () => clearTimeout(timer)
    }
    if (!isCompleted && prevCompletedRef.current) setCollapsed(false)
    prevCompletedRef.current = isCompleted
  }, [isCompleted])

  const updateFieldsMutation = useUpdateSessionExerciseFields()
  const addSet = () => setExerciseSetCount(exerciseKey, setsCount + 1)
  const removeSet = () => { if (setsCount > 0) setExerciseSetCount(exerciseKey, setsCount - 1) }
  const handleSaveEdit = (sessionExerciseId, fields, newSeries) => {
    updateFieldsMutation.mutate({ sessionExerciseId, fields })
    if (newSeries && newSeries !== setsCount) setExerciseSetCount(exerciseKey, newSeries)
  }

  if (isWarmup) {
    return <WarmupExerciseCard exercise={exercise} series={series} reps={reps} notes={notes} rest_seconds={rest_seconds} />
  }

  const menuItems = [
    { label: t('workout:history.title'), icon: Info, onClick: () => setShowHistory(true) },
    { label: t('common:buttons.edit'), icon: Pencil, onClick: () => setShowEdit(true) },
    { label: t('workout:set.addSet'), icon: Plus, onClick: addSet },
    onReplace && { label: t('routine:exercise.replace'), icon: Repeat2, onClick: () => setShowReplace(true) },
    onReorderToPosition && totalExercises > 1 && { type: 'separator' },
    onReorderToPosition && totalExercises > 1 && {
      icon: ArrowUpDown, label: t('routine:reorder'), disabled: isReordering,
      children: Array.from({ length: totalExercises }, (_, i) => ({
        label: `${i + 1}. ${positionLabels[i] || ''}`, onClick: () => onReorderToPosition(i),
        active: i === currentIndex, disabled: i === currentIndex || isReordering,
      })),
    },
    onRemove && { type: 'separator' },
    onRemove && { label: t('routine:exercise.removeFromRoutine'), icon: Trash2, onClick: () => setShowRemoveConfirm(true), danger: true },
  ]

  const justCompleted = isCompleted && !collapsed
  const Wrapper = isSuperset ? 'div' : Card
  const baseStyle = isSuperset ? {} : getMuscleGroupBorderStyle(exercise.muscle_group?.name)
  const wrapperProps = isSuperset
    ? { style: justCompleted ? { backgroundColor: 'rgba(63, 185, 80, 0.08)' } : undefined }
    : { className: 'p-4', style: { ...baseStyle, ...(justCompleted ? { backgroundColor: 'rgba(63, 185, 80, 0.08)' } : {}) } }

  return (
    <Wrapper {...wrapperProps}>
      <ExerciseCardHeader exerciseName={getExerciseName(exercise)} completedCount={completedCount} setsCount={setsCount} isCompleted={isCompleted} collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} menuItems={menuItems} />
      {!collapsed && (
        <>
          <ExerciseCardNotes series={series} reps={reps} rir={rir} rest_seconds={rest_seconds} showNotes={showNotes} onToggleNotes={() => setShowNotes(!showNotes)} exercise={exercise} notes={notes} />
          <SetsList exerciseKey={exerciseKey} exercise={exercise} setsCount={setsCount} previousWorkout={previousWorkout} measurementType={measurementType} weightUnit={weightUnit} rest_seconds={rest_seconds} onCompleteSet={onCompleteSet} onUncompleteSet={onUncompleteSet} onRemoveSet={removeSet} />
        </>
      )}
      <ExerciseHistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} exerciseId={exercise.id} exerciseName={getExerciseName(exercise)} measurementType={measurementType} weightUnit={weightUnit} routineDayId={routineDayId} />
      <ExercisePickerModal isOpen={showReplace} onClose={() => setShowReplace(false)} title={t('routine:exercise.replace')} subtitle={`${t('routine:exercise.replacing')}: ${getExerciseName(exercise)}`} initialMuscleGroup={exercise.muscle_group?.id} onSelect={(newExercise) => { setShowReplace(false); onReplace(exerciseKey, newExercise.id) }} />
      <ConfirmModal isOpen={showRemoveConfirm} title={t('routine:exercise.removeFromRoutine')} message={t('routine:exercise.removeConfirm', { name: getExerciseName(exercise) })} confirmText={t('common:buttons.delete')} onConfirm={() => { setShowRemoveConfirm(false); onRemove(exerciseKey) }} onCancel={() => setShowRemoveConfirm(false)} />
      <EditSessionExerciseModal isOpen={showEdit} onClose={() => setShowEdit(false)} onSave={handleSaveEdit} sessionExercise={sessionExercise} existingSupersets={existingSupersets} />
    </Wrapper>
  )
}

// Simplified card for warmup exercises (read-only list)
function WarmupExerciseCard({ exercise, series, reps, notes, rest_seconds }) {
  const { t } = useTranslation()
  const [showNotes, setShowNotes] = useState(false)
  const instructionText = getExerciseInstructions(exercise)
  const hasNotes = instructionText || notes

  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, ...getMuscleGroupBorderStyle(exercise.muscle_group?.name) }}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm" style={{ color: colors.textPrimary }}>{getExerciseName(exercise)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {series > 0 && <Badge variant="accent">{series}×{reps}</Badge>}
        {rest_seconds > 0 && <Badge variant="default">{rest_seconds}s</Badge>}
        {hasNotes && (
          <button onClick={() => setShowNotes(!showNotes)} className="text-xs px-2 py-0.5 rounded transition-colors" style={{ backgroundColor: showNotes ? 'rgba(136, 198, 190, 0.2)' : colors.bgTertiary, color: showNotes ? colors.teal : colors.textSecondary }}>
            {showNotes ? '▲' : '▼'} {t('common:labels.notes')}
          </button>
        )}
      </div>
      {showNotes && hasNotes && (
        <div className="mt-2 p-2 rounded text-xs space-y-1" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
          {instructionText && <p style={{ color: colors.textPrimary, whiteSpace: 'pre-line' }}><span style={{ color: colors.accent }}>{t('exercise:instructions')}:</span> {instructionText}</p>}
          {notes && <p style={{ color: colors.textPrimary }}><span style={{ color: colors.warning }}>{t('common:labels.notes')}:</span> {notes}</p>}
        </div>
      )}
    </div>
  )
}

export default WorkoutExerciseCard
