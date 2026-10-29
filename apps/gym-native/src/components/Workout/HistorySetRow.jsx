import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { FileText, Trophy, Video } from 'lucide-react-native'
import { formatEffortBadge, formatSetValue } from '@gym/shared'
import { colors, design } from '../../lib/styles'
import { IconButton } from '../ui'
import SetNumberMark from './SetNumberMark'

// A set already done, read only. The one row of the exercise history and of History's session
// detail: two copies of it drifted apart in height (#185 fixed one, #187 the other).
function HistorySetRow({ set, weightUnit, distanceUnit, trackedFields, isPR = false, onSelectSet }) {
  const { t } = useTranslation()

  return (
    // As tall as the note and video buttons, so a set without them is as tall as one with them.
    <View style={{ minHeight: design.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <SetNumberMark setNumber={set.set_number} setType={set.set_type} isPR={isPR} style={{ width: 14, textAlign: 'right' }} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 13 }}>
          {formatSetValue({ ...set, weight_unit: weightUnit }, { distanceUnit })}
        </Text>
        {isPR && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Trophy size={10} color={colors.warning} />
            <Text style={{ color: colors.warning, fontSize: 10, fontWeight: '600' }}>{t('workout:summary.pr')}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {set.notes && (
          <IconButton icon={FileText} iconSize={14} color={colors.textMuted} label={t('workout:set.notes')} onPress={() => onSelectSet(set)} />
        )}
        {set.video_url && (
          <IconButton icon={Video} iconSize={14} color={colors.textMuted} label={t('workout:set.video')} onPress={() => onSelectSet(set)} />
        )}
        {set.rir_actual !== null && set.rir_actual !== undefined && (
          <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12, minWidth: 16, textAlign: 'center' }}>
            {formatEffortBadge(set.rir_actual, trackedFields)}
          </Text>
        )}
      </View>
    </View>
  )
}

export default HistorySetRow
