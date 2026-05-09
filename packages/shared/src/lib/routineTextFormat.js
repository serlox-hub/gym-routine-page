import { APP_URL, BLOCK_NAMES } from './constants.js'
import { t } from '../i18n/index.js'

/**
 * Formatea una rutina exportada (objeto que devuelve exportRoutine) como
 * texto markdown ligero, listo para copiar a un chat.
 *
 * @param {object} exportData - Objeto con shape {routine: {name, description, days}}
 * @returns {string}
 */
export function formatRoutineAsText(exportData) {
  if (!exportData?.routine) return ''
  const { routine } = exportData
  const lines = []

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
        lines.push(formatExerciseLine(ex))
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

function formatExerciseLine(exercise) {
  const parts = [`${exercise.series}×${exercise.reps}`]
  if (exercise.rir != null) parts.push(`RIR ${exercise.rir}`)
  if (exercise.rest_seconds) parts.push(formatRest(exercise.rest_seconds))
  return `- ${exercise.exercise_name} · ${parts.join(' · ')}`
}

function formatRest(seconds) {
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} min desc`
  return `${seconds}s desc`
}
