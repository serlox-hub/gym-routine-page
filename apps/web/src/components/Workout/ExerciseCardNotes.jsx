import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getExerciseInstructions, getStructuredInstructions, getExerciseName } from '@gym/shared'
import { useUserExerciseOverride } from '../../hooks/useExercises.js'
import { colors } from '../../lib/styles.js'
import ExerciseGif from './ExerciseGif.jsx'
import ExerciseGifViewer from './ExerciseGifViewer.jsx'

function StructuredInstructions({ instructions }) {
  const { t } = useTranslation()
  if (!instructions) return null

  return (
    <div className="space-y-2">
      {instructions.setup && (
        <p className="text-sm" style={{ color: colors.textPrimary }}>
          <span className="font-medium" style={{ color: colors.textSecondary }}>{t('exercise:setup')}: </span>
          {instructions.setup}
        </p>
      )}
      {instructions.execution && (
        <p className="text-sm" style={{ color: colors.textPrimary }}>
          <span className="font-medium" style={{ color: colors.textSecondary }}>{t('exercise:execution')}: </span>
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

function ExerciseCardNotes({ exercise, notes }) {
  const { t } = useTranslation()
  const [showGif, setShowGif] = useState(false)
  const structured = getStructuredInstructions(exercise)
  const legacyText = !structured ? getExerciseInstructions(exercise) : ''
  const { data: override } = useUserExerciseOverride(exercise?.id)
  const personalNotes = override?.notes
  const gifKey = exercise?.gif_key
  const hasInstructions = Boolean(structured || legacyText)

  if (!structured && !legacyText && !notes && !personalNotes && !gifKey) return null

  const exerciseName = getExerciseName(exercise)

  return (
    <div
      className="mt-2 p-3 rounded text-sm space-y-2"
      style={{ backgroundColor: colors.bgAlt, border: `1px solid ${colors.borderSubtle}` }}
    >
      {gifKey && (
        <div className="flex justify-center">
          <ExerciseGif
            gifKey={gifKey}
            size="sm"
            dimension={128}
            alt={t('exercise:gifAlt', { name: exerciseName })}
            onExpand={() => setShowGif(true)}
          />
        </div>
      )}
      {hasInstructions && (
        <div className="space-y-2">
          {structured && <StructuredInstructions instructions={structured} />}
          {legacyText && (
            <p style={{ color: colors.textPrimary, whiteSpace: 'pre-line' }}>
              <span style={{ color: colors.textSecondary }}>{t('exercise:execution')}:</span> {legacyText}
            </p>
          )}
        </div>
      )}
      {personalNotes && (
        <p style={{ color: colors.textPrimary }}>
          <span style={{ color: colors.teal }}>{t('exercise:personalNotes')}:</span> {personalNotes}
        </p>
      )}
      {notes && (
        <p style={{ color: colors.textPrimary }}>
          <span style={{ color: colors.warning }}>{t('exercise:routineComment')}:</span> {notes}
        </p>
      )}
      {gifKey && (
        <ExerciseGifViewer
          isOpen={showGif}
          onClose={() => setShowGif(false)}
          gifKey={gifKey}
          exerciseName={exerciseName}
        />
      )}
    </div>
  )
}

export default ExerciseCardNotes
