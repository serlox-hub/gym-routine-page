import { useTranslation } from 'react-i18next'
import { Trophy, Video } from 'lucide-react'
import { formatEffortBadge, formatSetValue } from '@gym/shared'
import { colors } from '../../lib/styles.js'
import { IconButton, NoteIcon } from '../ui/index.js'
import SetNumberMark from './SetNumberMark.jsx'

// A set already done, read only. The one row of the exercise history and of History's session
// detail: two copies of it drifted apart in height (#185 fixed one, #187 the other).
function HistorySetRow({ set, weightUnit, distanceUnit, trackedFields, isPR = false, onSelectSet }) {
  const { t } = useTranslation()
  const handleSelect = (e) => { e.stopPropagation(); e.preventDefault(); onSelectSet(set) }

  return (
    // As tall as the note and video buttons, so a set without them is as tall as one with them.
    <div className="flex items-center gap-3 min-h-11" style={{ fontSize: 13 }}>
      <SetNumberMark setNumber={set.set_number} setType={set.set_type} isPR={isPR} style={{ width: 14, textAlign: 'right' }} />
      <span className="flex-1 flex items-center gap-2" style={{ color: colors.textPrimary }}>
        {formatSetValue({ ...set, weight_unit: weightUnit }, { distanceUnit })}
        {isPR && (
          <span className="inline-flex items-center gap-0.5" style={{ color: colors.warning, fontSize: 10, fontWeight: 600 }}>
            <Trophy size={10} /> {t('workout:summary.pr')}
          </span>
        )}
      </span>
      <div className="flex items-center gap-0.5">
        {set.notes && (
          <IconButton icon={NoteIcon} iconSize={14} color={colors.textMuted} label={t('workout:set.notes')} onClick={handleSelect} />
        )}
        {set.video_url && (
          <IconButton icon={Video} iconSize={14} color={colors.textMuted} label={t('workout:set.video')} onClick={handleSelect} />
        )}
        {set.rir_actual !== null && set.rir_actual !== undefined && (
          <span style={{ color: colors.textMuted, fontSize: 12, minWidth: 16, textAlign: 'center', whiteSpace: 'nowrap' }}>
            {formatEffortBadge(set.rir_actual, trackedFields)}
          </span>
        )}
      </div>
    </div>
  )
}

export default HistorySetRow
