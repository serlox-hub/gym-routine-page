import { supabase } from './supabase.js'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB (límite de Cloudflare free)
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

/**
 * Sube un video a MinIO a través de Edge Function
 * @param {File} file - Archivo de video a subir
 * @param {function} onProgress - Callback con el porcentaje de progreso (0-100)
 * @returns {Promise<string>} Key del video subido
 */
export async function uploadVideo(file, onProgress) {
  if (!file.type.startsWith('video/') && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    throw new Error('El archivo debe ser un video')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El video no puede superar los 100MB')
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

  // 2. Subir directamente a MinIO con progreso
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100)
        onProgress(percent)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(key)
      } else {
        reject(new Error(`Error al subir el video: ${xhr.status} ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Error de red al subir el video'))
    })

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
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
