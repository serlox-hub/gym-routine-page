import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpDown, Link2 } from 'lucide-react'
import DragHandle from './DragHandle.jsx'
import Modal from './Modal.jsx'
import ReorderModal from './ReorderModal.jsx'
import { colors } from '../../lib/styles.js'

/**
 * Cabecera morada de una superserie, como FILA de la lista de ejercicios del bloque.
 *
 * Es la fila que pinta el borde de arriba de la tarjeta (sus miembros pintan los laterales, ver
 * `ExerciseRowList`) y la que arrastra la tirada entera: su asa mueve la superserie como una unidad
 * entre las del bloque. Pulsarla ofrece el mismo movimiento por menú, que es el único camino con
 * lector de pantalla. `count` (la sesión) añade "(N ejercicios)" tras la etiqueta.
 */
function SupersetHeaderRow({
  label,
  count,
  dragHandleProps = null,
  isReordering = false,
  unitLabels = [],
  currentUnitIndex = 0,
  onReorderToUnit,
}) {
  const { t } = useTranslation()
  const [showMenu, setShowMenu] = useState(false)
  const [showReorder, setShowReorder] = useState(false)

  // Con una sola unidad en el bloque no hay ninguna acción que ofrecer, así que la cabecera no
  // abre un menú vacío: se queda sin pulsación, como una etiqueta.
  const canReorder = unitLabels.length > 1
  const HeaderBody = canReorder ? 'button' : 'div'

  return (
    <>
      <div
        className="flex items-center gap-2 px-2"
        style={{
          backgroundColor: colors.purpleBg,
          border: `1px solid ${colors.purple}`,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <DragHandle dragHandleProps={dragHandleProps} disabled={isReordering} size={14} />
        {/* A real button (keyboard, screen reader) 44 tall, the touch-target minimum, sibling of
            the handle like on native. Without an action it stays a label, at the same height. */}
        <HeaderBody
          {...(canReorder ? { type: 'button', onClick: () => setShowMenu(true) } : {})}
          className={`flex-1 min-w-0 min-h-11 flex items-center gap-2 text-left ${canReorder ? 'cursor-pointer' : ''}`}
        >
          <Link2 size={12} style={{ color: colors.purple }} />
          <span className="text-xs font-medium" style={{ color: colors.purple }}>{label}</span>
          {count != null && (
            <span className="text-xs" style={{ color: colors.textSecondary }}>
              ({t('routine:superset.exerciseCount', { count })})
            </span>
          )}
        </HeaderBody>
      </div>

      <Modal isOpen={showMenu} onClose={() => setShowMenu(false)} position="bottom" maxWidth="max-w-lg">
        <div className="py-2 pb-6">
          <button
            onClick={() => { setShowMenu(false); setShowReorder(true) }}
            disabled={isReordering}
            className="w-full flex items-center gap-3 px-5 py-3 text-sm hover:opacity-80 disabled:opacity-40"
            style={{ color: colors.textPrimary }}
          >
            <ArrowUpDown size={18} style={{ color: colors.textSecondary }} />
            {t('routine:superset.reorder')}
          </button>
        </div>
      </Modal>

      <ReorderModal
        isOpen={showReorder}
        onClose={() => setShowReorder(false)}
        totalItems={unitLabels.length}
        currentIndex={currentUnitIndex}
        positionLabels={unitLabels}
        onSelect={(i) => { setShowReorder(false); onReorderToUnit?.(i) }}
      />
    </>
  )
}

export default SupersetHeaderRow
