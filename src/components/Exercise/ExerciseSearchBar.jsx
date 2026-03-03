import { Search } from 'lucide-react'
import { colors, inputStyle, selectStyle } from '../../lib/styles.js'

function ExerciseSearchBar({ search, onSearchChange, muscleGroups, selectedMuscleGroup, onMuscleGroupChange, autoFocus = false }) {
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
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar ejercicio..."
          className="w-full p-3 pl-10 rounded-lg text-base"
          style={inputStyle}
          autoFocus={autoFocus}
        />
      </div>
      <select
        value={selectedMuscleGroup || ''}
        onChange={(e) => onMuscleGroupChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full p-3 rounded-lg text-base appearance-none mb-3"
        style={selectStyle}
      >
        <option value="">Todos los grupos musculares</option>
        {muscleGroups?.map(group => (
          <option key={group.id} value={group.id}>{group.name}</option>
        ))}
      </select>
    </>
  )
}

export default ExerciseSearchBar
