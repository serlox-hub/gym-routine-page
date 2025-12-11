import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, ChevronUp, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { Card, ConfirmModal, Button, DropdownMenu, LoadingSpinner } from '../ui/index.js'
import { useRoutineBlocks, useReorderRoutineExercises, useDeleteRoutineExercise, useUpdateRoutineDay } from '../../hooks/useRoutines.js'
import { useStartSession } from '../../hooks/useWorkout.js'
import { colors } from '../../lib/styles.js'
import { moveItemById } from '../../lib/arrayUtils.js'
import { getExistingSupersetIds } from '../../lib/supersetUtils.js'
import DayEditForm from './DayEditForm.jsx'
import BlockSection from './BlockSection.jsx'

function DayCard({ day, routineId, routineName, isEditing, onAddExercise, onAddWarmup, onEditExercise, onDelete, onMoveUp, onMoveDown, isFirst, isLast, hasActiveSession, activeRoutineDayId }) {
  const navigate = useNavigate()
  const { id, sort_order, name, estimated_duration_min } = day
  const [isExpanded, setIsExpanded] = useState(false)

  // Cargar bloques si está expandido
  const { data: blocks, isLoading: loadingBlocks } = useRoutineBlocks(isExpanded ? id : null)
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

  const handleMoveExercise = (exerciseId, direction) => {
    const newExercises = moveItemById(allExercises, exerciseId, direction)
    if (newExercises) {
      reorderExercises.mutate({ dayId: id, exercises: newExercises })
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
    <Card className={`p-4 ${editingDay ? 'cursor-default' : 'cursor-pointer'}`} onClick={handleClick}>
      {editingDay ? (
        <DayEditForm
          dayNumber={sort_order}
          form={dayForm}
          setForm={setDayForm}
          onSave={handleSaveDay}
        />
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <ChevronRight
              size={18}
              className="shrink-0 transition-transform"
              style={{
                color: colors.textSecondary,
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
              }}
            />
            <h3 className="font-medium truncate">{name}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {estimated_duration_min && (
              <span className="text-sm text-muted whitespace-nowrap">{estimated_duration_min} min</span>
            )}
            {isEditing && (
              <DropdownMenu
                items={[
                  {
                    icon: Pencil,
                    label: 'Editar',
                    onClick: () => {
                      setDayForm({ name, duration: estimated_duration_min || '' })
                      setEditingDay(true)
                    }
                  },
                  { icon: ChevronUp, label: 'Mover arriba', onClick: () => onMoveUp(id), disabled: isFirst },
                  { icon: ChevronDown, label: 'Mover abajo', onClick: () => onMoveDown(id), disabled: isLast },
                  { icon: Trash2, label: 'Eliminar', onClick: () => onDelete(id), danger: true },
                ]}
              />
            )}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="mt-3 pt-3 border-t space-y-4" style={{ borderColor: colors.border }}>
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
                  onMoveExercise={handleMoveExercise}
                  onDeleteExercise={(re) => setExerciseToDelete(re)}
                  canMoveUp={false}
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
                  onMoveExercise={handleMoveExercise}
                  onDeleteExercise={(re) => setExerciseToDelete(re)}
                  canMoveUp={warmupExercises.length > 0}
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
                <p className="text-secondary text-sm">No hay ejercicios configurados</p>
              ) : (
                blocks?.filter(block => block.routine_exercises?.length > 0).map(block => (
                  <BlockSection key={block.id} block={block} routineDayId={id} />
                ))
              )}

              <div className="pt-2">
                {isThisDayActive ? (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleContinueWorkout}
                  >
                    Continuar Entrenamiento
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleStartWorkout}
                    disabled={startSessionMutation.isPending || (hasActiveSession && !isThisDayActive)}
                  >
                    {startSessionMutation.isPending ? 'Iniciando...' : 'Iniciar Entrenamiento'}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!exerciseToDelete}
        title="Eliminar ejercicio"
        message={`¿Seguro que quieres eliminar "${exerciseToDelete?.exercise?.name}" de este día?`}
        confirmText="Eliminar"
        onConfirm={handleDeleteExercise}
        onCancel={() => setExerciseToDelete(null)}
      />
    </Card>
  )
}

export default DayCard
