/**
 * Sanitiza un string para usarlo como nombre de archivo
 * Reemplaza caracteres no alfanuméricos por guiones bajos
 */
export function sanitizeFilename(name) {
  if (!name) return 'file'
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
}
