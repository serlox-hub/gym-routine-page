import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Maximize2, ImageOff } from 'lucide-react'
import { getExerciseGifUrl } from '@gym/shared'
import { colors } from '../../lib/styles.js'
import { Skeleton } from '../ui/index.js'

/**
 * GIF de un ejercicio enmarcado en un panel claro (los GIFs de Gym Visual
 * vienen sobre fondo blanco). Si no hay animación (gif_key null) o la carga
 * falla, muestra un tile neutro no interactivo (nunca skeleton infinito).
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

  const frameStyle = {
    width: dimension,
    height: dimension,
    borderRadius: 12,
    backgroundColor: colors.gifBg,
    border: `1px solid ${colors.border}`,
  }

  // Sin GIF o fallo de carga → tile neutro (no interactivo, no hay nada que ampliar)
  if (!url || error) {
    return (
      <div
        className="shrink-0 flex items-center justify-center"
        style={frameStyle}
        aria-label={t('exercise:noAnimation')}
        title={t('exercise:noAnimation')}
      >
        <ImageOff size={Math.round(dimension * 0.3)} color={colors.textMuted} />
      </div>
    )
  }

  const clickable = typeof onExpand === 'function'
  const Tag = clickable ? 'button' : 'div'

  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={clickable ? onExpand : undefined}
      className="relative shrink-0 overflow-hidden"
      style={{ ...frameStyle, padding: 0, cursor: clickable ? 'zoom-in' : 'default' }}
      aria-label={clickable ? t('exercise:expandGif') : alt}
    >
      {!loaded && (
        <Skeleton width="100%" height="100%" borderRadius={12} style={{ position: 'absolute', inset: 0 }} />
      )}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
      {clickable && (
        <span
          className="absolute flex items-center justify-center"
          style={{ bottom: 4, left: 4, width: 20, height: 20, borderRadius: 6, backgroundColor: colors.overlay }}
        >
          <Maximize2 size={11} color={colors.white} />
        </span>
      )}
    </Tag>
  )
}

export default ExerciseGif
