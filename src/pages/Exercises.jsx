import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { useExercisesWithMuscleGroup, useDeleteExercise, useMuscleGroups } from '../hooks/useExercises.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, PageHeader, BottomActions, DropdownMenu } from '../components/ui/index.js'

function Exercises() {
  const navigate = useNavigate()
  const { data: exercises, isLoading, error } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const deleteExercise = useDeleteExercise()

  const [search, setSearch] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)
  const [exerciseToDelete, setExerciseToDelete] = useState(null)

  const filteredExercises = useMemo(() => {
    if (!exercises) return []

    return exercises.filter(e => {
      const matchesSearch = !search.trim() || e.name.toLowerCase().includes(search.toLowerCase())
      const matchesMuscleGroup = !selectedMuscleGroup || e.muscle_group_id === selectedMuscleGroup
      return matchesSearch && matchesMuscleGroup
    })
  }, [exercises, search, selectedMuscleGroup])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleDelete = () => {
    if (!exerciseToDelete) return

    deleteExercise.mutate(exerciseToDelete.id, {
      onSuccess: () => setExerciseToDelete(null),
      onError: (err) => {
        alert(`Error al eliminar: ${err.message}`)
        setExerciseToDelete(null)
      }
    })
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <PageHeader title="Ejercicios" backTo="/" />

      {/* Search */}
      <div className="relative mb-3">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: '#8b949e' }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ejercicio..."
          className="w-full pl-10 pr-4 py-3 rounded-lg"
          style={{
            backgroundColor: '#21262d',
            border: '1px solid #30363d',
            color: '#e6edf3',
          }}
        />
      </div>

      {/* Muscle group filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setSelectedMuscleGroup(null)}
          className="px-3 py-1.5 rounded-full text-sm transition-colors"
          style={{
            backgroundColor: !selectedMuscleGroup ? '#58a6ff' : 'transparent',
            color: !selectedMuscleGroup ? '#ffffff' : '#8b949e',
            border: `1px solid ${!selectedMuscleGroup ? '#58a6ff' : '#30363d'}`,
          }}
        >
          Todos
        </button>
        {muscleGroups?.map(group => (
          <button
            key={group.id}
            onClick={() => setSelectedMuscleGroup(group.id)}
            className="px-3 py-1.5 rounded-full text-sm transition-colors"
            style={{
              backgroundColor: selectedMuscleGroup === group.id ? '#58a6ff' : 'transparent',
              color: selectedMuscleGroup === group.id ? '#ffffff' : '#8b949e',
              border: `1px solid ${selectedMuscleGroup === group.id ? '#58a6ff' : '#30363d'}`,
            }}
          >
            {group.name}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <main className="space-y-2">
        {filteredExercises.length === 0 ? (
          <p className="text-center py-8 text-secondary">
            {search ? 'No se encontraron ejercicios' : 'No hay ejercicios'}
          </p>
        ) : (
          filteredExercises.map(exercise => (
            <Card key={exercise.id} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-sm truncate flex-1 min-w-0" style={{ color: '#e6edf3' }}>
                  {exercise.name}
                </h3>
                <DropdownMenu
                  items={[
                    { icon: TrendingUp, label: 'Progresión', onClick: () => navigate(`/exercises/${exercise.id}/progress`) },
                    { icon: Pencil, label: 'Editar', onClick: () => navigate(`/exercises/${exercise.id}/edit`) },
                    { icon: Trash2, label: 'Eliminar', onClick: () => setExerciseToDelete(exercise), danger: true },
                  ]}
                />
              </div>
            </Card>
          ))
        )}
      </main>

      <ConfirmModal
        isOpen={!!exerciseToDelete}
        title="Eliminar ejercicio"
        message={`¿Seguro que quieres eliminar "${exerciseToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setExerciseToDelete(null)}
      />

      <BottomActions
        primary={{ label: 'Nuevo', onClick: () => navigate('/exercises/new') }}
      />
    </div>
  )
}

export default Exercises
