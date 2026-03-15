import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, TrendingUp, BarChart3 } from 'lucide-react'
import { useExercisesWithMuscleGroup, useDeleteExercise, useMuscleGroups, useExerciseStats } from '../hooks/useExercises.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, PageHeader, BottomActions, DropdownMenu } from '../components/ui/index.js'
import { ExerciseSearchBar, ExerciseUsageModal } from '../components/Exercise/index.js'
import { normalizeSearchText } from '../lib/textUtils.js'
import { getMuscleGroupBorderStyle } from '../lib/constants.js'
import { colors } from '../lib/styles.js'

function Exercises() {
  const navigate = useNavigate()
  const { data: exercises, isLoading, error } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const { data: exerciseStats } = useExerciseStats()
  const deleteExercise = useDeleteExercise()

  const [search, setSearch] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)
  const [exerciseToDelete, setExerciseToDelete] = useState(null)
  const [exerciseForUsage, setExerciseForUsage] = useState(null)

  const filteredExercises = useMemo(() => {
    if (!exercises) return []

    return exercises.filter(e => {
      const matchesSearch = !search.trim() || normalizeSearchText(e.name).includes(normalizeSearchText(search))
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

  const handleCreate = () => {
    const state = search.trim() ? { name: search.trim() } : undefined
    navigate('/exercises/new', { state })
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <PageHeader title="Ejercicios" backTo="/" />

      <ExerciseSearchBar
        search={search}
        onSearchChange={setSearch}
        muscleGroups={muscleGroups}
        selectedMuscleGroup={selectedMuscleGroup}
        onMuscleGroupChange={setSelectedMuscleGroup}
      />

      {/* Exercise list */}
      <main className="space-y-2">
        {filteredExercises.length === 0 ? (
          <p className="text-center py-8 text-secondary">
            {search ? 'No se encontraron ejercicios' : 'No hay ejercicios'}
          </p>
        ) : (
          filteredExercises.map(exercise => (
            <Card key={exercise.id} className="p-3" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate" style={{ color: colors.textPrimary }}>
                    {exercise.name}
                  </h3>
                  <p className="text-xs text-secondary">
                    {[
                      exerciseStats?.routineCounts?.[exercise.id]
                        ? `En ${exerciseStats.routineCounts[exercise.id]} ${exerciseStats.routineCounts[exercise.id] === 1 ? 'rutina' : 'rutinas'}`
                        : null,
                      exerciseStats?.sessionCounts?.[exercise.id]
                        ? `Usado ${exerciseStats.sessionCounts[exercise.id]} ${exerciseStats.sessionCounts[exercise.id] === 1 ? 'vez' : 'veces'}`
                        : 'Sin uso',
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <DropdownMenu
                  items={[
                    { icon: BarChart3, label: 'Ver usos', onClick: () => setExerciseForUsage(exercise) },
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

      <ExerciseUsageModal
        exercise={exerciseForUsage}
        onClose={() => setExerciseForUsage(null)}
      />

      <BottomActions
        primary={{ label: 'Nuevo', onClick: handleCreate }}
        maxWidth="max-w-4xl"
      />
    </div>
  )
}

export default Exercises
