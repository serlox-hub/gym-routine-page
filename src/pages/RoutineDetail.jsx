import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useRoutine, useRoutineDays, useCreateRoutineDay, useUpdateRoutine, useDeleteRoutine, useAddExerciseToDay, useDeleteRoutineDay, useReorderRoutineDays } from '../hooks/useRoutines.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal } from '../components/ui/index.js'
import { DayCard, AddDayModal, AddExerciseModal } from '../components/Routine/index.js'
import { colors, inputStyle } from '../lib/styles.js'

const DEBOUNCE_MS = 500

function RoutineDetail() {
  const { routineId } = useParams()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ nombre: '', descripcion: '', objetivo: '' })
  const [showAddDay, setShowAddDay] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState(null)
  const [isAddingWarmup, setIsAddingWarmup] = useState(false)
  const debounceRef = useRef(null)

  const { data: routine, isLoading: loadingRoutine, error: routineError } = useRoutine(routineId)
  const { data: days, isLoading: loadingDays, error: daysError } = useRoutineDays(routineId)
  const createDay = useCreateRoutineDay()
  const updateRoutine = useUpdateRoutine()
  const deleteRoutine = useDeleteRoutine()
  const addExercise = useAddExerciseToDay()
  const deleteDay = useDeleteRoutineDay()
  const reorderDays = useReorderRoutineDays()

  useEffect(() => {
    if (routine && !isEditing) {
      setEditForm({
        nombre: routine.nombre || '',
        descripcion: routine.descripcion || '',
        objetivo: routine.objetivo || '',
      })
    }
  }, [routine, isEditing])

  const saveChanges = useCallback((formData) => {
    if (!formData.nombre.trim()) return

    updateRoutine.mutate({
      routineId: parseInt(routineId),
      data: {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        objetivo: formData.objetivo.trim() || null,
      }
    })
  }, [routineId, updateRoutine])

  const handleFieldChange = (field, value) => {
    const newForm = { ...editForm, [field]: value }
    setEditForm(newForm)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      saveChanges(newForm)
    }, DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

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

  const handleAddExercise = async ({ exerciseId, series, reps }) => {
    try {
      await addExercise.mutateAsync({
        dayId: selectedDayId,
        exerciseId,
        series,
        reps,
        esCalentamiento: isAddingWarmup,
      })
      setShowAddExercise(false)
      setSelectedDayId(null)
      setIsAddingWarmup(false)
    } catch (err) {
      console.error('Error adding exercise:', err)
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
      <header className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-secondary hover:text-accent mb-2 transition-colors"
        >
          ← Volver
        </button>
        <div className="flex items-center justify-between gap-3">
          {isEditing ? (
            <input
              type="text"
              value={editForm.nombre}
              onChange={(e) => handleFieldChange('nombre', e.target.value)}
              className="flex-1 text-2xl font-bold p-2 rounded-lg"
              style={inputStyle}
              placeholder="Nombre de la rutina"
              autoFocus
            />
          ) : (
            <h1 className="text-2xl font-bold">{routine.nombre}</h1>
          )}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-lg transition-opacity hover:opacity-80 shrink-0"
              style={{ backgroundColor: '#21262d', color: '#8b949e' }}
              title="Editar rutina"
            >
              <Pencil size={18} />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
                Descripción
              </label>
              <textarea
                value={editForm.descripcion}
                onChange={(e) => handleFieldChange('descripcion', e.target.value)}
                className="w-full p-2 rounded-lg text-sm resize-none"
                style={inputStyle}
                placeholder="Descripción de la rutina..."
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
                Objetivo
              </label>
              <input
                type="text"
                value={editForm.objetivo}
                onChange={(e) => handleFieldChange('objetivo', e.target.value)}
                className="w-full p-2 rounded-lg text-sm"
                style={inputStyle}
                placeholder="Ej: Hipertrofia, Fuerza..."
              />
            </div>
          </div>
        ) : (
          <>
            {routine.descripcion && (
              <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                {routine.descripcion}
              </p>
            )}
            {routine.objetivo && (
              <p className="text-sm mt-1">
                <span style={{ color: colors.success }}>Objetivo:</span>{' '}
                <span style={{ color: colors.textSecondary }}>{routine.objetivo}</span>
              </p>
            )}
          </>
        )}
      </header>

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
    </div>
  )
}

export default RoutineDetail
