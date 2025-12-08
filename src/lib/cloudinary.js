const CLOUD_NAME = 'dmyadexpk'
const UPLOAD_PRESET = 'gym-app'
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

/**
 * Sube un video a Cloudinary
 * @param {File} file - Archivo de video a subir
 * @returns {Promise<string>} URL del video subido
 */
export async function uploadVideo(file) {
  if (!file.type.startsWith('video/') && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    throw new Error('El archivo debe ser un video')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El video no puede superar los 100MB')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('resource_type', 'video')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    throw new Error('Error al subir el video')
  }

  const data = await response.json()
  return data.secure_url
}
