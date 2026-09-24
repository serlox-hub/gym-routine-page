import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { colors } from '../../lib/styles.js'

// Fila punteada de "añadir ejercicio". La usan tanto `BlockSection` (al final de un bloque con
// ejercicios) como `DayCard` (sola, en lugar de una sección vacía).
function AddExerciseButton({ isWarmup = false, onClick }) {
  const { t } = useTranslation()

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      className="w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
      style={{ border: `1px dashed ${colors.border}`, color: isWarmup ? colors.warning : colors.purple }}
    >
      <Plus size={14} />
      {isWarmup ? t('routine:block.addToWarmup') : t('routine:block.addExercise')}
    </button>
  )
}

export default AddExerciseButton
