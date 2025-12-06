import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useRoutine, useRoutineDays, useCreateRoutineDay, useDeleteRoutine, useAddExerciseToDay, useDeleteRoutineDay, useReorderRoutineDays, useUpdateRoutineExercise } from '../hooks/useRoutines.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal } from '../components/ui/index.js'
import { DayCard, AddDayModal, AddExerciseModal, EditRoutineExerciseModal, RoutineHeader } from '../components/Routine/index.js'

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

  const maxDayNumber = days?.reduce((max, day) => Math.max(max, day.dia_numero), 0) || 0
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

  const handleOpenAddExercise = (dayId) => {
    setSelectedDayId(dayId)
    setIsAddingWarmup(false)
    setShowAddExercise(true)
  }

  const handleOpenAddWarmup = (dayId) => {
    setSelectedDayId(dayId)
    setIsAddingWarmup(true)
    setShowAddExercise(true)
  }

  const handleAddExercise = async ({ exerciseId, series, reps, notas, tempo, tempo_razon }) => {
    try {
      await addExercise.mutateAsync({
        dayId: selectedDayId,
        exerciseId,
        series,
        reps,
        notas,
        tempo,
        tempo_razon,
        esCalentamiento: isAddingWarmup,
      })
      setShowAddExercise(false)
      setSelectedDayId(null)
      setIsAddingWarmup(false)
    } catch (err) {
      console.error('Error adding exercise:', err)
    }
  }

  const handleOpenEditExercise = (routineExercise, dayId) => {
    setSelectedExercise(routineExercise)
    setSelectedDayId(dayId)
    setShowEditExercise(true)
  }

  const handleEditExercise = async ({ exerciseId, series, reps, notas, tempo, tempo_razon }) => {
    try {
      await updateExercise.mutateAsync({
        exerciseId,
        dayId: selectedDayId,
        data: { series, reps, notas, tempo, tempo_razon }
      })
      setShowEditExercise(false)
      setSelectedExercise(null)
      setSelectedDayId(null)
    } catch (err) {
      console.error('Error updating exercise:', err)
    }
  }

  const handleDeleteDay = async (dayId) => {
    try {
      await deleteDay.mutateAsync({ dayId, routineId })
    } catch (err) {
      console.error('Error deleting day:', err)
    }
  }

  const handleMoveDay = async (dayId, direction) => {
    if (!days) return

    const currentIndex = days.findIndex(d => d.id === dayId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= days.length) return

    const newDays = [...days]
    const [removed] = newDays.splice(currentIndex, 1)
    newDays.splice(newIndex, 0, removed)

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
                onDelete={handleDeleteDay}
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
        message={`¿Seguro que quieres eliminar "${routine.nombre}"? Se eliminarán todos los días y ejercicios asociados.`}
        confirmText="Eliminar"
        onConfirm={handleDeleteRoutine}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <AddExerciseModal
        isOpen={showAddExercise}
        onClose={() => {
          setShowAddExercise(false)
          setSelectedDayId(null)
          setIsAddingWarmup(false)
        }}
        onSubmit={handleAddExercise}
        isPending={addExercise.isPending}
        isWarmup={isAddingWarmup}
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
      />
    </div>
  )
}

export default RoutineDetail
