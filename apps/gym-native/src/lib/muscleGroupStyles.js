import { getMuscleGroupColor } from '@gym/shared'

export function getMuscleGroupBorderStyle(name) {
  return { borderLeftWidth: 4, borderLeftColor: getMuscleGroupColor(name) }
}
