import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles.js'
import SetNotesView from './SetNotesView.jsx'
import { formatPreviousSetValue, formatPreviousSetEffort } from '@gym/shared'

// Referencia de la MISMA serie en la última sesión. Vive en la subfila (SetRowMeta), no en una
// columna: como columna medía 46px, tenía que elidir y ocultar las unidades, y con tres campos
// (bici: nivel × distancia × tiempo) dejaba los inputs a ~26px. Aquí cabe entera y CON unidades.
// Es contexto de progresión (qué y cómo de duro fue la última vez), y ese mismo valor alimenta el
// prefill automático de los inputs (useSetInputs). Al tocarla se abre la nota/vídeo de aquella serie.
// El padding con margen negativo agranda el área táctil (texto de 11px = ~15px pulsables) sin
// cambiar la altura de la subfila. Equivale al hitSlop del gemelo native.
function PreviousSetLine({ previousSet, trackedFields, weightUnit = 'kg', distanceUnit = 'm', showRir = false }) {
  const { t } = useTranslation()
  const [showDetail, setShowDetail] = useState(false)

  const hasDetail = !!previousSet?.notes || !!previousSet?.videoUrl
  const valueText = previousSet ? formatPreviousSetValue(previousSet, trackedFields, { weightUnit, distanceUnit }) : ''
  const effortText = formatPreviousSetEffort(previousSet, trackedFields, showRir)

  // Sin referencia no se pinta nada: ni la primera vez (o menos series antes), ni cuando la serie
  // previa no tiene NINGUNO de los campos que el ejercicio mide ahora (`valueText` vacío), que pasa
  // al cambiar los campos de un ejercicio con historial. Una etiqueta "Anterior" sin valor detrás
  // es más ruido que el guion que ya se decidió no pintar.
  if (!previousSet || !valueText) return null

  return (
    <>
      <button
        onClick={() => setShowDetail(true)}
        aria-label={t('workout:set.lastTime')}
        className="flex items-center gap-1.5 hover:opacity-80 min-w-0 py-2 -my-2 px-0.5 -mx-0.5"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ color: colors.textMuted, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
          {t('workout:set.previous')}
        </span>
        <span className="truncate" style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 500, minWidth: 0 }}>
          {valueText}
        </span>
        {effortText && (
          <span style={{ color: colors.textMuted, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
            · {effortText}
          </span>
        )}
        {/* Punto de "hay nota/vídeo" IDÉNTICO al del chip de anotación (EffortPicker,
            6px textLight): mismo significado (esta serie tiene detalle) → mismo indicador. */}
        {hasDetail && <span className="shrink-0" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.textLight }} />}
      </button>
      <SetNotesView
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={t('workout:set.lastTime')}
        summary={valueText}
        effort={effortText}
        notes={previousSet.notes}
        videoUrl={previousSet.videoUrl}
      />
    </>
  )
}

export default PreviousSetLine
