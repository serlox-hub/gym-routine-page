// Re-export pure parts from shared for backward compatibility
export { ROUTINE_JSON_FORMAT, ROUTINE_JSON_RULES, buildChatbotPrompt, buildAdaptRoutinePrompt } from '@gym/shared'

// Re-export DB functions now living in shared
export { exportRoutine, importRoutine, duplicateRoutine } from '@gym/shared'

/**
 * Descarga la rutina como archivo JSON
 */
export function downloadRoutineAsJson(data, filename) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Lee un archivo JSON
 */
export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        resolve(data)
      } catch {
        reject(new Error('Error al leer el archivo JSON'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsText(file)
  })
}
