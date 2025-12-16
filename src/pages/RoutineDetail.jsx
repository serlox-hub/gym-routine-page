import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useRoutine, useRoutineDays, useRoutineAllExercises, useCreateRoutineDay, useDeleteRoutine, useAddExerciseToDay, useDeleteRoutineDay, useReorderRoutineDays, useUpdateRoutineExercise, useDuplicateRoutineExercise, useMoveRoutineExerciseToDay } from '../hooks/useRoutines.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal } from '../components/ui/index.js'
import { DayCard, AddDayModal, AddExerciseModal, EditRoutineExerciseModal, RoutineHeader, MoveToDayModal } from '../components/Routine/index.js'
import { moveItemById } from '../lib/arrayUtils.js'
import useWorkoutStore from '../stores/workoutStore.js'

function RoutineDetail() {
  const { routineId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const isEditing = location.pathname.endsWith('/edit')
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const [showAddDay, setShowAddDay] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState(null)
  const [isAddingWarmup, setIsAddingWarmup] = useState(false)
  const [showEditExercise, setShowEditExercise] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [dayToDelete, setDayToDelete] = useState(null)
  const [existingSupersets, setExistingSupersets] = useState([])
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [exerciseToMove, setExerciseToMove] = useState(null)
  const [movingFromDayId, setMovingFromDayId] = useState(null)

  const { data: routine, isLoading: loadingRoutine, error: routineError } = useRoutine(routineId)
  const { data: days, isLoading: loadingDays, error: daysError } = useRoutineDays(routineId)
  const { data: allRoutineExercises } = useRoutineAllExercises(routineId)
  const createDay = useCreateRoutineDay()
  const deleteRoutine = useDeleteRoutine()
  const addExercise = useAddExerciseToDay()
  const updateExercise = useUpdateRoutineExercise()
  const deleteDay = useDeleteRoutineDay()
  const reorderDays = useReorderRoutineDays()
  const duplicateExercise = useDuplicateRoutineExercise()
  const moveExercise = useMoveRoutineExerciseToDay()

  const isLoading = loadingRoutine || loadingDays
  const error = routineError || daysError

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const maxDayNumber = days?.reduce((max, day) => Math.max(max, day.sort_order), 0) || 0
  const nextDayNumber = maxDayNumber + 1

  const handleAddDay = async (day) => {
    try {
      await createDay.mutateAsync({ routineId: parseInt(routineId), day })
      setShowAddDay(false)
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleDeleteRoutine = async () => {
    try {
      await deleteRoutine.mutateAsync(parseInt(routineId))
      navigate('/')
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleOpenAddExercise = (dayId, supersets = []) => {
    setSelectedDayId(dayId)
    setIsAddingWarmup(false)
    setExistingSupersets(supersets)
    setShowAddExercise(true)
  }

  const handleOpenAddWarmup = (dayId, supersets = []) => {
    setSelectedDayId(dayId)
    setIsAddingWarmup(true)
    setExistingSupersets(supersets)
    setShowAddExercise(true)
  }

  const handleAddExercise = async ({ exerciseId, series, reps, rir, rest_seconds, notes, tempo, tempo_razon, superset_group }) => {
    try {
      await addExercise.mutateAsync({
        dayId: selectedDayId,
        exerciseId,
        series,
        reps,
        rir,
        rest_seconds,
        notes,
        tempo,
        tempo_razon,
        esCalentamiento: isAddingWarmup,
        superset_group,
      })
      setShowAddExercise(false)
      setSelectedDayId(null)
      setIsAddingWarmup(false)
      setExistingSupersets([])
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleOpenEditExercise = (routineExercise, dayId, supersets = []) => {
    setSelectedExercise(routineExercise)
    setSelectedDayId(dayId)
    setExistingSupersets(supersets)
    setShowEditExercise(true)
  }

  const handleEditExercise = async ({ exerciseId, series, reps, rir, rest_seconds, notes, tempo, tempo_razon, superset_group }) => {
    try {
      await updateExercise.mutateAsync({
        exerciseId,
        dayId: selectedDayId,
        data: { series, reps, rir, rest_seconds, notes, tempo, tempo_razon, superset_group }
      })
      setShowEditExercise(false)
      setSelectedExercise(null)
      setSelectedDayId(null)
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleDeleteDay = async () => {
    if (!dayToDelete) return
    try {
      await deleteDay.mutateAsync({ dayId: dayToDelete.id, routineId })
      setDayToDelete(null)
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleMoveDay = async (dayId, direction) => {
    if (!days) return

    const newDays = moveItemById(days, dayId, direction)
    if (!newDays) return

    try {
      await reorderDays.mutateAsync({ routineId, days: newDays })
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleDuplicateExercise = async (routineExercise, dayId) => {
    try {
      await duplicateExercise.mutateAsync({ routineExercise, dayId })
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleOpenMoveModal = (routineExercise, dayId) => {
    setExerciseToMove(routineExercise)
    setMovingFromDayId(dayId)
    setShowMoveModal(true)
  }

  const handleMoveExerciseToDay = async (targetDayId) => {
    if (!exerciseToMove || !movingFromDayId) return
    try {
      await moveExercise.mutateAsync({
        routineExercise: exerciseToMove,
        sourceDayId: movingFromDayId,
        targetDayId,
      })
      setShowMoveModal(false)
      setExerciseToMove(null)
      setMovingFromDayId(null)
    } catch {
      // Error handled by TanStack Query
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <RoutineHeader
        routine={routine}
        routineId={routineId}
        isEditing={isEditing}
        onEditStart={() => navigate(`/routine/${routineId}/edit`)}
        onEditEnd={() => navigate(`/routine/${routineId}`)}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      <main className="space-y-2">
          {days?.length === 0 && !isEditing ? (
            <p className="text-secondary">No hay días configurados</p>
          ) : (
            days?.map((day, index) => (
              <DayCard
                key={day.id}
                day={day}
                routineId={routineId}
                routineName={routine?.name}
                isEditing={isEditing}
                onAddExercise={handleOpenAddExercise}
                onAddWarmup={handleOpenAddWarmup}
                onEditExercise={handleOpenEditExercise}
                onDuplicateExercise={handleDuplicateExercise}
                onMoveExerciseToDay={handleOpenMoveModal}
                onDelete={(dayId) => setDayToDelete(days.find(d => d.id === dayId))}
                onMoveUp={(id) => handleMoveDay(id, 'up')}
                onMoveDown={(id) => handleMoveDay(id, 'down')}
                isFirst={index === 0}
                isLast={index === days.length - 1}
                hasActiveSession={hasActiveSession}
                activeRoutineDayId={activeRoutineDayId}
              />
            ))
          )}
          {isEditing && (
            <Card
              className="p-4 border-dashed"
              onClick={() => setShowAddDay(true)}
            >
              <div className="flex items-center gap-2 justify-center" style={{ color: '#8b949e' }}>
                <Plus size={20} />
                <span>Añadir día {nextDayNumber}</span>
              </div>
            </Card>
          )}
      </main>

      <AddDayModal
        isOpen={showAddDay}
        onClose={() => setShowAddDay(false)}
        onSubmit={handleAddDay}
        nextDayNumber={nextDayNumber}
        isPending={createDay.isPending}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Eliminar rutina"
        message={`¿Seguro que quieres eliminar "${routine.name}"? Se eliminarán todos los días y ejercicios asociados.`}
        confirmText="Eliminar"
        onConfirm={handleDeleteRoutine}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        isOpen={!!dayToDelete}
        title="Eliminar día"
        message={`¿Seguro que quieres eliminar "${dayToDelete?.name}"? Se eliminarán todos los ejercicios del día.`}
        confirmText="Eliminar"
        onConfirm={handleDeleteDay}
        onCancel={() => setDayToDelete(null)}
      />

      <AddExerciseModal
        isOpen={showAddExercise}
        onClose={() => {
          setShowAddExercise(false)
          setSelectedDayId(null)
          setIsAddingWarmup(false)
          setExistingSupersets([])
        }}
        onSubmit={handleAddExercise}
        isPending={addExercise.isPending}
        isWarmup={isAddingWarmup}
        existingSupersets={existingSupersets}
        existingExercises={allRoutineExercises || []}
      />

      <EditRoutineExerciseModal
        isOpen={showEditExercise}
        onClose={() => {
          setShowEditExercise(false)
          setSelectedExercise(null)
          setSelectedDayId(null)
        }}
        onSubmit={handleEditExercise}
        isPending={updateExercise.isPending}
        routineExercise={selectedExercise}
        existingSupersets={existingSupersets}
      />

      <MoveToDayModal
        isOpen={showMoveModal}
        onClose={() => {
          setShowMoveModal(false)
          setExerciseToMove(null)
          setMovingFromDayId(null)
        }}
        onSubmit={handleMoveExerciseToDay}
        days={days}
        currentDayId={movingFromDayId}
        exerciseName={exerciseToMove?.exercise?.name}
        isPending={moveExercise.isPending}
      />
    </div>
  )
}

export default RoutineDetail
