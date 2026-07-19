import { useState, useRef } from 'react'
import { View, Text, Pressable, Modal, Dimensions } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles'
import { getEffortOptions, getEffortLabel, getEffortInfo, formatEffortBadge, measurementTypeUsesReps } from '@gym/shared'

/**
 * Chip de esfuerzo (RIR/RPE) inline en la fila de serie + popover de selección.
 * El popover se ancla sobre el chip midiendo su posición en pantalla (measureInWindow)
 * y se pinta en un Modal transparente para escapar del recorte del ScrollView.
 * Reutilizar el mismo valor lo deselecciona (null). Paridad con la versión web (issue #8).
 * El popover es una COLUMNA: RIR muestra «código · palabra» (F · Fallo…) con cabecera
 * explicativa; RPE muestra la palabra directa (issue #10, punto 6 — RIR autoexplicable).
 */
export default function EffortPicker({ value, onChange, measurementType, emptyDash = false, active = false }) {
  const { t } = useTranslation()
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
    flexDirection: 'column',
    gap: 4,
    width: usesReps ? 208 : 160,
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
        hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={getEffortLabel(measurementType)}
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
              {usesReps && (
                <View style={{ paddingHorizontal: 8, paddingTop: 2, paddingBottom: 6 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700' }}>{t('workout:set.rirTitle')}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, lineHeight: 15 }}>{t('workout:set.rirHelp')}</Text>
                </View>
              )}
              {options.map(option => {
                const selected = value === option.value
                // RIR: info.label es el código (F/0/1/2/3+), info.description la palabra (Fallo…).
                // RPE: no aplica → se pinta option.label (la palabra ya descriptiva).
                const info = usesReps ? getEffortInfo(option.value, measurementType) : null
                const rowColor = selected ? colors.bgPrimary : colors.textPrimary
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => select(option.value)}
                    accessibilityRole="button"
                    accessibilityLabel={usesReps ? `${info.label} ${info.description}` : option.label}
                    accessibilityState={{ selected }}
                    style={{
                      backgroundColor: selected ? colors.success : colors.bgTertiary,
                      borderRadius: 8,
                      paddingVertical: 9,
                      paddingHorizontal: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    {usesReps ? (
                      <>
                        <Text style={{ minWidth: 26, textAlign: 'center', color: rowColor, fontWeight: '700', fontSize: 15 }}>{info.label}</Text>
                        <Text numberOfLines={1} style={{ color: rowColor, fontWeight: '500', fontSize: 13 }}>{info.description}</Text>
                      </>
                    ) : (
                      <Text numberOfLines={1} style={{ color: rowColor, fontWeight: '600', fontSize: 13 }}>{option.label}</Text>
                    )}
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
