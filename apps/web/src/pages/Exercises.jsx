import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, TrendingUp, BarChart3 } from 'lucide-react'
import { useExercisesWithMuscleGroup, useDeleteExercise, useMuscleGroups, useExerciseStats } from '../hooks/useExercises.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, PageHeader, BottomActions, DropdownMenu } from '../components/ui/index.js'
import { ExerciseSearchBar, ExerciseUsageModal, ExerciseFormModal } from '../components/Exercise/index.js'
import { normalizeSearchText, getNotifier } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../lib/muscleGroupStyles.js'
import { colors } from '../lib/styles.js'

function Exercises() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: exercises, isLoading, error } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const { data: exerciseStats } = useExerciseStats()
  const deleteExercise = useDeleteExercise()

  const [search, setSearch] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)
  const [exerciseToDelete, setExerciseToDelete] = useState(null)
  const [exerciseForUsage, setExerciseForUsage] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editExerciseId, setEditExerciseId] = useState(null)

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
        getNotifier()?.show(`Error al eliminar: ${err.message}`, 'error')
        setExerciseToDelete(null)
      }
    })
  }

  const handleCreate = () => setShowCreateModal(true)

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <PageHeader title={t('exercise:title')} backTo="/" />

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
            {search ? t('common:errors.notFound') : t('exercise:noExercises')}
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
                        ? t('exercise:usage.inRoutines', { count: exerciseStats.routineCounts[exercise.id] })
                        : null,
                      exerciseStats?.sessionCounts?.[exercise.id]
                        ? t('exercise:usage.inSessions', { count: exerciseStats.sessionCounts[exercise.id] })
                        : t('exercise:usage.noUsage'),
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <DropdownMenu
                  items={[
                    { icon: BarChart3, label: t('exercise:usage.title'), onClick: () => setExerciseForUsage(exercise) },
                    { icon: TrendingUp, label: t('exercise:progression'), onClick: () => navigate(`/exercises/${exercise.id}/progress`) },
                    !exercise.is_system && { icon: Pencil, label: t('common:buttons.edit'), onClick: () => setEditExerciseId(exercise.id) },
                    !exercise.is_system && { icon: Trash2, label: t('common:buttons.delete'), onClick: () => setExerciseToDelete(exercise), danger: true },
                  ].filter(Boolean)}
                />
              </div>
            </Card>
          ))
        )}
      </main>

      <ConfirmModal
        isOpen={!!exerciseToDelete}
        title={t('exercise:delete')}
        message={t('exercise:deleteConfirm', { name: exerciseToDelete?.name })}
        confirmText={t('common:buttons.delete')}
        cancelText={t('common:buttons.cancel')}
        onConfirm={handleDelete}
        onCancel={() => setExerciseToDelete(null)}
      />

      <ExerciseUsageModal
        exercise={exerciseForUsage}
        onClose={() => setExerciseForUsage(null)}
      />

      <ExerciseFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialName={search.trim()}
      />

      <ExerciseFormModal
        isOpen={!!editExerciseId}
        onClose={() => setEditExerciseId(null)}
        exerciseId={editExerciseId}
      />

      <BottomActions
        primary={{ label: t('common:labels.new'), onClick: handleCreate }}
        maxWidth="max-w-4xl"
      />
    </div>
  )
}

export default Exercises
