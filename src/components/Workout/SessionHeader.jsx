import { Plus } from 'lucide-react'

function SessionHeader({ dayName, isReordering, onToggleReorder, onAddExercise }) {
  return (
    <header className="mb-6">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span
            className="text-sm font-medium px-2 py-0.5 rounded"
            style={{ backgroundColor: 'rgba(63, 185, 80, 0.15)', color: '#3fb950' }}
          >
            En progreso
          </span>
          <h1 className="text-xl font-bold">{dayName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleReorder}
            className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: isReordering ? 'rgba(88, 166, 255, 0.15)' : '#21262d',
              color: isReordering ? '#58a6ff' : '#8b949e',
            }}
          >
            {isReordering ? 'Listo' : 'Reordenar'}
          </button>
          <button
            onClick={onAddExercise}
            className="p-1.5 rounded hover:opacity-80"
            style={{ backgroundColor: '#21262d' }}
            title="Añadir ejercicio"
          >
            <Plus size={18} style={{ color: '#8b949e' }} />
          </button>
        </div>
      </div>
    </header>
  )
}

export default SessionHeader
