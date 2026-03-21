import { getVolumeZone, getVolumeLandmarks } from './volumeConstants.js'

/**
 * Cuenta series totales por grupo muscular a partir de los bloques de todos los dias.
 * @param {Array<Array<object>>} allDaysBlocks - Array de bloques por dia.
 *   Cada bloque tiene routine_exercises con exercise.muscle_group.name y series.
 * @returns {Record<string, number>} Mapa grupo muscular -> series totales del ciclo
 */
export function countSetsByMuscleGroup(allDaysBlocks) {
  const counts = {}

  for (const blocks of allDaysBlocks) {
    for (const block of blocks || []) {
      for (const re of block.routine_exercises || []) {
        const groupName = re.exercise?.muscle_group?.name
        if (!groupName || groupName === 'Cardio' || groupName === 'Movilidad') continue
        counts[groupName] = (counts[groupName] || 0) + (re.series || 0)
      }
    }
  }

  return counts
}

/**
 * Normaliza series del ciclo a series por semana.
 * @param {Record<string, number>} cycleSets - Series totales del ciclo
 * @param {number} cycleDays - Duracion del ciclo en dias (default 7)
 * @returns {Record<string, number>} Series por semana (redondeado a 1 decimal)
 */
export function normalizeToWeekly(cycleSets, cycleDays = 7) {
  if (cycleDays <= 0) return cycleSets
  if (cycleDays === 7) return cycleSets

  const factor = 7 / cycleDays
  const weekly = {}
  for (const [group, sets] of Object.entries(cycleSets)) {
    weekly[group] = Math.round(sets * factor * 10) / 10
  }
  return weekly
}

/**
 * Genera el resumen de volumen semanal con zona de cada grupo muscular.
 * @param {Record<string, number>} weeklySets - Series por semana por grupo
 * @returns {Array<{ name: string, sets: number, zone: string, landmarks: object }>}
 */
export function buildVolumeSummary(weeklySets) {
  return Object.entries(weeklySets)
    .map(([name, sets]) => ({
      name,
      sets,
      zone: getVolumeZone(name, sets),
      landmarks: getVolumeLandmarks(name),
    }))
    .sort((a, b) => b.sets - a.sets)
}
