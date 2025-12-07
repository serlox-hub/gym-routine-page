import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useRoutine, useRoutineDays, useCreateRoutineDay, useDeleteRoutine, useAddExerciseToDay, useDeleteRoutineDay, useReorderRoutineDays, useUpdateRoutineExercise } from '../hooks/useRoutines.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal } from '../components/ui/index.js'
import { DayCard, AddDayModal, AddExerciseModal, EditRoutineExerciseModal, RoutineHeader } from '../components/Routine/index.js'
import { moveItemById } from '../lib/arrayUtils.js'

function RoutineDetail() {
  const { routineId } = useParams()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [showAddDay, setShowAddDay] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState(null)
  const [isAddingWarmup, setIsAddingWarmup] = useState(false)
  const [showEditExercise, setShowEditExercise] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [dayToDelete, setDayToDelete] = useState(null)
  const [existingSupersets, setExistingSupersets] = useState([])

  const { data: routine, isLoading: loadingRoutine, error: routineError } = useRoutine(routineId)
  const { data: days, isLoading: loadingDays, error: daysError } = useRoutineDays(routineId)
  const createDay = useCreateRoutineDay()
  const deleteRoutine = useDeleteRoutine()
  const addExercise = useAddExerciseToDay()
  const updateExercise = useUpdateRoutineExercise()
  const deleteDay = useDeleteRoutineDay()
  const reorderDays = useReorderRoutineDays()

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
    } catch (err) {
      console.error('Error creating day:', err)
    }
  }

  const handleDeleteRoutine = async () => {
    try {
      await deleteRoutine.mutateAsync(parseInt(routineId))
      navigate('/')
    } catch (err) {
      console.error('Error deleting routine:', err)
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
    } catch (err) {
      console.error('Error adding exercise:', err)
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
    } catch (err) {
      console.error('Error updating exercise:', err)
    }
  }

  const handleDeleteDay = async () => {
    if (!dayToDelete) return
    try {
      await deleteDay.mutateAsync({ dayId: dayToDelete.id, routineId })
      setDayToDelete(null)
    } catch (err) {
      console.error('Error deleting day:', err)
    }
  }

  const handleMoveDay = async (dayId, direction) => {
    if (!days) return

    const newDays = moveItemById(days, dayId, direction)
    if (!newDays) return

    try {
      await reorderDays.mutateAsync({ routineId, days: newDays })
    } catch (err) {
      console.error('Error reordering days:', err)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <RoutineHeader
        routine={routine}
        routineId={routineId}
        isEditing={isEditing}
        onEditStart={() => setIsEditing(true)}
      />

      <main className="space-y-3">
        <h2 className="text-lg font-semibold">Días de entrenamiento</h2>
        <div className="space-y-2">
          {days?.length === 0 && !isEditing ? (
            <p className="text-secondary">No hay días configurados</p>
          ) : (
            days?.map((day, index) => (
              <DayCard
                key={day.id}
                day={day}
                routineId={routineId}
                isEditing={isEditing}
                onAddExercise={handleOpenAddExercise}
                onAddWarmup={handleOpenAddWarmup}
                onEditExercise={handleOpenEditExercise}
                onDelete={(dayId) => setDayToDelete(days.find(d => d.id === dayId))}
                onMoveUp={(id) => handleMoveDay(id, 'up')}
                onMoveDown={(id) => handleMoveDay(id, 'down')}
                isFirst={index === 0}
                isLast={index === days.length - 1}
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
        </div>

        {isEditing && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full mt-6 py-3 rounded-lg font-medium transition-opacity hover:opacity-80 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'rgba(248, 81, 73, 0.1)', color: '#f85149' }}
          >
            <Trash2 size={18} />
            Eliminar rutina
          </button>
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
    </div>
  )
}

export default RoutineDetail
