import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { colors, inputStyle } from '../../lib/styles.js'

/**
 * Lista de ejercicios con búsqueda y filtro por grupo muscular
 */
function ExerciseSearchList({ exercises, muscleGroups, isLoading, onSelect }) {
  const [search, setSearch] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)

  const filteredExercises = useMemo(() => {
    if (!exercises) return []

    return exercises.filter(ex => {
      const matchesSearch = ex.nombre.toLowerCase().includes(search.toLowerCase())
      if (!selectedMuscleGroup) return matchesSearch
      return matchesSearch && ex.muscle_group_id === selectedMuscleGroup
    })
  }, [exercises, search, selectedMuscleGroup])

  return (
    <>
      <div className="relative mb-3">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: colors.textSecondary }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ejercicio..."
          className="w-full p-3 pl-10 rounded-lg text-base"
          style={inputStyle}
          autoFocus
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setSelectedMuscleGroup(null)}
          className="px-3 py-1.5 rounded-full text-sm transition-colors"
          style={{
            backgroundColor: !selectedMuscleGroup ? colors.accent : 'transparent',
            color: !selectedMuscleGroup ? '#ffffff' : colors.textSecondary,
            border: `1px solid ${!selectedMuscleGroup ? colors.accent : colors.border}`,
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
              backgroundColor: selectedMuscleGroup === group.id ? colors.accent : 'transparent',
              color: selectedMuscleGroup === group.id ? '#ffffff' : colors.textSecondary,
              border: `1px solid ${selectedMuscleGroup === group.id ? colors.accent : colors.border}`,
            }}
          >
            {group.nombre}
          </button>
        ))}
      </div>

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
          filteredExercises.map(exercise => (
            <button
              key={exercise.id}
              onClick={() => onSelect(exercise)}
              className="w-full text-left p-3 rounded-lg transition-colors hover:bg-surface-alt"
              style={{ color: colors.textPrimary }}
            >
              <div className="font-medium">{exercise.nombre}</div>
              {exercise.equipment && (
                <div className="text-sm" style={{ color: colors.textSecondary }}>
                  {exercise.equipment.nombre}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </>
  )
}

export default ExerciseSearchList
