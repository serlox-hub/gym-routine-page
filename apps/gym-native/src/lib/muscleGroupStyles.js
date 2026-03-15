import { getMuscleGroupColor } from '@gym/shared'

export function getMuscleGroupBorderStyle(name) {
  return { borderLeftWidth: 3, borderLeftColor: getMuscleGroupColor(name) }
}
