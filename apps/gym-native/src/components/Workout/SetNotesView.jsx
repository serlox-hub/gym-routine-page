import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Modal } from '../ui'
import VideoPlayer from '../ui/VideoPlayer'
import { RIR_LABELS } from '@gym/shared'
import { colors } from '../../lib/styles'

export default function SetNotesView({ isOpen, onClose, rir, notes, videoUrl }) {
  const { t } = useTranslation()
  const rirInfo = rir != null ? RIR_LABELS[rir] : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-primary font-bold">{t('workout:set.notes')}</Text>
        <Pressable onPress={onClose}>
          <Text className="text-xl" style={{ color: colors.textSecondary }}>✕</Text>
        </Pressable>
      </View>

      <View className="gap-3">
        {rirInfo && (
          <View
            className="flex-row items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <View
              className="w-10 h-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: colors.purple }}
            >
              <Text className="text-lg font-bold" style={{ color: colors.bgPrimary }}>
                {rirInfo.label}
              </Text>
            </View>
            <View>
              <Text className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                RIR {rirInfo.label}
              </Text>
              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                {rirInfo.description}
              </Text>
            </View>
          </View>
        )}

        {notes && (
          <View className="p-3 rounded-lg" style={{ backgroundColor: colors.bgTertiary }}>
            <Text className="text-xs mb-1" style={{ color: colors.textSecondary }}>{t('common:labels.notes')}</Text>
            <Text className="text-sm" style={{ color: colors.textPrimary }}>{notes}</Text>
          </View>
        )}

        {videoUrl && <VideoPlayer videoKey={videoUrl} />}
      </View>

      <Pressable
        onPress={onClose}
        className="mt-4 py-2 rounded-lg items-center"
        style={{ backgroundColor: colors.bgTertiary }}
      >
        <Text className="text-sm font-medium" style={{ color: colors.textSecondary }}>
          {t('common:buttons.close')}
        </Text>
      </Pressable>
    </Modal>
  )
}
