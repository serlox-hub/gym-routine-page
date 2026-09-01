import { useCallback, useRef, useState } from 'react'
import { useUpdateSetVideo } from './useCompletedSets.js'
import { getNotifier } from '../notifications.js'
import { t } from '../i18n/index.js'

/**
 * Orquesta la subida de vídeo de una serie (web+native, DRY — issue #31). `uploadVideo` es la
 * única pieza específica de plataforma (sube a MinIO); se inyecta por callback, patrón de
 * CLAUDE.md.
 *
 * Dos caminos según si la serie YA está completada en el momento de subir (se decide en cada
 * llamada a `upload`/`retry`, no al montar, porque `isCompleted` cambia a mitad de vida):
 * - **Completada:** el vídeo se adjunta con `updateSetVideo` (UPDATE directo) al terminar,
 *   igual que siempre.
 * - **NO completada (issue #31):** nunca se escribe a `completed_sets` (esa fila puede no
 *   existir todavía). El archivo elegido en la hoja se sube ya mismo a MinIO —eso no depende de
 *   ninguna fila— y la key resultante se guarda en `preCompleteUrl`, solo en memoria. Quien
 *   complete la serie debe leer `preCompleteUrl` y meterlo en el MISMO upsert de completar
 *   (`buildCompletedSetData`/`upsertCompletedSet` ya aceptan `videoUrl`): una sola escritura,
 *   nunca una carrera contra la fila todavía sin crear.
 *
 * `token` descarta resultados de subidas superadas (el usuario elige otro archivo, o lo quita
 * antes de que la subida en vuelo resuelva) — mismo patrón de guard que `weightConversionNonce`.
 */
export function useSetVideoUpload({ sessionExerciseId, setNumber, uploadVideo }) {
  const { mutate: updateSetVideo } = useUpdateSetVideo()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [hasError, setHasError] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [preCompleteUrl, setPreCompleteUrl] = useState(null)
  const tokenRef = useRef(0)

  const upload = useCallback((file, { isCompleted }) => {
    const token = ++tokenRef.current
    setIsUploading(true)
    setProgress(0)
    setHasError(false)
    setPendingFile(file)
    if (isCompleted) setPreCompleteUrl(null)

    uploadVideo(file, setProgress).then(
      (uploadedUrl) => {
        if (token !== tokenRef.current) return
        if (isCompleted) {
          updateSetVideo({ sessionExerciseId, setNumber, videoUrl: uploadedUrl })
          setPendingFile(null)
        } else {
          setPreCompleteUrl(uploadedUrl)
          setPendingFile(null)
        }
        setIsUploading(false)
      },
      (err) => {
        if (token !== tokenRef.current) return
        // eslint-disable-next-line no-console
        console.error('Video upload failed:', err)
        setHasError(true)
        setIsUploading(false)
        getNotifier()?.show(t('workout:set.videoUploadError'), 'error')
      }
    )
  }, [sessionExerciseId, setNumber, updateSetVideo, uploadVideo])

  const retry = useCallback(({ isCompleted }) => {
    if (pendingFile) upload(pendingFile, { isCompleted })
  }, [pendingFile, upload])

  // Descarta un resultado en curso o ya obtenido (el usuario quita el vídeo antes de completar).
  const reset = useCallback(() => {
    tokenRef.current += 1
    setIsUploading(false)
    setProgress(0)
    setHasError(false)
    setPendingFile(null)
    setPreCompleteUrl(null)
  }, [])

  // Quitar un vídeo de una serie YA completada: limpia el estado local y borra en BD. Para una
  // serie sin completar no hace falta (nunca se escribió nada) — ahí basta `reset()`.
  const removeVideo = useCallback(() => {
    reset()
    updateSetVideo({ sessionExerciseId, setNumber, videoUrl: null })
  }, [reset, updateSetVideo, sessionExerciseId, setNumber])

  return { isUploading, progress, hasError, preCompleteUrl, upload, retry, reset, removeVideo }
}
