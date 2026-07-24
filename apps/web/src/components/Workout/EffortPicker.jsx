import { useTranslation } from 'react-i18next'
import { StickyNote, Video } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { getEffortLabel, formatEffortBadge, measurementTypeUsesReps } from '@gym/shared'

/**
 * Chip de la columna «Notas»: SOLO display + disparador. Muestra un glifo con prioridad
 * RIR > nota > vídeo (la bolita marca «hay algo más») y, al tocarlo, abre la hoja unificada
 * de anotación (onOpenDetails), donde se edita TODO (RIR, tipo de serie, nota, vídeo) en una
 * sola superficie. El chip ya no edita nada por sí mismo (antes tenía un popover; se unificó
 * todo en la hoja para no mezclar comportamientos — ver DECISIONS). La celda del número sigue
 * inerte; el RIR se ve de un vistazo aquí (patrón Strong/Hevy).
 */
export default function EffortPicker({
  value, measurementType, note, hasVideo = false, emptyDash = false, active = false, showEffortScale = true, onOpenDetails,
}) {
  const { t } = useTranslation()
  const usesReps = measurementTypeUsesReps(measurementType)

  // Glifo por prioridad RIR (si activado y fijado) > nota > vídeo > vacío. `hasMore` = bolita.
  const rirSet = showEffortScale && value != null
  const hasNote = !!note
  const primary = rirSet ? 'rir' : hasNote ? 'note' : hasVideo ? 'video' : 'empty'
  const hasMore = primary === 'rir' ? (hasNote || hasVideo) : primary === 'note' ? hasVideo : false
  const inviteBorder = primary === 'empty' && active
  const textColor = (rirSet || active) ? colors.textSecondary : colors.textMuted
  const compactValue = usesReps ? formatEffortBadge(value, measurementType) : String(value)
  const emptyLabel = emptyDash ? '–' : getEffortLabel(measurementType)
  const chipLabel = showEffortScale ? getEffortLabel(measurementType) : t('workout:set.notes')

  return (
    // Botón transparente a 44×44 = área táctil (#10); el pill visual va en el span interior.
    <button
      onClick={onOpenDetails}
      title={chipLabel}
      aria-label={chipLabel}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <span
        style={{
          position: 'relative',
          backgroundColor: colors.bgTertiary,
          borderRadius: 6,
          padding: '3px 7px',
          border: `1px solid ${inviteBorder ? colors.border : 'transparent'}`,
          color: textColor,
          fontSize: 11,
          fontWeight: 600,
          minWidth: 34,
          minHeight: 20,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {primary === 'rir' && compactValue}
        {primary === 'note' && <StickyNote size={13} color={colors.textSecondary} />}
        {primary === 'video' && <Video size={13} color={colors.textSecondary} />}
        {primary === 'empty' && (showEffortScale ? emptyLabel : <StickyNote size={13} color={colors.textMuted} />)}
        {/* Bolita «hay algo más» (nota/vídeo además del glifo principal). */}
        {hasMore && (
          <span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.textLight }} />
        )}
      </span>
    </button>
  )
}
