import { Plus, ArrowUpDown } from 'lucide-react'

function SessionHeader({ dayName, isReordering, onToggleReorder, onAddExercise }) {
  return (
    <header className="mb-6">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">{dayName}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleReorder}
            className="p-1.5 rounded hover:opacity-80"
            style={{
              backgroundColor: isReordering ? 'rgba(88, 166, 255, 0.15)' : '#21262d',
            }}
            title={isReordering ? 'Listo' : 'Reordenar'}
          >
            <ArrowUpDown size={18} style={{ color: isReordering ? '#58a6ff' : '#8b949e' }} />
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
