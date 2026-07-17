import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { X, ImageOff } from 'lucide-react-native'
import { getExerciseGifUrl } from '@gym/shared'
import { Modal, Skeleton } from '../ui'
import { colors } from '../../lib/styles'

/**
 * Visor del GIF de un ejercicio a pantalla completa (tamaño 720).
 * Se abre desde el GIF compacto de la tarjeta de sesión.
 */
function ExerciseGifViewer({ isOpen, onClose, gifKey, exerciseName = '' }) {
  const { t } = useTranslation()
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const url = getExerciseGifUrl(gifKey, 'lg')

  useEffect(() => {
    if (isOpen) {
      setLoaded(false)
      setError(false)
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-4">
      <View className="flex-row items-center justify-between gap-3 mb-3">
        <Text className="font-bold text-base flex-1" numberOfLines={1} style={{ color: colors.textPrimary }}>
          {exerciseName}
        </Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common:buttons.close')} hitSlop={8}>
          <X size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      <View
        style={{
          aspectRatio: 1,
          width: '100%',
          borderRadius: 16,
          backgroundColor: colors.gifBg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!url || error ? (
          <ImageOff size={48} color={colors.textMuted} accessibilityLabel={t('exercise:noAnimation')} />
        ) : (
          <>
            {!loaded && (
              <Skeleton borderRadius={16} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            )}
            <Image
              source={{ uri: url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              transition={150}
              cachePolicy="memory-disk"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              accessibilityLabel={exerciseName}
            />
          </>
        )}
      </View>
    </Modal>
  )
}

export default ExerciseGifViewer
