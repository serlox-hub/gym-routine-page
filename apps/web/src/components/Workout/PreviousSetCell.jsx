import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles.js'
import SetNotesView from './SetNotesView.jsx'
import { MeasurementType, formatPreviousSetValue, formatPreviousSetEffort } from '@gym/shared'

// Referencia inline de la MISMA serie en la última sesión (patrón Strong/Hevy): valor formateado
// (todos los MeasurementType vía formatPreviousSetValue) y, si el usuario usa RIR (`showRir`) y la
// serie previa lo registró, una segunda línea discreta con el esfuerzo ("@2"), mismo formato que la
// columna de esfuerzo actual. Es contexto de progresión (cómo de duro fue la última vez), no solo
// qué peso. Un punto sutil marca que hubo nota/vídeo. El valor ya alimenta el prefill automático
// de los inputs (useSetInputs).
// SIEMPRE se puede tocar (haya nota o no): la columna mide 46px y elide ("2 × 3:2…"), así que la
// hoja de detalle es el ÚNICO sitio donde se lee el valor entero, y encima con unidades.
function PreviousSetCell({
  previousSet,
  measurementType = MeasurementType.WEIGHT_REPS,
  weightUnit = 'kg',
  distanceUnit = 'm',
  showRir = false,
}) {
  const { t } = useTranslation()
  const [showDetail, setShowDetail] = useState(false)

  // Serie sin equivalente en la última sesión (primera vez, o menos series antes): guion.
  if (!previousSet) {
    return <span style={{ color: colors.textDisabled, fontSize: 12 }}>–</span>
  }

  const hasDetail = !!previousSet.notes || !!previousSet.videoUrl
  // Sin unidades ("75 × 6", "12 × 20:00"): TODOS los tipos tienen cabecera de columna que ya las
  // indica (ver getSetColumns), y en 46px no caben. Ver docs/DECISIONS.md.
  const valueText = formatPreviousSetValue(previousSet, measurementType, { weightUnit, distanceUnit, hideUnits: true })
  // En la hoja SÍ van las unidades: allí no hay cabecera que las diga.
  const fullValueText = formatPreviousSetValue(previousSet, measurementType, { weightUnit, distanceUnit })
  const effortText = formatPreviousSetEffort(previousSet, measurementType, showRir)

  // Punto de "hay nota/vídeo" IDÉNTICO al de la celda SERIE (6px, textLight, superíndice): mismo
  // significado (esta serie tiene detalle) → mismo indicador. Ver renderSetCell en SetRow.
  const valueEl = (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%', minWidth: 0, lineHeight: 1.15 }}>
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', maxWidth: '100%' }}>
        <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
          {valueText}
        </span>
        {hasDetail && <span style={{ position: 'absolute', top: '50%', right: -3, width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.textLight, transform: 'translateY(calc(-50% - 6px))' }} />}
      </span>
      {effortText && (
        <span style={{ color: colors.textMuted, fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap' }}>
          {effortText}
        </span>
      )}
    </span>
  )

  return (
    <>
      {/* minHeight 44 = área táctil (#10): al ser pulsable en todas las filas es el tercer
          objetivo de la fila. No la hace más alta (el ✓ ya mide 44). */}
      <button
        onClick={() => setShowDetail(true)}
        aria-label={t('workout:set.lastTime')}
        className="text-center hover:opacity-80"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, minWidth: 0, maxWidth: '100%', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {valueEl}
      </button>
      <SetNotesView
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={t('workout:set.lastTime')}
        summary={fullValueText}
        effort={effortText}
        notes={previousSet.notes}
        videoUrl={previousSet.videoUrl}
      />
    </>
  )
}

export default PreviousSetCell
