import { useTranslation } from 'react-i18next'
import { StickyNote, Video } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { getEffortLabel, formatEffortBadge, effortRendersAsWord } from '@gym/shared'

/**
 * Chip de la columna «Notas»: SOLO display + disparador. Muestra un glifo con prioridad
 * RIR > nota > vídeo (la bolita marca «hay algo más») y, al tocarlo, abre la hoja unificada
 * de anotación (onOpenDetails), donde se edita TODO (RIR, tipo de serie, nota, vídeo) en una
 * sola superficie. El chip ya no edita nada por sí mismo (antes tenía un popover; se unificó
 * todo en la hoja para no mezclar comportamientos — ver DECISIONS). La celda del número sigue
 * inerte; el RIR se ve de un vistazo aquí (patrón Strong/Hevy).
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
  // Vacío = guion, nunca la palabra "Esfuerzo": la columna mide 44-62px y la etiqueta ya está en
  // la cabecera «NOTAS». El nombre completo va en el aria-label/title.
  const chipLabel = showEffortScale ? getEffortLabel(trackedFields) : t('workout:set.notes')
  // La escala RPE pinta palabras ("Moderado"); a 10px caben en su columna (ver COL_EFFORT_WORD).
  const isWordValue = primary === 'rir' && effortRendersAsWord(trackedFields, showEffortScale)

  return (
    // Botón transparente a 44×44 = área táctil (#10); el pill visual va en el span interior.
    // El botón ocupa su celda del grid (w-full + minWidth 0): el pill nunca se sale de la columna.
    <button
      onClick={onOpenDetails}
      title={chipLabel}
      aria-label={chipLabel}
      className="w-full"
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, minWidth: 0, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <span
        style={{
          position: 'relative',
          maxWidth: '100%',
          backgroundColor: colors.bgTertiary,
          borderRadius: 6,
          padding: isWordValue ? '3px 4px' : '3px 7px',
          border: `1px solid ${inviteBorder ? colors.border : 'transparent'}`,
          color: textColor,
          fontSize: isWordValue ? 10 : 11,
          fontWeight: 600,
          minWidth: 34,
          minHeight: 20,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* El overflow:hidden del ellipsis solo envuelve el VALOR DE TEXTO (único caso que puede
            desbordar): vivir en el span exterior recortaría la bolita, que sobresale de sus
            límites; envolver también los iconos los blockifica como texto y descuadra su alto
            (13px fijos) frente al de un pill con solo texto. */}
        {primary === 'rir' && (
          <span style={{ maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {compactValue}
          </span>
        )}
        {primary === 'note' && <StickyNote size={13} color={colors.textSecondary} />}
        {primary === 'video' && <Video size={13} color={colors.textSecondary} />}
        {primary === 'empty' && (showEffortScale ? '–' : <StickyNote size={13} color={colors.textMuted} />)}
        {/* Bolita «hay algo más» (nota/vídeo además del glifo principal). */}
        {hasMore && (
          <span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.textLight }} />
        )}
      </span>
    </button>
  )
}
