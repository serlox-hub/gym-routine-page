import { Plus, ArrowUpDown } from 'lucide-react'
import { PageHeader } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

function SessionHeader({ dayName, isReordering, onToggleReorder, onAddExercise, onBack }) {
  return (
    <PageHeader
      title={dayName}
      onBack={onBack}
      rightContent={
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleReorder}
            className="p-1.5 rounded hover:opacity-80"
            style={{
              backgroundColor: isReordering ? 'rgba(88, 166, 255, 0.15)' : colors.bgTertiary,
            }}
            title={isReordering ? 'Listo' : 'Reordenar'}
          >
            <ArrowUpDown size={18} style={{ color: isReordering ? colors.accent : colors.textSecondary }} />
          </button>
          <button
            onClick={onAddExercise}
            className="p-1.5 rounded hover:opacity-80"
            style={{ backgroundColor: colors.bgTertiary }}
            title="Añadir ejercicio"
          >
            <Plus size={18} style={{ color: colors.textSecondary }} />
          </button>
        </div>
      }
    />
  )
}

export default SessionHeader
