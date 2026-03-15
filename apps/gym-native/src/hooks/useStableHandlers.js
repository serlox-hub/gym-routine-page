import { useRef, useMemo } from 'react'

/**
 * Returns an object of stable callback references that always call
 * the latest version of each handler. Useful for passing callbacks
 * to memoized children without breaking shallow comparison.
 *
 * @param {Record<string, Function>} handlers - Object of handler functions
 * @returns {Record<string, Function>} Object with same keys but stable references
 */
export function useStableHandlers(handlers) {
  const ref = useRef(handlers)
  ref.current = handlers

  return useMemo(() => {
    const stable = {}
    for (const key of Object.keys(handlers)) {
      stable[key] = (...args) => ref.current[key](...args)
    }
    return stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
