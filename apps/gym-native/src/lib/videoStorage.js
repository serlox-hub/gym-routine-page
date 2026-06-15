import { File } from 'expo-file-system'
import { createUploadTask } from 'expo-file-system/legacy'
import { supabase } from './supabase'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const STALL_TIMEOUT_MS = 30_000
const STALL_CHECK_INTERVAL_MS = 5_000

/**
 * Sube un video a MinIO a través de Edge Function
 * @param {string} fileUri - URI local del archivo de video
 * @param {function} onProgress - Callback con el porcentaje de progreso (0-100)
 * @returns {Promise<string>} Key del video subido
 */
export async function uploadVideo(fileUri, onProgress) {
  const file = new File(fileUri)

  if (!file.exists) {
    throw new Error('El archivo no existe')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El video no puede superar los 100MB')
  }

  const filename = fileUri.split('/').pop() || 'video.mp4'
  const extension = filename.split('.').pop()?.toLowerCase()
  const contentType = extension === 'mov' ? 'video/quicktime'
    : extension === 'webm' ? 'video/webm'
    : 'video/mp4'

  const { data, error } = await supabase.functions.invoke('video-upload', {
    body: { filename, contentType },
  })

  if (error) {
    throw new Error('Error al obtener URL de subida')
  }

  const { uploadUrl, key } = data

  if (onProgress) onProgress(0)

  return new Promise((resolve, reject) => {
    let lastProgressAt = Date.now()
    let stallTimer = null
    let settled = false

    const uploadTask = createUploadTask(uploadUrl, fileUri, {
      httpMethod: 'PUT',
      headers: { 'Content-Type': contentType },
    }, (progress) => {
      lastProgressAt = Date.now()
      if (onProgress && progress.totalBytesExpectedToSend > 0) {
        const percent = Math.round((progress.totalBytesSent / progress.totalBytesExpectedToSend) * 100)
        onProgress(percent)
      }
    })

    const cleanup = () => {
      settled = true
      if (stallTimer) clearTimeout(stallTimer)
    }

    const checkStall = () => {
      if (settled) return
      if (Date.now() - lastProgressAt > STALL_TIMEOUT_MS) {
        cleanup()
        uploadTask.cancelAsync().catch(() => {})
        reject(new Error('Subida atascada: sin actividad durante 30 segundos'))
        return
      }
      stallTimer = setTimeout(checkStall, STALL_CHECK_INTERVAL_MS)
    }

    stallTimer = setTimeout(checkStall, STALL_CHECK_INTERVAL_MS)

    uploadTask.uploadAsync()
      .then(result => {
        cleanup()
        if (!result || result.status < 200 || result.status >= 300) {
          reject(new Error('Error al subir el video'))
        } else {
          resolve(key)
        }
      })
      .catch(err => {
        cleanup()
        reject(err)
      })
  })
}

/**
 * Obtiene URL firmada para ver un video
 * @param {string} key - Key del video en MinIO
 * @returns {Promise<string>} URL firmada (válida por 1 hora)
 */
export async function getVideoUrl(key) {
  if (!key) return null

  const { data, error } = await supabase.functions.invoke('video-url', {
    body: { key },
  })

  if (error) {
    throw new Error('Error al obtener URL del video')
  }

  return data.url
}
