import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { formatSetTargetHint } from '@gym/shared'
import { colors } from '../../lib/styles'
import PreviousSetLine from './PreviousSetLine'
import ProgressionHint from './ProgressionHint'
import ExecutionTimer from './ExecutionTimer'

/**
 * Subfila de contexto bajo cada serie: SIEMPRE en el mismo sitio, mida lo que mida el ejercicio.
 *
 * Reúne las tres cosas que acompañan a una serie sin ser un dato de la serie: qué se hizo la
 * última vez, el aviso de subir peso y la cuenta atrás de ejecución. Antes la referencia era una
 * columna del layout (46px, elidida y sin unidades) y el aviso y el timer añadían una línea cada
 * uno. Al bajar los tres a UNA línea compartida, las columnas de valor recuperan el ancho que
 * ocupaba la columna y caben hasta 3 campos sin desbordar la card. La aritmética del reparto vive
 * en `MAX_TRACKED_FIELDS` (`lib/measurementFields.js`), que es la fuente única. Ver DECISIONS.
 */
export default function SetRowMeta({
  previousSet,
  trackedFields,
  weightUnit,
  distanceUnit,
  showRir,
  showProgressionHint,
  repsTarget,
  timerSeconds,
}) {
  const { t } = useTranslation()
  const showTimer = timerSeconds > 0
  // `repsTarget` es el objetivo de la rutina (columna `routine_exercises.reps`), que no siempre
  // habla de reps: en un cardio es "20min" o "5km". Ver formatSetTargetHint.
  const targetHint = formatSetTargetHint(trackedFields, repsTarget)
  if (!previousSet && !showProgressionHint && !showTimer && !targetHint) return null

  return (
    <View className="flex-row flex-wrap items-center" style={{ columnGap: 12, rowGap: 4, marginTop: 4, paddingLeft: 4 }}>
      {targetHint && (
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '500' }}>
          {t('workout:set.target')} {targetHint}
        </Text>
      )}
      <PreviousSetLine
        previousSet={previousSet}
        trackedFields={trackedFields}
        weightUnit={weightUnit}
        distanceUnit={distanceUnit}
        showRir={showRir}
      />
      {showProgressionHint && <ProgressionHint prevReps={previousSet?.reps} repsTarget={repsTarget} />}
      {showTimer && <ExecutionTimer seconds={timerSeconds} />}
    </View>
  )
}
