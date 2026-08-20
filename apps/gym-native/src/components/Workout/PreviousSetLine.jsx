import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { formatPreviousSetValue, formatPreviousSetEffort } from '@gym/shared'
import SetNotesView from './SetNotesView'
import { colors } from '../../lib/styles'

// Referencia de la MISMA serie en la última sesión. Vive en la subfila (SetRowMeta), no en una
// columna: como columna medía 46px, tenía que elidir y ocultar las unidades, y con tres campos
// (bici: nivel × distancia × tiempo) dejaba los inputs a ~26px. Aquí cabe entera y CON unidades.
// Es contexto de progresión (qué y cómo de duro fue la última vez), y ese mismo valor alimenta el
// prefill automático de los inputs (useSetInputs). Al tocarla se abre la nota/vídeo de aquella serie.
export default function PreviousSetLine({
  previousSet,
  trackedFields,
  weightUnit = 'kg',
  distanceUnit = 'm',
  showRir = false,
}) {
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
      <Pressable
        onPress={() => setShowDetail(true)}
        accessibilityLabel={t('workout:set.lastTime')}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        className="flex-row items-center active:opacity-70"
        style={{ gap: 6, flexShrink: 1 }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '500' }}>
          {t('workout:set.previous')}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '500', flexShrink: 1 }}>
          {valueText}
        </Text>
        {effortText && (
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '500' }}>· {effortText}</Text>
        )}
        {/* Punto de "hay nota/vídeo" IDÉNTICO al del chip de anotación (EffortPicker,
            6px textLight): mismo significado (esta serie tiene detalle) → mismo indicador. */}
        {hasDetail && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textLight }} />}
      </Pressable>
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
