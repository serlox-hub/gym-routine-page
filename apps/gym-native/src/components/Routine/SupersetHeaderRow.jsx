import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ArrowUpDown, Link2 } from 'lucide-react-native'
import { DragHandle, Modal, ReorderModal } from '../ui'
import { colors } from '../../lib/styles'

/**
 * Cabecera morada de una superserie, como FILA de la lista de ejercicios del bloque.
 *
 * Es la fila que pinta el borde de arriba de la tarjeta (sus miembros pintan los laterales, ver
 * `BlockSection`) y la que arrastra la tirada entera: su asa mueve la superserie como una unidad
 * entre las del bloque. Pulsarla ofrece el mismo movimiento por menú, que es el único camino con
 * lector de pantalla.
 */
export default function SupersetHeaderRow({
  label,
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

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
          backgroundColor: colors.purpleBg,
          borderWidth: 1,
          borderColor: colors.purple,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <DragHandle dragHandleProps={dragHandleProps} disabled={isReordering} size={14} />
        {/* La pulsación va en un Pressable hermano del asa, no envolviéndola: dentro, el asa ya
            reclama el toque y la cabecera se quedaría sin su propia pulsación. */}
        <Pressable
          onPress={canReorder ? () => setShowMenu(true) : undefined}
          className={canReorder ? 'active:opacity-70' : ''}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Link2 size={12} color={colors.purple} />
          <Text style={{ color: colors.purple, fontSize: 12, fontWeight: '500' }}>{label}</Text>
        </Pressable>
      </View>

      <Modal isOpen={showMenu} onClose={() => setShowMenu(false)} position="bottom">
        <View style={{ paddingVertical: 8, paddingBottom: 24 }}>
          <Pressable
            onPress={() => { setShowMenu(false); setShowReorder(true) }}
            disabled={isReordering}
            className="active:opacity-70"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, opacity: isReordering ? 0.4 : 1 }}
          >
            <ArrowUpDown size={18} color={colors.textSecondary} />
            <Text style={{ color: colors.textPrimary, fontSize: 14 }}>{t('routine:superset.reorder')}</Text>
          </Pressable>
        </View>
      </Modal>

      {showReorder && (
        <ReorderModal
          visible
          onClose={() => setShowReorder(false)}
          totalItems={unitLabels.length}
          currentIndex={currentUnitIndex}
          positionLabels={unitLabels}
          onSelect={(i) => { setShowReorder(false); onReorderToUnit?.(i) }}
        />
      )}
    </>
  )
}
