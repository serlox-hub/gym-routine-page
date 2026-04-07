import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, TrendingUp, BarChart3 } from 'lucide-react'
import { useExercisesWithMuscleGroup, useDeleteExercise, useMuscleGroups, useEquipmentTypes, useExerciseStats } from '../hooks/useExercises.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, PageHeader, BottomActions, DropdownMenu } from '../components/ui/index.js'
import { ExerciseSearchBar, ExerciseUsageModal, ExerciseFormModal } from '../components/Exercise/index.js'
import { normalizeSearchText, getNotifier, getMuscleGroupColor, getMuscleGroupName, getEquipmentName, getExerciseName } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../lib/muscleGroupStyles.js'
import { colors } from '../lib/styles.js'

function Exercises() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: exercises, isLoading, error } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const { data: equipmentTypes } = useEquipmentTypes()
  const { data: exerciseStats } = useExerciseStats()
  const deleteExercise = useDeleteExercise()

  const [search, setSearch] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)
  const [selectedEquipmentType, setSelectedEquipmentType] = useState(null)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [showUsage, setShowUsage] = useState(false)
  const [exerciseToDelete, setExerciseToDelete] = useState(null)
  const [exerciseForUsage, setExerciseForUsage] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editExerciseId, setEditExerciseId] = useState(null)

  const filteredExercises = useMemo(() => {
    if (!exercises) return []

    return exercises.filter(e => {
      const matchesSearch = !search.trim() || normalizeSearchText(getExerciseName(e)).includes(normalizeSearchText(search))
      const matchesMuscleGroup = !selectedMuscleGroup || e.muscle_group_id === selectedMuscleGroup
      const matchesEquipment = !selectedEquipmentType || e.equipment_type?.id === selectedEquipmentType
      const matchesSource = sourceFilter === 'all' || (sourceFilter === 'custom' ? !e.is_system : e.is_system)
      return matchesSearch && matchesMuscleGroup && matchesEquipment && matchesSource
    })
  }, [exercises, search, selectedMuscleGroup, selectedEquipmentType, sourceFilter])

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
        equipmentTypes={equipmentTypes}
        selectedEquipmentType={selectedEquipmentType}
        onEquipmentTypeChange={setSelectedEquipmentType}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        showUsage={showUsage}
        onToggleUsage={setShowUsage}
      />

      {/* Exercise list */}
      <main className="space-y-2">
        {filteredExercises.length === 0 ? (
          <p className="text-center py-8 text-secondary">
            {search ? t('exercise:noExercisesSearch') : t('exercise:noExercises')}
          </p>
        ) : (
          filteredExercises.map(exercise => (
            <Card key={exercise.id} className="p-3" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate" style={{ color: colors.textPrimary }}>
                    {getExerciseName(exercise)}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getMuscleGroupColor(exercise.muscle_group?.name) }} />
                      {getMuscleGroupName(exercise.muscle_group)}
                    </span>
                    {exercise.equipment_type && (
                      <span
                        className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
                      >
                        {getEquipmentName(exercise.equipment_type)}
                      </span>
                    )}
                    {!exercise.is_system && (
                      <span
                        className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: colors.accentBgSubtle, color: colors.accent }}
                      >
                        {t('exercise:custom')}
                      </span>
                    )}
                  </div>
                  {showUsage && (
                    <p className="text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                      {[
                        exerciseStats?.routineCounts?.[exercise.id]
                          ? t('exercise:usage.inRoutines', { count: exerciseStats.routineCounts[exercise.id] })
                          : null,
                        exerciseStats?.sessionCounts?.[exercise.id]
                          ? t('exercise:usage.inSessions', { count: exerciseStats.sessionCounts[exercise.id] })
                          : null,
                      ].filter(Boolean).join(' · ') || t('exercise:usage.noUsage')}
                    </p>
                  )}
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
        primary={{ label: t('common:buttons.create'), onClick: handleCreate }}
        maxWidth="max-w-4xl"
      />
    </div>
  )
}

export default Exercises
