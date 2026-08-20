import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { CircleMinus, CirclePlus, Clock } from 'lucide-react-native'
import SetRow, { COL_SET, COL_CHECK, SET_ROW_GAP, SET_ROW_ACCENT, getEffortColumnWidth } from './SetRow'
import useWorkoutStore from '../../stores/workoutStore'
import { usePreferences } from '../../hooks/usePreferences'
import { colors } from '../../lib/styles'
import { formatRelativeDate, shouldShowAnnotationColumn, getSetColumns } from '@gym/shared'

const HEADER_STYLE = {
  textAlign: 'center',
  color: colors.textSecondary,
  fontSize: 10,
  fontWeight: '600',
  letterSpacing: 0.3,
}

function SetsList({
  exerciseKey,
  exercise,
  setsCount,
  previousWorkout,
  previousLoaded = false,
  progressionEnabled = false,
  trackedFields,
  weightUnit,
  distanceUnit,
  rest_seconds,
  reps,
  targetField,
  levelTarget,
  effortTarget,
  onCompleteSet,
  onUncompleteSet,
  onRemoveSet,
  onAddSet,
}) {
  const { t } = useTranslation()
  const { data: preferences } = usePreferences()
  // Columna «Notas» presente si hay algo que anotar (RIR/notas/vídeo). Helper compartido con SetRow.
  const annotationColumn = shouldShowAnnotationColumn(preferences)
  const completedSets = useWorkoutStore(state => state.completedSets)
  // Columnas de valor del ejercicio (1 a 3) — mismas que pinta SetRow, con su cabecera y unidad
  const columns = getSetColumns(trackedFields, { weightUnit, distanceUnit })
  const effortWidth = getEffortColumnWidth(trackedFields, preferences?.show_rir_input ?? true)
  const activeSetNumber = (() => {
    for (let i = 1; i <= setsCount; i++) {
      if (!completedSets[`${exerciseKey}-${i}`]) return i
    }
    return null
  })()

  return (
    <>
      {/* Recencia de la referencia (la sesión anterior ahora se muestra inline por fila; ver
          PreviousSetLine, dentro de SetRowMeta). undefined = cargando; null = primera vez; objeto = fecha relativa. */}
      <View style={{ marginTop: 12, marginBottom: 12 }}>
        {previousWorkout === undefined ? (
          <View style={{ height: 16, width: 160, borderRadius: 4, backgroundColor: colors.bgTertiary }} />
        ) : previousWorkout ? (
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Clock size={12} color={colors.textSecondary} />
            <Text className="text-xs" style={{ color: colors.textSecondary }}>
              {t('workout:set.lastSession', { when: formatRelativeDate(previousWorkout.date) })}
            </Text>
            {previousWorkout.fromDifferentDay && previousWorkout.sourceDayName && (
              <Text className="text-xs" numberOfLines={1} style={{ color: colors.textMuted, flexShrink: 1 }}>
                {t('workout:set.previousDay', { day: previousWorkout.sourceDayName })}
              </Text>
            )}
          </View>
        ) : (
          <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('workout:set.firstTime')}</Text>
        )}
      </View>

      {/* Cabecera de columnas, mida lo que mida el ejercicio: es donde vive la unidad de cada
          columna (KG, MM:SS, NIVEL…), lo que permite que la fila lleve solo inputs y no desborde.
          Anchos desde las constantes de SetRow (fuente única) y misma condición annotationColumn.
          paddingLeft = 4 + la barra de "hecho" de las filas, o la cabecera queda 3px desplazada. */}
      {setsCount > 0 && (
        <View style={{ flexDirection: 'row', gap: SET_ROW_GAP, marginBottom: 12, paddingHorizontal: 4, paddingLeft: 4 + SET_ROW_ACCENT }}>
          <Text numberOfLines={1} style={[HEADER_STYLE, { width: COL_SET }]}>
            {t('workout:set.set').toUpperCase()}
          </Text>
          {columns.map(col => (
            <Text key={col.field} numberOfLines={1} style={[HEADER_STYLE, { flex: 1 }]}>{col.label}</Text>
          ))}
          {annotationColumn && (
            <Text numberOfLines={1} style={[HEADER_STYLE, { width: effortWidth }]}>
              {t('workout:set.notes').toUpperCase()}
            </Text>
          )}
          <View style={{ width: COL_CHECK }} />
        </View>
      )}

      <View style={{ gap: 8 }}>
        {Array.from({ length: setsCount }, (_, i) => {
          const previousSet = previousWorkout?.sets?.find(s => s.setNumber === i + 1)
          // Envoltorio para aislar la subfila de progresión (que SetRow pinta bajo la fila,
          // reaccionando al peso en vivo) del gap del contenedor. Ver ProgressionHint.
          return (
            <View key={`${exerciseKey}-${i + 1}`}>
              <SetRow
                setNumber={i + 1}
                totalSets={setsCount}
                exerciseName={exercise.name}
                sessionExerciseId={exerciseKey}
                exerciseId={exercise.id}
                trackedFields={trackedFields}
                weightUnit={weightUnit}
                distanceUnit={distanceUnit}
                descansoSeg={rest_seconds}
                previousSet={previousSet}
                previousLoaded={previousLoaded}
                target={reps}
                targetField={targetField}
                levelTarget={levelTarget}
                effortTarget={effortTarget}
                progressionEnabled={progressionEnabled}
                isActive={activeSetNumber === i + 1}
                onComplete={onCompleteSet}
                onUncomplete={onUncompleteSet}
              />
            </View>
          )
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 16 }}>
        {setsCount > 0 && (
          <Pressable onPress={onRemoveSet}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            className="active:opacity-70">
            <CircleMinus size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('workout:set.removeLast')}</Text>
          </Pressable>
        )}
        {onAddSet && (
          <Pressable onPress={onAddSet}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            className="active:opacity-70">
            <CirclePlus size={16} color={colors.success} />
            <Text style={{ color: colors.success, fontSize: 13, fontWeight: '600' }}>{t('workout:set.addSet')}</Text>
          </Pressable>
        )}
      </View>
    </>
  )
}

export default SetsList
