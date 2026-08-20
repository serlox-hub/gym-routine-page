import { useTranslation } from 'react-i18next'
import { CircleMinus, CirclePlus, Clock } from 'lucide-react'
import SetRow, { getSetGridTemplate, SET_ROW_GAP, SET_ROW_ACCENT } from './SetRow.jsx'
import useWorkoutStore from '../../stores/workoutStore.js'
import { usePreferences } from '../../hooks/usePreferences.js'
import { colors } from '../../lib/styles.js'
import { formatRelativeDate, shouldShowAnnotationColumn, getSetColumns, effortRendersAsWord } from '@gym/shared'

const HEADER_STYLE = {
  color: colors.textSecondary,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.3,
  textAlign: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

function SetsList({
  exerciseKey,
  exercise,
  setsCount,
  previousWorkout,
  progressionEnabled = false,
  trackedFields,
  weightUnit,
  distanceUnit,
  rest_seconds,
  reps,
  rirTarget,
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
      <div className="mt-3 mb-3">
        {previousWorkout === undefined ? (
          <div className="h-4 rounded w-40 animate-pulse" style={{ backgroundColor: colors.bgTertiary }} />
        ) : previousWorkout ? (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: colors.textSecondary }}>
            <Clock size={12} />
            <span>{t('workout:set.lastSession', { when: formatRelativeDate(previousWorkout.date) })}</span>
            {previousWorkout.fromDifferentDay && previousWorkout.sourceDayName && (
              <span className="truncate" style={{ color: colors.textMuted, minWidth: 0 }}>
                {t('workout:set.previousDay', { day: previousWorkout.sourceDayName })}
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs" style={{ color: colors.textSecondary }}>{t('workout:set.firstTime')}</div>
        )}
      </div>

      {/* Cabecera de columnas, mida lo que mida el ejercicio: es donde vive la unidad de cada
          columna (KG, MM:SS, NIVEL…), lo que permite que la fila lleve solo inputs y no desborde.
          Grid desde el helper de SetRow (fuente única) con la misma condición annotationColumn. */}
      {setsCount > 0 && (
        <div className="grid items-center mb-3 px-1" style={{
          gridTemplateColumns: getSetGridTemplate(columns.length, annotationColumn, effortRendersAsWord(trackedFields, preferences?.show_rir_input ?? true)),
          gap: SET_ROW_GAP,
          // Alinea con las filas, que llevan la barra de "hecho" a la izquierda
          paddingLeft: `calc(0.25rem + ${SET_ROW_ACCENT}px)`,
        }}>
          <span style={HEADER_STYLE}>{t('workout:set.set').toUpperCase()}</span>
          {columns.map(col => (
            <span key={col.field} style={HEADER_STYLE}>{col.label}</span>
          ))}
          {annotationColumn && (
            <span style={HEADER_STYLE}>{t('workout:set.notes').toUpperCase()}</span>
          )}
          <span />
        </div>
      )}

      <div className="space-y-2">
        {Array.from({ length: setsCount }, (_, i) => {
          const previousSet = previousWorkout?.sets?.find(s => s.setNumber === i + 1)
          // Envoltorio para aislar la subfila de progresión (que SetRow pinta bajo la fila,
          // reaccionando al peso en vivo) del space-y del contenedor. Ver ProgressionHint.
          return (
            <div key={`${exerciseKey}-${i + 1}`}>
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
                repsTarget={reps}
                rirTarget={rirTarget}
                progressionEnabled={progressionEnabled}
                isActive={activeSetNumber === i + 1}
                onComplete={onCompleteSet}
                onUncomplete={onUncompleteSet}
              />
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-6 mt-4">
        {setsCount > 0 && (
          <button onClick={onRemoveSet}
            className="flex items-center gap-1.5 hover:opacity-80"
            style={{ color: colors.textSecondary, fontSize: 13 }}>
            <CircleMinus size={16} />
            {t('workout:set.removeLast')}
          </button>
        )}
        {onAddSet && (
          <button onClick={onAddSet}
            className="flex items-center gap-1.5 hover:opacity-80"
            style={{ color: colors.success, fontSize: 13, fontWeight: 600 }}>
            <CirclePlus size={16} />
            {t('workout:set.addSet')}
          </button>
        )}
      </div>
    </>
  )
}

export default SetsList
