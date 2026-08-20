import { Text, Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { StickyNote, Video } from 'lucide-react-native'
import { colors } from '../../lib/styles'
import { getEffortLabel, formatEffortBadge, effortRendersAsWord } from '@gym/shared'

/**
 * Chip de la columna «Notas»: SOLO display + disparador. Muestra un glifo con prioridad
 * RIR > nota > vídeo (la bolita marca «hay algo más») y, al tocarlo, abre la hoja unificada
 * de anotación (onOpenDetails), donde se edita TODO (RIR, tipo de serie, nota, vídeo) en una
 * sola superficie. El chip ya no edita nada por sí mismo (antes tenía un popover; se unificó
 * todo en la hoja — ver DECISIONS). Paridad con web. La celda del número sigue inerte.
 */
export default function EffortPicker({
  value, trackedFields, note, hasVideo = false, active = false, showEffortScale = true, onOpenDetails,
}) {
  const { t } = useTranslation()

  // Glifo por prioridad RIR (si activado y fijado) > nota > vídeo > vacío. `hasMore` = bolita.
  const rirSet = showEffortScale && value != null
  const hasNote = !!note
  const primary = rirSet ? 'rir' : hasNote ? 'note' : hasVideo ? 'video' : 'empty'
  const hasMore = primary === 'rir' ? (hasNote || hasVideo) : primary === 'note' ? hasVideo : false
  const inviteBorder = primary === 'empty' && active
  const textColor = (rirSet || active) ? colors.textSecondary : colors.textMuted
  // Siempre la etiqueta ("@2" en RIR, "Duro" en RPE): el número de RPE no dice nada al usuario.
  const compactValue = formatEffortBadge(value, trackedFields)
  // Vacío = guion, nunca la palabra "Esfuerzo": la columna mide 42-62px y la etiqueta ya está en
  // la cabecera «NOTAS». El nombre completo va en el accessibilityLabel.
  const chipLabel = showEffortScale ? getEffortLabel(trackedFields) : t('workout:set.notes')
  // La escala RPE pinta palabras ("Moderado"); a 10px caben en su columna (ver COL_RIR_WORD).
  const isWordValue = primary === 'rir' && effortRendersAsWord(trackedFields, showEffortScale)

  return (
    <Pressable
      onPress={onOpenDetails}
      hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={chipLabel}
      style={{
        backgroundColor: colors.bgTertiary,
        borderRadius: 6,
        maxWidth: '100%',
        paddingHorizontal: isWordValue ? 4 : 7,
        paddingVertical: 3,
        minWidth: 34,
        minHeight: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: inviteBorder ? colors.border : 'transparent',
      }}
    >
      {primary === 'rir' && <Text numberOfLines={1} style={{ color: textColor, fontSize: isWordValue ? 10 : 11, fontWeight: '600' }}>{compactValue}</Text>}
      {primary === 'note' && <StickyNote size={13} color={colors.textSecondary} />}
      {primary === 'video' && <Video size={13} color={colors.textSecondary} />}
      {primary === 'empty' && (showEffortScale
        ? <Text style={{ color: textColor, fontSize: 11, fontWeight: '600' }}>–</Text>
        : <StickyNote size={13} color={colors.textMuted} />)}
      {/* Bolita «hay algo más» (nota/vídeo además del glifo principal). */}
      {hasMore && (
        <View style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textLight }} />
      )}
    </Pressable>
  )
}
