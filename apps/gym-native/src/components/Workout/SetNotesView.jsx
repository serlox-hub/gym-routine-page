import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Modal } from '../ui'
import VideoPlayer from '../ui/VideoPlayer'
import { colors } from '../../lib/styles'

/**
 * Detalle de una serie ya registrada. `summary`/`effort` (opcionales) muestran su valor completo
 * CON unidades, para no repetir el formateo desde el llamante (ver PreviousSetLine).
 * Sin ellos, la hoja es solo nota + vídeo (resto de llamantes).
 */
export default function SetNotesView({ isOpen, onClose, notes, videoUrl, summary, effort, title }) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-primary font-bold">{title || t('workout:set.notes')}</Text>
        <Pressable onPress={onClose}>
          <Text className="text-xl" style={{ color: colors.textSecondary }}>✕</Text>
        </Pressable>
      </View>

      <View className="gap-3">
        {!!summary && (
          <View className="p-3 rounded-lg" style={{ backgroundColor: colors.bgTertiary }}>
            <Text className="font-semibold" style={{ color: colors.textPrimary }}>{summary}</Text>
            {!!effort && <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>{effort}</Text>}
          </View>
        )}

        {!!notes && (
          <View className="p-3 rounded-lg" style={{ backgroundColor: colors.bgTertiary }}>
            <Text className="text-xs mb-1" style={{ color: colors.textSecondary }}>{t('common:labels.notes')}</Text>
            <Text className="text-sm" style={{ color: colors.textPrimary }}>{notes}</Text>
          </View>
        )}

        {!!videoUrl && <VideoPlayer videoKey={videoUrl} />}
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
