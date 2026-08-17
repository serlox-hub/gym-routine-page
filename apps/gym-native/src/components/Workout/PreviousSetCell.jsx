import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MeasurementType, formatPreviousSetValue, formatPreviousSetEffort } from '@gym/shared'
import SetNotesView from './SetNotesView'
import { colors } from '../../lib/styles'

// Referencia inline de la MISMA serie en la última sesión (patrón Strong/Hevy): valor formateado
// (todos los MeasurementType vía formatPreviousSetValue) y, si el usuario usa RIR (`showRir`) y la
// serie previa lo registró, una segunda línea discreta con el esfuerzo ("@2"), mismo formato que la
// columna de esfuerzo actual. Es contexto de progresión (cómo de duro fue la última vez), no solo
// qué peso. Un punto sutil marca que hubo nota/vídeo. El valor ya alimenta el prefill automático
// de los inputs (useSetInputs).
// SIEMPRE se puede tocar (haya nota o no): la columna mide 46px y elide ("2 × 3:2…"), así que la
// hoja de detalle es el ÚNICO sitio donde se lee el valor entero, y encima con unidades.
export default function PreviousSetCell({
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
    return <Text style={{ color: colors.textDisabled, fontSize: 12, textAlign: 'center' }}>–</Text>
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
    // maxWidth acota el Text al ancho de columna (COL_PREV) para que numberOfLines={1}
    // trunque en vez de desbordar (paridad con el overflow/ellipsis del gemelo web).
    <View style={{ maxWidth: '100%', alignItems: 'center' }}>
      <View style={{ position: 'relative', maxWidth: '100%' }}>
        <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '500', textAlign: 'center' }}>
          {valueText}
        </Text>
        {hasDetail && <View style={{ position: 'absolute', top: '50%', right: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textLight, transform: [{ translateY: -9 }] }} />}
      </View>
      {effortText && (
        <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 10, fontWeight: '500', textAlign: 'center' }}>
          {effortText}
        </Text>
      )}
    </View>
  )

  return (
    <>
      {/* hitSlop vertical generoso = área táctil (#10) sin crecer el layout: al ser pulsable en
          todas las filas es el tercer objetivo de la fila. */}
      <Pressable
        onPress={() => setShowDetail(true)}
        accessibilityLabel={t('workout:set.lastTime')}
        hitSlop={{ top: 14, bottom: 14, left: 6, right: 6 }}
        className="active:opacity-70"
      >
        {valueEl}
      </Pressable>
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
