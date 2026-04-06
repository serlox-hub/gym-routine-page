import { useTranslation } from 'react-i18next'
import { Badge } from '../ui/index.js'
import { getExerciseInstructions, getStructuredInstructions } from '@gym/shared'
import { colors } from '../../lib/styles.js'

function StructuredInstructions({ instructions }) {
  const { t } = useTranslation()
  if (!instructions) return null

  return (
    <div className="space-y-2">
      {instructions.setup && (
        <p className="text-sm" style={{ color: colors.textPrimary }}>
          <span className="font-medium" style={{ color: colors.accent }}>{t('exercise:setup')}: </span>
          {instructions.setup}
        </p>
      )}
      {instructions.execution && (
        <p className="text-sm" style={{ color: colors.textPrimary }}>
          <span className="font-medium" style={{ color: colors.accent }}>{t('exercise:execution')}: </span>
          {instructions.execution}
        </p>
      )}
      {instructions.cues?.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>{t('exercise:cues')}</p>
          <ul className="list-none space-y-0.5">
            {instructions.cues.map((cue, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: colors.textPrimary }}>
                <span style={{ color: colors.success }}>&#x2022;</span>
                {cue}
              </li>
            ))}
          </ul>
        </div>
      )}
      {instructions.mistakes?.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>{t('exercise:mistakes')}</p>
          <ul className="list-none space-y-0.5">
            {instructions.mistakes.map((mistake, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: colors.textPrimary }}>
                <span style={{ color: colors.warning }}>&#x2022;</span>
                {mistake}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ExerciseCardNotes({
  series,
  reps,
  rir,
  rest_seconds,
  showNotes,
  onToggleNotes,
  exercise,
  notes,
}) {
  const { t } = useTranslation()
  const structured = getStructuredInstructions(exercise)
  const legacyText = !structured ? getExerciseInstructions(exercise) : ''
  const hasNoteContent = structured || legacyText || notes

  return (
    <>
      <div className="my-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
        <Badge variant="accent">{series}×{reps}</Badge>
        {rir !== null && <Badge variant="purple">RIR {rir}</Badge>}
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
            {showNotes ? `▲ ${t('exercise:hideNotes')}` : `▼ ${t('exercise:showNotes')}`}
          </button>
        )}
      </div>

      {showNotes && hasNoteContent && (
        <div
          className="mb-3 p-3 rounded text-sm space-y-2"
          style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        >
          {structured && <StructuredInstructions instructions={structured} />}
          {legacyText && (
            <p style={{ color: colors.textPrimary, whiteSpace: 'pre-line' }}>
              <span style={{ color: colors.accent }}>{t('exercise:execution')}:</span> {legacyText}
            </p>
          )}
          {notes && (
            <p style={{ color: colors.textPrimary }}>
              <span style={{ color: colors.warning }}>{t('common:labels.notes')}:</span> {notes}
            </p>
          )}
        </div>
      )}
    </>
  )
}

export default ExerciseCardNotes
