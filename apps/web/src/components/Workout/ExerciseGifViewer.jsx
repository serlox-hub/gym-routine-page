import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ImageOff } from 'lucide-react'
import { getExerciseGifUrl } from '@gym/shared'
import { Modal, Skeleton } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

/**
 * Visor del GIF de un ejercicio a pantalla completa (tamaño 720).
 * Se abre desde el GIF compacto de la tarjeta de sesión.
 */
function ExerciseGifViewer({ isOpen, onClose, gifKey, exerciseName = '' }) {
  const { t } = useTranslation()
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const url = getExerciseGifUrl(gifKey, 'lg')

  // Reinicia el estado de carga/error cada vez que se abre
  useEffect(() => {
    if (isOpen) {
      setLoaded(false)
      setError(false)
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" className="max-h-[90vh]">
      <div className="flex items-center justify-between gap-3 p-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <h3 className="font-bold truncate min-w-0" style={{ color: colors.textPrimary }}>{exerciseName}</h3>
        <button
          onClick={onClose}
          aria-label={t('common:buttons.close')}
          className="shrink-0"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <X size={20} color={colors.textMuted} />
        </button>
      </div>
      <div className="p-4">
        <div
          className="relative w-full overflow-hidden flex items-center justify-center"
          style={{ aspectRatio: '1 / 1', borderRadius: 16, backgroundColor: colors.gifBg, border: `1px solid ${colors.border}` }}
        >
          {!url || error ? (
            <ImageOff size={48} color={colors.textMuted} aria-label={t('exercise:noAnimation')} />
          ) : (
            <>
              {!loaded && (
                <Skeleton width="100%" height="100%" borderRadius={16} style={{ position: 'absolute', inset: 0 }} />
              )}
              <img
                src={url}
                alt={exerciseName}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity: loaded ? 1 : 0,
                  transition: 'opacity 0.2s',
                }}
              />
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default ExerciseGifViewer
