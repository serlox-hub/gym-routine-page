import { useTranslation } from 'react-i18next'
import { formatSetTargetHint } from '@gym/shared'
import { colors } from '../../lib/styles.js'
import PreviousSetLine from './PreviousSetLine.jsx'
import ProgressionHint from './ProgressionHint.jsx'
import ExecutionTimer from './ExecutionTimer.jsx'

/**
 * Subfila de contexto bajo cada serie: SIEMPRE en el mismo sitio, mida lo que mida el ejercicio.
 *
 * Reúne las tres cosas que acompañan a una serie sin ser un dato de la serie: qué se hizo la
 * última vez, el aviso de subir peso y la cuenta atrás de ejecución. Antes la referencia era una
 * columna del grid (46px, elidida y sin unidades) y el aviso y el timer añadían una línea cada
 * uno. Al bajar los tres a UNA línea compartida, las columnas de valor recuperan el ancho que
 * ocupaba la columna y caben hasta 3 campos sin desbordar la card. La aritmética del reparto vive
 * en `MAX_TRACKED_FIELDS` (`lib/measurementFields.js`), que es la fuente única. Ver DECISIONS.
 *
 * Vive DENTRO del contenedor del bloque de la serie (ver `SetRow`), que ya pone el fondo y el
 * inset izquierdo: aquí solo va el divisor interior (`border`, no `divider`: con el bloque ya
 * relleno el separador no tiene que competir con los datos) y su padding vertical. No darle margen
 * ni padding horizontal propios o el bloque se desalinea de la cabecera de `SetsList`.
 */
function SetRowMeta({
  previousSet,
  trackedFields,
  weightUnit,
  distanceUnit,
  showRir,
  showProgressionHint,
  target,
  targetField,
  timerSeconds,
}) {
  const { t } = useTranslation()
  const showTimer = timerSeconds > 0
  // El objetivo de la rutina se pinta en el placeholder de SU columna (ver SetRow). Aquí solo
  // queda cuando no hay columna a la que anclarlo. Ver formatSetTargetHint.
  const targetHint = formatSetTargetHint(trackedFields, target, targetField)
  if (!previousSet && !showProgressionHint && !showTimer && !targetHint) return null

  return (
    <div
      className="flex items-center flex-wrap gap-x-3 gap-y-1 py-2"
      style={{ borderTop: `1px solid ${colors.border}` }}
    >
      {targetHint && (
        <span style={{ color: colors.textMuted, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
          {t('workout:set.target')} {targetHint}
        </span>
      )}
      <PreviousSetLine
        previousSet={previousSet}
        trackedFields={trackedFields}
        weightUnit={weightUnit}
        distanceUnit={distanceUnit}
        showRir={showRir}
      />
      {showProgressionHint && (
        <ProgressionHint
          previousSet={previousSet}
          target={target}
          targetField={targetField}
          trackedFields={trackedFields}
          distanceUnit={distanceUnit}
        />
      )}
      {showTimer && <ExecutionTimer seconds={timerSeconds} />}
    </div>
  )
}

export default SetRowMeta
