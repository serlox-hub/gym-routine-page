import { useCallback, useRef } from 'react'

/**
 * A mutation behind a button that creates something, guarded so a tap while one is still in
 * flight does nothing: on a slow connection the user taps again, and each tap would create
 * another copy (issues #173, #174).
 *
 * A ref, not `isPending`: TanStack Query publishes the pending state on a timer, so a second tap
 * right after the first still reads it as false.
 *
 * `run` never rejects. It resolves with the mutation's result, or `undefined` when the tap was
 * dropped or the mutation failed: telling the user is the mutation's `onError`, or the modal that
 * shows `isError` inline.
 *
 * @param {object} mutation - what `useMutation` returns
 * @returns {object} the same mutation plus `run(variables)`
 */
export function useOneAtATimeMutation(mutation) {
  const { mutateAsync } = mutation
  const inFlightRef = useRef(false)

  const run = useCallback(async (variables) => {
    if (inFlightRef.current) return undefined
    inFlightRef.current = true
    try {
      return await mutateAsync(variables)
    } catch {
      return undefined
    } finally {
      inFlightRef.current = false
    }
  }, [mutateAsync])

  return { ...mutation, run }
}
