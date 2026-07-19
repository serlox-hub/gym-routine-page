import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles.js'
import SetNotesView from './SetNotesView.jsx'
import { MeasurementType, formatPreviousSetValue } from '@gym/shared'

// Referencia inline de la MISMA serie en la última sesión (patrón Strong/Hevy): UNA línea gris
// con el valor formateado (sirve para todos los MeasurementType vía formatPreviousSetValue).
// Deliberadamente NO muestra el RIR de la última vez inline: duplicaba visualmente la columna RIR
// (esfuerzo actual) y engordaba la fila a dos líneas. Un punto sutil marca que hubo nota/vídeo;
// tocar abre el detalle. El valor ya alimenta el prefill automático de los inputs (useSetInputs).
function PreviousSetCell({
  previousSet,
  measurementType = MeasurementType.WEIGHT_REPS,
  weightUnit = 'kg',
  timeUnit = 's',
  distanceUnit = 'm',
}) {
  const { t } = useTranslation()
  const [showDetail, setShowDetail] = useState(false)

  // Serie sin equivalente en la última sesión (primera vez, o menos series antes): guion.
  if (!previousSet) {
    return <span style={{ color: colors.textDisabled, fontSize: 12 }}>–</span>
  }

  const interactive = !!previousSet.notes || !!previousSet.videoUrl
  // weight_reps: sin unidad de peso ("75 × 6"); la cabecera KG ya la indica. Otros tipos la
  // conservan (no tienen cabecera que desambigüe: "5km × 30:00", "Nv5 × 12:00").
  const hideWeightUnit = measurementType === MeasurementType.WEIGHT_REPS
  const valueText = formatPreviousSetValue(previousSet, measurementType, { weightUnit, timeUnit, distanceUnit, hideWeightUnit })

  // Punto de "hay nota/vídeo" IDÉNTICO al de la celda SERIE (6px, textLight, superíndice): mismo
  // significado (esta serie tiene detalle) → mismo indicador. Ver renderSetCell en SetRow.
  const valueEl = (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', maxWidth: '100%' }}>
      <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
        {valueText}
      </span>
      {interactive && <span style={{ position: 'absolute', top: '50%', right: -3, width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.textLight, transform: 'translateY(calc(-50% - 6px))' }} />}
    </span>
  )

  if (!interactive) {
    return <div className="text-center" style={{ minWidth: 0, maxWidth: '100%' }}>{valueEl}</div>
  }

  return (
    <>
      <button
        onClick={() => setShowDetail(true)}
        aria-label={t('workout:set.lastTime')}
        className="text-center hover:opacity-80"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, minWidth: 0, maxWidth: '100%' }}
      >
        {valueEl}
      </button>
      <SetNotesView
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        notes={previousSet.notes}
        videoUrl={previousSet.videoUrl}
      />
    </>
  )
}

export default PreviousSetCell
