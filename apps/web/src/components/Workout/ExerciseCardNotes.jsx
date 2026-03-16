import { Badge } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

function ExerciseCardNotes({
  series,
  reps,
  rir,
  tempo,
  rest_seconds,
  showNotes,
  onToggleNotes,
  exercise,
  tempoRazon,
  notes,
}) {
  const hasNoteContent = exercise.instructions || notes || tempoRazon

  return (
    <>
      <div className="my-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
        <Badge variant="accent">{series}×{reps}</Badge>
        {rir !== null && <Badge variant="purple">RIR {rir}</Badge>}
        {tempo && <Badge variant="default">{tempo}</Badge>}
        {rest_seconds > 0 && <Badge variant="default">{rest_seconds}s</Badge>}
        {hasNoteContent && (
          <button
            onClick={onToggleNotes}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{
              backgroundColor: showNotes ? 'rgba(136, 198, 190, 0.2)' : colors.bgTertiary,
              color: showNotes ? colors.teal : colors.textSecondary,
            }}
          >
            {showNotes ? '▲ Ocultar notas' : '▼ Ver notas'}
          </button>
        )}
      </div>

      {showNotes && hasNoteContent && (
        <div
          className="mb-3 p-3 rounded text-sm space-y-2"
          style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        >
          {exercise.instructions && (
            <p style={{ color: colors.textPrimary }}>
              <span style={{ color: colors.accent }}>Ejecución:</span> {exercise.instructions}
            </p>
          )}
          {tempoRazon && (
            <p style={{ color: colors.textPrimary }}>
              <span style={{ color: colors.purple }}>Tempo:</span> {tempoRazon}
            </p>
          )}
          {notes && (
            <p style={{ color: colors.textPrimary }}>
              <span style={{ color: colors.warning }}>Nota:</span> {notes}
            </p>
          )}
        </div>
      )}
    </>
  )
}

export default ExerciseCardNotes
