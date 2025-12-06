import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { useExercises, useDeleteExercise } from '../hooks/useExercises.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal } from '../components/ui/index.js'

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
      <header className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm mb-4 hover:opacity-80"
          style={{ color: '#58a6ff' }}
        >
          <ChevronLeft size={16} />
          Volver
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ejercicios</h1>
          <button
            onClick={() => navigate('/exercises/new')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#238636', color: '#ffffff' }}
          >
            <Plus size={16} />
            Nuevo
          </button>
        </div>
      </header>

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
            <Card key={exercise.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium" style={{ color: '#e6edf3' }}>
                    {exercise.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/exercises/${exercise.id}/edit`)}
                    className="p-2 rounded hover:opacity-80"
                    style={{ backgroundColor: '#21262d' }}
                    title="Editar"
                  >
                    <Pencil size={16} style={{ color: '#8b949e' }} />
                  </button>
                  <button
                    onClick={() => setExerciseToDelete(exercise)}
                    className="p-2 rounded hover:opacity-80"
                    style={{ backgroundColor: '#21262d' }}
                    title="Eliminar"
                  >
                    <Trash2 size={16} style={{ color: '#f85149' }} />
                  </button>
                </div>
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
    </div>
  )
}

export default Exercises
