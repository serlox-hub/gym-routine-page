import { APP_URL, BLOCK_NAMES } from './constants.js'
import { formatEffortBadge } from './measurementTypes.js'
import { t } from '../i18n/index.js'

/**
 * Formatea una rutina exportada (objeto que devuelve exportRoutine) como
 * texto markdown ligero, listo para copiar a un chat.
 *
 * @param {object} exportData - Objeto con shape {routine: {name, description, days}, exercises}
 * @returns {string}
 */
export function formatRoutineAsText(exportData) {
  if (!exportData?.routine) return ''
  const { routine } = exportData
  const lines = []

  // El ejercicio dentro de `blocks` solo trae el nombre; el tipo de medición (que decide la escala
  // de esfuerzo) vive en el catálogo del propio export, emparejado por `name_es` = `exercise_name`.
  // Si dos ejercicios comparten `name_es` (custom + sistema) gana el último: asumido, el import
  // solo crea un custom cuando no hay match, así que la colisión es marginal.
  const measurementTypeByName = new Map(
    (exportData.exercises || []).map(ex => [ex.name_es, ex.measurement_type])
  )

  lines.push(`*${routine.name}*`)
  if (routine.description) lines.push(routine.description)

  const days = (routine.days || []).slice().sort((a, b) => a.sort_order - b.sort_order)

  for (const day of days) {
    lines.push('')
    lines.push(formatDayHeading(day))

    const blocks = (day.blocks || []).slice().sort((a, b) => a.sort_order - b.sort_order)
    const hasWarmup = blocks.some(b => b.name === BLOCK_NAMES.WARMUP && b.exercises?.length)
    const hasMain = blocks.some(b => b.name === BLOCK_NAMES.MAIN && b.exercises?.length)
    const showHeadings = hasWarmup && hasMain

    for (const block of blocks) {
      if (!block.exercises?.length) continue
      if (showHeadings) {
        lines.push('')
        lines.push(`${formatBlockName(block.name)}:`)
      }
      for (const ex of block.exercises) {
        lines.push(formatExerciseLine(ex, measurementTypeByName.get(ex.exercise_name)))
      }
    }
  }

  lines.push('')
  lines.push(t('routine:createdWithApp', { appUrl: APP_URL }))

  return lines.join('\n')
}

function formatDayHeading(day) {
  const parts = [`📅 *${day.name}*`]
  if (day.estimated_duration_min) {
    parts.push(`${day.estimated_duration_min} min`)
  }
  return parts.join(' · ')
}

function formatBlockName(name) {
  if (name === BLOCK_NAMES.WARMUP) return t('routine:block.warmup')
  if (name === BLOCK_NAMES.MAIN) return t('routine:block.main')
  return name
}

function formatExerciseLine(exercise, measurementType) {
  const parts = [`${exercise.series}×${exercise.reps}`]
  if (exercise.rir != null) parts.push(formatEffortBadge(exercise.rir, measurementType))
  if (exercise.rest_seconds) parts.push(formatRest(exercise.rest_seconds))
  return `- ${exercise.exercise_name} · ${parts.join(' · ')}`
}

function formatRest(seconds) {
  if (seconds >= 60 && seconds % 60 === 0) return t('routine:share.restMin', { minutes: seconds / 60 })
  return t('routine:share.restSec', { seconds })
}
