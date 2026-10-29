import { useState, useEffect } from 'react'
import { SLOW_PENDING_MS } from '../lib/constants.js'

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
