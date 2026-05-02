import { useState, useEffect } from 'react'
import { useWorkoutStore } from './_stores.js'
import { formatElapsedSeconds } from '../lib/timeUtils.js'

/**
 * Returns elapsed time of the current workout session formatted as MM:SS or H:MM:SS.
 * Updates every second.
 */
export function useSessionTimer() {
  const startedAt = useWorkoutStore(state => state.startedAt)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) return
    const startTime = new Date(startedAt).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - startTime) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return { elapsed, formatted: formatElapsedSeconds(elapsed) }
}
