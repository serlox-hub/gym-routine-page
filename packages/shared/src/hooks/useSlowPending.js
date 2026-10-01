import { useState, useEffect } from 'react'

// Well above a normal round trip, well below the auth client's 30 s refresh retry window (issue #121).
export const SLOW_PENDING_MS = 5000

/**
 * @param {boolean} isPending
 * @param {number} [thresholdMs=SLOW_PENDING_MS]
 * @returns {boolean} true once isPending has stayed true for thresholdMs; false again as soon as isPending is false
 */
export function useSlowPending(isPending, thresholdMs = SLOW_PENDING_MS) {
  const [isSlow, setIsSlow] = useState(false)

  useEffect(() => {
    if (!isPending) return
    const timer = setTimeout(() => setIsSlow(true), thresholdMs)
    return () => {
      clearTimeout(timer)
      setIsSlow(false)
    }
  }, [isPending, thresholdMs])

  // `isPending &&`: false in the very render where pending ends, before the cleanup resets it.
  return isPending && isSlow
}
