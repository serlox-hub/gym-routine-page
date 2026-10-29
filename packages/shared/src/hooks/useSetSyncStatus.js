import { useEffect, useReducer } from 'react'
import { useWorkoutStore } from './_stores.js'
import { createSetKey } from '../lib/setUtils.js'
import {
  getExerciseWaitingSince,
  getMsUntilSyncSlow,
  getSetWaitingSince,
  getSyncStatus,
  hasRejectedExerciseSet,
} from '../lib/pendingSetsSync.js'

// Both hooks select primitives, so a change in another set's entry re-renders nothing here.
// Slow is measured from the queue entry's mark, never from the mount: a set unsaved for minutes
// reads as slow on the first render when its card opens or the app starts (issue #210).

function useSyncStatus(rejected, waitingSince) {
  const [renders, rerender] = useReducer(count => count + 1, 0)
  const now = Date.now()
  // Decided with the render's clock: a render that showed "not slow yet" always gets a timer, even
  // when the threshold passes between the render and the effect (then it fires at once).
  const armed = getMsUntilSyncSlow(waitingSince, now) !== null

  // One timeout for the time left. `renders` re-arms it if it fired before the clock got there.
  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(rerender, getMsUntilSyncSlow(waitingSince, Date.now()) ?? 0)
    return () => clearTimeout(timer)
  }, [waitingSince, armed, renders])

  return getSyncStatus(rejected, waitingSince, now)
}

/** @returns {'none'|'slow'|'rejected'} for one set; re-renders when it turns slow. */
export function useSetSyncStatus(sessionExerciseId, setNumber) {
  const key = createSetKey(sessionExerciseId, setNumber)
  const rejected = useWorkoutStore(state => Boolean(state.pendingSets[key]?.failed))
  const waitingSince = useWorkoutStore(state => getSetWaitingSince(state.pendingSets[key]))
  return useSyncStatus(rejected, waitingSince)
}

/** @returns {'none'|'slow'|'rejected'} worst among the exercise's queued sets. */
export function useExerciseSyncStatus(sessionExerciseId) {
  const rejected = useWorkoutStore(state => hasRejectedExerciseSet(state.pendingSets, sessionExerciseId))
  const waitingSince = useWorkoutStore(state => getExerciseWaitingSince(state.pendingSets, sessionExerciseId))
  return useSyncStatus(rejected, waitingSince)
}
