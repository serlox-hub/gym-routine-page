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
 */
function SetRowMeta({
  previousSet,
  trackedFields,
  weightUnit,
  distanceUnit,
  showRir,
  showProgressionHint,
  repsTarget,
  timerSeconds,
}) {
  const showTimer = timerSeconds > 0
  if (!previousSet && !showProgressionHint && !showTimer) return null

  return (
    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 pl-1">
      <PreviousSetLine
        previousSet={previousSet}
        trackedFields={trackedFields}
        weightUnit={weightUnit}
        distanceUnit={distanceUnit}
        showRir={showRir}
      />
      {showProgressionHint && <ProgressionHint prevReps={previousSet?.reps} repsTarget={repsTarget} />}
      {showTimer && <ExecutionTimer seconds={timerSeconds} />}
    </div>
  )
}

export default SetRowMeta
