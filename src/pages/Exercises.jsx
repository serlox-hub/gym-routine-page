import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { useExercises, useDeleteExercise } from '../hooks/useExercises.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, PageHeader, BottomActions, DropdownMenu } from '../components/ui/index.js'

function Exercises() {
  const navigate = useNavigate()
  const { data: exercises, isLoading, error } = useExercises()
  const deleteExercise = useDeleteExercise()

  const [search, setSearch] = useState('')
  const [exerciseToDelete, setExerciseToDelete] = useState(null)

  const filteredExercises = useMemo(() => {
    if (!exercises) return []
    if (!search.trim()) return exercises

    const searchLower = search.toLowerCase()
    return exercises.filter(e =>
      e.name.toLowerCase().includes(searchLower)
    )
  }, [exercises, search])

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
      <div className="relative mb-4">
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
