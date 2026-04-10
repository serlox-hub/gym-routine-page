import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trash2, ChevronDown, Play, Pencil, ArrowUpDown } from 'lucide-react'
import { Card, ConfirmModal, DropdownMenu, LoadingSpinner } from '../ui/index.js'
import { useRoutineBlocks, useReorderRoutineExercises, useDeleteRoutineExercise, useUpdateRoutineDay } from '../../hooks/useRoutines.js'
import { useStartSession } from '../../hooks/useWorkout.js'
import { colors } from '../../lib/styles.js'
import { getExistingSupersetIds, moveItemToPosition } from '@gym/shared'
import DayEditForm from './DayEditForm.jsx'
import BlockSection from './BlockSection.jsx'

function DayCard({ day, routineId, routineName, isEditing, onAddExercise, onAddWarmup, onEditExercise, onReplaceExercise, onDuplicateExercise, onMoveExerciseToDay, onDelete, onReorderToPosition, currentIndex = 0, totalDays = 1, dayNames = [], isReorderingDays = false, hasActiveSession, activeRoutineDayId }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id, sort_order, name, estimated_duration_min } = day
  const [isExpanded, setIsExpanded] = useState(false)

  // Cargar bloques siempre (necesarios para iniciar workout)
  const { data: blocks, isLoading: loadingBlocks } = useRoutineBlocks(id)
  const startSessionMutation = useStartSession()
  const reorderExercises = useReorderRoutineExercises()
  const deleteExercise = useDeleteRoutineExercise()
  const updateDay = useUpdateRoutineDay()
  const [editingDay, setEditingDay] = useState(false)
  const [dayForm, setDayForm] = useState({ name, duration: estimated_duration_min || '' })
  const [exerciseToDelete, setExerciseToDelete] = useState(null)

  const warmupBlock = blocks?.find(b => b.name === 'Calentamiento')
  const mainBlock = blocks?.find(b => b.name === 'Principal')
  const warmupExercises = warmupBlock?.routine_exercises || []
  const mainExercises = mainBlock?.routine_exercises || []
  const allExercises = [...warmupExercises, ...mainExercises]

  const existingSupersets = getExistingSupersetIds(allExercises)

  const handleClick = () => {
    if (!editingDay) {
      setIsExpanded(!isExpanded)
    }
  }

  const isThisDayActive = hasActiveSession && activeRoutineDayId === id

  const handleStartWorkout = (e) => {
    e.stopPropagation()
    startSessionMutation.mutate(
      { routineDayId: id, routineId: parseInt(routineId), routineName, dayName: name, blocks },
      {
        onSuccess: () => navigate(`/routine/${routineId}/day/${id}/workout`)
      }
    )
  }

  const handleContinueWorkout = (e) => {
    e.stopPropagation()
    navigate(`/routine/${routineId}/day/${id}/workout`)
  }

  const handleReorderWarmup = (exerciseId, newIndex) => {
    const newExercises = moveItemToPosition(warmupExercises, exerciseId, newIndex)
    if (newExercises) {
      // Combinar con main exercises para enviar todo el día
      reorderExercises.mutate({ dayId: id, exercises: [...newExercises, ...mainExercises] })
    }
  }

  const handleReorderMain = (exerciseId, newIndex) => {
    const newExercises = moveItemToPosition(mainExercises, exerciseId, newIndex)
    if (newExercises) {
      // Combinar con warmup exercises para enviar todo el día
      reorderExercises.mutate({ dayId: id, exercises: [...warmupExercises, ...newExercises] })
    }
  }

  const handleDeleteExercise = () => {
    if (!exerciseToDelete) return
    deleteExercise.mutate({ exerciseId: exerciseToDelete.id, dayId: id })
    setExerciseToDelete(null)
  }

  const handleSaveDay = () => {
    const hasChanges = dayForm.name.trim() !== name ||
      (dayForm.duration || null) !== (estimated_duration_min || null)

    if (dayForm.name.trim() && hasChanges) {
      updateDay.mutate({
        dayId: id,
        routineId,
        data: {
          name: dayForm.name.trim(),
          estimated_duration_min: dayForm.duration ? parseInt(dayForm.duration) : null
        }
      })
    }
    setEditingDay(false)
  }


  return (
    <Card
      className={`${editingDay ? 'cursor-default' : 'cursor-pointer'}`}
      onClick={handleClick}
      noHover
      style={{
        borderRadius: 14,
        padding: isEditing ? 16 : '12px 14px',
      }}
    >
      {editingDay ? (
        <DayEditForm
          dayNumber={sort_order}
          form={dayForm}
          setForm={setDayForm}
          onSave={handleSaveDay}
        />
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <ChevronDown
              size={16}
              color={colors.textSecondary}
              className="shrink-0 transition-transform"
              style={{
                transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'
              }}
            />
            <h3 className="font-bold truncate" style={{ color: colors.textPrimary, fontSize: 15 }}>{name}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {!isEditing && (
              <button
                onClick={isThisDayActive ? handleContinueWorkout : handleStartWorkout}
                disabled={startSessionMutation.isPending || loadingBlocks || (hasActiveSession && !isThisDayActive)}
                className="disabled:opacity-40"
              >
                <Play size={20} style={{ color: colors.success }} />
              </button>
            )}
            {isEditing && (
              <DropdownMenu
                items={[
                  {
                    icon: Pencil,
                    label: t('common:buttons.edit'),
                    onClick: () => {
                      setDayForm({ name, duration: estimated_duration_min || '' })
                      setEditingDay(true)
                    }
                  },
                  totalDays > 1 && {
                    icon: ArrowUpDown,
                    label: t('routine:reorder'),
                    disabled: isReorderingDays,
                    children: Array.from({ length: totalDays }, (_, i) => ({
                      label: `${i + 1}. ${dayNames[i] || ''}`,
                      onClick: () => onReorderToPosition(i),
                      active: i === currentIndex,
                      disabled: i === currentIndex || isReorderingDays,
                    })),
                  },
                  { icon: Trash2, label: t('common:buttons.delete'), onClick: () => onDelete(id), danger: true },
                ]}
              />
            )}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="mt-3 space-y-4">
          {loadingBlocks ? (
            <LoadingSpinner />
          ) : isEditing ? (
            <>
              {warmupBlock && (
                <BlockSection
                  block={warmupBlock}
                  routineDayId={id}
                  isEditing
                  isReordering={reorderExercises.isPending}
                  onAddExercise={() => onAddWarmup(id, existingSupersets)}
                  onEditExercise={(re) => onEditExercise(re, id, existingSupersets)}
                  onReplaceExercise={(re) => onReplaceExercise(re, id)}
                  onReorderExercise={handleReorderWarmup}
                  onDeleteExercise={(re) => setExerciseToDelete(re)}
                  onDuplicateExercise={(re) => onDuplicateExercise(re, id)}
                  onMoveExerciseToDay={(re) => onMoveExerciseToDay(re, id)}
                />
              )}
              {!warmupBlock && (
                <BlockSection
                  block={{ name: 'Calentamiento', routine_exercises: [] }}
                  routineDayId={id}
                  isEditing
                  onAddExercise={() => onAddWarmup(id, existingSupersets)}
                />
              )}
              {mainBlock && (
                <BlockSection
                  block={mainBlock}
                  routineDayId={id}
                  isEditing
                  isReordering={reorderExercises.isPending}
                  onAddExercise={() => onAddExercise(id, existingSupersets)}
                  onEditExercise={(re) => onEditExercise(re, id, existingSupersets)}
                  onReplaceExercise={(re) => onReplaceExercise(re, id)}
                  onReorderExercise={handleReorderMain}
                  onDeleteExercise={(re) => setExerciseToDelete(re)}
                  onDuplicateExercise={(re) => onDuplicateExercise(re, id)}
                  onMoveExerciseToDay={(re) => onMoveExerciseToDay(re, id)}
                />
              )}
              {!mainBlock && (
                <BlockSection
                  block={{ name: 'Principal', routine_exercises: [] }}
                  routineDayId={id}
                  isEditing
                  onAddExercise={() => onAddExercise(id, existingSupersets)}
                />
              )}
            </>
          ) : (
            <>
              {blocks?.length === 0 ? (
                <p className="text-secondary text-sm">{t('routine:block.noExercises')}</p>
              ) : (
                blocks?.filter(block => block.routine_exercises?.length > 0).map(block => (
                  <BlockSection key={block.name} block={block} routineDayId={id} />
                ))
              )}
            </>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!exerciseToDelete}
        title={t('exercise:delete')}
        message={t('routine:exercise.removeFromRoutine', { name: exerciseToDelete?.exercise?.name })}
        confirmText={t('common:buttons.delete')}
        onConfirm={handleDeleteExercise}
        onCancel={() => setExerciseToDelete(null)}
      />
    </Card>
  )
}

export default DayCard
