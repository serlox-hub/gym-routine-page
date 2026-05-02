import { getMuscleGroupColor } from '@gym/shared'

export function getMuscleGroupBorderStyle(name) {
  return { borderLeftWidth: '4px', borderLeftColor: getMuscleGroupColor(name) }
}
