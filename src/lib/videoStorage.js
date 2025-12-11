import { supabase } from './supabase.js'

const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

/**
 * Sube un video a MinIO a través de Edge Function
 * @param {File} file - Archivo de video a subir
 * @returns {Promise<string>} Key del video subido
 */
export async function uploadVideo(file) {
  if (!file.type.startsWith('video/') && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    throw new Error('El archivo debe ser un video')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El video no puede superar los 200MB')
  }

  // 1. Obtener presigned URL desde Edge Function
  const { data, error } = await supabase.functions.invoke('video-upload', {
    body: {
      filename: file.name,
      contentType: file.type,
    },
  })

  if (error) {
    throw new Error('Error al obtener URL de subida')
  }

  const { uploadUrl, key } = data

  // 2. Subir directamente a MinIO
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  })

  if (!uploadResponse.ok) {
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
