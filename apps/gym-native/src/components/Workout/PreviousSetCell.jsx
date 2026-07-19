import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MeasurementType, formatPreviousSetValue } from '@gym/shared'
import SetNotesView from './SetNotesView'
import { colors } from '../../lib/styles'

// Referencia inline de la MISMA serie en la última sesión (patrón Strong/Hevy): UNA línea gris
// con el valor formateado (sirve para todos los MeasurementType vía formatPreviousSetValue).
// Deliberadamente NO muestra el RIR de la última vez inline: duplicaba visualmente la columna RIR
// (esfuerzo actual) y engordaba la fila a dos líneas. Un punto sutil marca que hubo nota/vídeo;
// tocar abre el detalle. El valor ya alimenta el prefill automático de los inputs (useSetInputs).
export default function PreviousSetCell({
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
    return <Text style={{ color: colors.textDisabled, fontSize: 12, textAlign: 'center' }}>–</Text>
  }

  const interactive = !!previousSet.notes || !!previousSet.videoUrl
  // weight_reps: sin unidad de peso ("75 × 6"); la cabecera KG ya la indica. Otros tipos la
  // conservan (no tienen cabecera que desambigüe: "5km × 30:00", "Nv5 × 12:00").
  const hideWeightUnit = measurementType === MeasurementType.WEIGHT_REPS
  const valueText = formatPreviousSetValue(previousSet, measurementType, { weightUnit, timeUnit, distanceUnit, hideWeightUnit })

  // Punto de "hay nota/vídeo" IDÉNTICO al de la celda SERIE (6px, textLight, superíndice): mismo
  // significado (esta serie tiene detalle) → mismo indicador. Ver renderSetCell en SetRow.
  const valueEl = (
    // maxWidth acota el Text al ancho de columna (weight_reps: 54px) para que numberOfLines={1}
    // trunque en vez de desbordar (paridad con el overflow/ellipsis del gemelo web).
    <View style={{ position: 'relative', maxWidth: '100%' }}>
      <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '500', textAlign: 'center' }}>
        {valueText}
      </Text>
      {interactive && <View style={{ position: 'absolute', top: '50%', right: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textLight, transform: [{ translateY: -9 }] }} />}
    </View>
  )

  if (!interactive) {
    return valueEl
  }

  return (
    <>
      <Pressable
        onPress={() => setShowDetail(true)}
        accessibilityLabel={t('workout:set.lastTime')}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="active:opacity-70"
      >
        {valueEl}
      </Pressable>
      <SetNotesView
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        notes={previousSet.notes}
        videoUrl={previousSet.videoUrl}
      />
    </>
  )
}
