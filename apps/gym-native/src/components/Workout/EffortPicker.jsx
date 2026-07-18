import { useState, useRef } from 'react'
import { View, Text, Pressable, Modal, Dimensions } from 'react-native'
import { colors } from '../../lib/styles'
import { getEffortOptions, getEffortLabel, formatEffortBadge, measurementTypeUsesReps } from '@gym/shared'

/**
 * Chip de esfuerzo (RIR/RPE) inline en la fila de serie + popover de selección.
 * El popover se ancla sobre el chip midiendo su posición en pantalla (measureInWindow)
 * y se pinta en un Modal transparente para escapar del recorte del ScrollView.
 * Reutilizar el mismo valor lo deselecciona (null). Paridad con la versión web (issue #8).
 */
export default function EffortPicker({ value, onChange, measurementType, emptyDash = false, active = false }) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)
  const chipRef = useRef(null)
  const options = getEffortOptions(measurementType)
  const usesReps = measurementTypeUsesReps(measurementType)
  const hasValue = value != null
  // Borde ("rellena esto") solo en el vacío de la fila ACTIVA; en completadas sin RIR queda
  // apagado (tocable pero sin gritar). Con valor, texto normal sin borde.
  const inviteBorder = !hasValue && active
  const textColor = (hasValue || active) ? colors.textSecondary : colors.textMuted
  // Valor compacto para la columna: RIR «@2», RPE el número (1-5); la palabra va en el popover.
  // Vacío: «–» cuando hay cabecera de columna (emptyDash, grid weight_reps) o la etiqueta si no.
  const compactValue = usesReps ? formatEffortBadge(value, measurementType) : String(value)
  const label = hasValue ? compactValue : (emptyDash ? '–' : getEffortLabel(measurementType))

  const openPicker = () => {
    chipRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h })
      setOpen(true)
    })
  }

  const select = (optionValue) => {
    onChange(value === optionValue ? null : optionValue)
    setOpen(false)
  }

  const { width: screenW, height: screenH } = Dimensions.get('window')
  // Abrir hacia el lado con más espacio, descontando del hueco superior el header de sesión
  // + safe area (~150px) para no solaparlos. anchor.y es coord. de ventana (incluye status bar).
  const HEADER = 150
  const dropUp = !anchor || anchor.y - HEADER > screenH - (anchor.y + anchor.h)
  const panelStyle = anchor && {
    position: 'absolute',
    ...(dropUp
      ? { bottom: screenH - anchor.y + 8 }
      : { top: anchor.y + anchor.h + 8 }),
    right: Math.max(8, screenW - (anchor.x + anchor.w)),
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 6,
    flexDirection: usesReps ? 'row' : 'column',
    gap: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  }

  return (
    <>
      <Pressable
        ref={chipRef}
        onPress={openPicker}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        style={{
          backgroundColor: colors.bgTertiary,
          borderRadius: 6,
          paddingHorizontal: 7,
          paddingVertical: 3,
          minWidth: 34,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: inviteBorder ? colors.border : 'transparent',
        }}
      >
        <Text style={{ color: textColor, fontSize: 11, fontWeight: '600' }}>
          {label}
        </Text>
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          {anchor && (
            <View style={panelStyle}>
              {options.map(option => {
                const selected = value === option.value
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => select(option.value)}
                    style={{
                      backgroundColor: selected ? colors.success : colors.bgTertiary,
                      borderRadius: 8,
                      paddingVertical: usesReps ? 8 : 9,
                      paddingHorizontal: usesReps ? 0 : 12,
                      width: usesReps ? 38 : 150,
                      alignItems: usesReps ? 'center' : 'flex-start',
                    }}
                  >
                    <Text numberOfLines={1} style={{ color: selected ? colors.bgPrimary : colors.textPrimary, fontWeight: '600', fontSize: usesReps ? 15 : 12 }}>
                      {option.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  )
}
