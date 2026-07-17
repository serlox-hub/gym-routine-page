import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Maximize2, ImageOff } from 'lucide-react-native'
import { getExerciseGifUrl } from '@gym/shared'
import { colors } from '../../lib/styles'
import { Skeleton } from '../ui'

/**
 * GIF de un ejercicio enmarcado en un panel claro (los GIFs de Gym Visual
 * vienen sobre fondo blanco). Si no hay animación (gif_key null) o la carga
 * falla, muestra un tile neutro no interactivo (nunca skeleton infinito).
 * expo-image anima los GIFs por defecto (también en Android). Ver issue #6.
 * Si se pasa onExpand, actúa como botón para abrir el visor a pantalla completa.
 */
function ExerciseGif({ gifKey, size = 'sm', alt = '', onExpand, dimension = 96 }) {
  const { t } = useTranslation()
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const url = getExerciseGifUrl(gifKey, size)

  // Resetea el estado si cambia el GIF en la misma instancia (reutilización sin remontar)
  useEffect(() => {
    setLoaded(false)
    setError(false)
  }, [url])

  const frame = {
    width: dimension,
    height: dimension,
    borderRadius: 12,
    backgroundColor: colors.gifBg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  }

  // Sin GIF o fallo de carga → tile neutro (no interactivo, no hay nada que ampliar)
  if (!url || error) {
    return (
      <View accessibilityLabel={t('exercise:noAnimation')} style={{ ...frame, alignItems: 'center', justifyContent: 'center' }}>
        <ImageOff size={Math.round(dimension * 0.3)} color={colors.textMuted} />
      </View>
    )
  }

  const clickable = typeof onExpand === 'function'

  const content = (
    <View style={frame}>
      {!loaded && (
        <Skeleton borderRadius={12} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      )}
      <Image
        source={{ uri: url }}
        style={{ width: '100%', height: '100%' }}
        contentFit="contain"
        transition={150}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        accessibilityLabel={alt}
      />
      {clickable && (
        <View
          style={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            width: 20,
            height: 20,
            borderRadius: 6,
            backgroundColor: colors.overlay,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Maximize2 size={11} color={colors.white} />
        </View>
      )}
    </View>
  )

  if (!clickable) return content

  return (
    <Pressable onPress={onExpand} accessibilityRole="button" accessibilityLabel={t('exercise:expandGif')}>
      {content}
    </Pressable>
  )
}

export default ExerciseGif
