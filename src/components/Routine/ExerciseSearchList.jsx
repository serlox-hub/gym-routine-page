import { useState, useMemo } from 'react'
import { Check } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { normalizeSearchText } from '../../lib/textUtils.js'
import ExerciseSearchBar from '../Exercise/ExerciseSearchBar.jsx'

/**
 * Lista de ejercicios con búsqueda y filtro por grupo muscular
 */
function ExerciseSearchList({ exercises, muscleGroups, isLoading, onSelect, existingExerciseIds = new Set(), search = '', onSearchChange }) {
  const [internalSearch, setInternalSearch] = useState(search)
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)

  const currentSearch = onSearchChange ? search : internalSearch
  const handleSearchChange = onSearchChange || setInternalSearch

  const filteredExercises = useMemo(() => {
    if (!exercises) return []

    return exercises.filter(ex => {
      const matchesSearch = normalizeSearchText(ex.name).includes(normalizeSearchText(currentSearch))
      if (!selectedMuscleGroup) return matchesSearch
      return matchesSearch && ex.muscle_group_id === selectedMuscleGroup
    })
  }, [exercises, currentSearch, selectedMuscleGroup])

  return (
    <>
      <ExerciseSearchBar
        search={currentSearch}
        onSearchChange={handleSearchChange}
        muscleGroups={muscleGroups}
        selectedMuscleGroup={selectedMuscleGroup}
        onMuscleGroupChange={setSelectedMuscleGroup}
        autoFocus
      />

      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {isLoading ? (
          <p className="text-center py-4" style={{ color: colors.textSecondary }}>
            Cargando...
          </p>
        ) : filteredExercises.length === 0 ? (
          <p className="text-center py-4" style={{ color: colors.textSecondary }}>
            No se encontraron ejercicios
          </p>
        ) : (
          filteredExercises.map(exercise => {
            const isInRoutine = existingExerciseIds.has(exercise.id)
            return (
              <button
                key={exercise.id}
                onClick={() => onSelect(exercise)}
                className="w-full text-left p-3 rounded-lg transition-colors hover:bg-surface-alt flex items-center justify-between gap-2"
                style={{ color: colors.textPrimary }}
              >
                <div className="font-medium">{exercise.name}</div>
                {isInRoutine && (
                  <span
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: 'rgba(63, 185, 80, 0.15)', color: colors.success }}
                  >
                    <Check size={12} />
                    En rutina
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </>
  )
}

export default ExerciseSearchList
