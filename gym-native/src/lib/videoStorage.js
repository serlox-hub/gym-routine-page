import * as FileSystem from 'expo-file-system'
import { supabase } from './supabase'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

/**
 * Sube un video a MinIO a través de Edge Function
 * @param {string} fileUri - URI local del archivo de video
 * @param {function} onProgress - Callback con el porcentaje de progreso (0-100)
 * @returns {Promise<string>} Key del video subido
 */
export async function uploadVideo(fileUri, onProgress) {
  const fileInfo = await FileSystem.getInfoAsync(fileUri)

  if (!fileInfo.exists) {
    throw new Error('El archivo no existe')
  }

  if (fileInfo.size > MAX_FILE_SIZE) {
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

  const uploadTask = FileSystem.createUploadTask(uploadUrl, fileUri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': contentType },
  }, (progress) => {
    if (onProgress) {
      const percent = Math.round((progress.totalBytesSent / progress.totalBytesExpectedToSend) * 100)
      onProgress(percent)
    }
  })

  const result = await uploadTask.uploadAsync()

  if (!result || result.status < 200 || result.status >= 300) {
    throw new Error('Error al subir el video')
  }

  return key
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
