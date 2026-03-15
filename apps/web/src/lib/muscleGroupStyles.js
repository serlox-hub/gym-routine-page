import { getMuscleGroupColor } from '@gym/shared'

export function getMuscleGroupBorderStyle(name) {
  return { borderLeftWidth: '3px', borderLeftColor: getMuscleGroupColor(name) }
}
