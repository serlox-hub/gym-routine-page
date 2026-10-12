import { useCallback, useEffect, useMemo } from 'react'
import { SYNC_RETRY_INTERVAL_MS } from '../lib/constants.js'
import { countPendingSets, drainPendingSets } from '../lib/pendingSetsSync.js'
import { useWorkoutStore, getWorkoutStore } from './_stores.js'
import { getHaptics } from '../haptics.js'
import { createSetKey } from '../lib/setUtils.js'

// ============================================
// SET MUTATIONS
// ============================================
// Every change to a set of the active session does two things: update the store, then mark the
// set in the sync queue and kick the drainer (lib/pendingSetsSync.js), the only path a set takes
// to the server. `mutate` keeps the name the callers use, but it is synchronous and cannot fail:
// a send that fails stays queued.

function syncSet(sessionExerciseId, setNumber) {
  getWorkoutStore().getState().markSetDirty(sessionExerciseId, setNumber)
  drainPendingSets()
}

// An edit of a set that is not completed changed nothing in the store, so there is nothing to sync.
function syncCompletedSet(sessionExerciseId, setNumber) {
  if (!getWorkoutStore().getState().completedSets[createSetKey(sessionExerciseId, setNumber)]) return
  syncSet(sessionExerciseId, setNumber)
}

export function useCompleteSet() {
  const completeSet = useWorkoutStore(state => state.completeSet)

  const mutate = useCallback((variables) => {
    completeSet(variables.sessionExerciseId, variables.setNumber, {
      weight: variables.weight,
      weightUnit: variables.weightUnit,
      repsCompleted: variables.repsCompleted,
      timeSeconds: variables.timeSeconds,
      distanceMeters: variables.distanceMeters,
      paceSeconds: variables.paceSeconds,
      level: variables.level,
      caloriesBurned: variables.caloriesBurned,
      rirActual: variables.rirActual,
      notes: variables.notes,
      videoUrl: variables.videoUrl,
      setType: variables.setType,
      dbId: null, // Until the server answers
    })
    getHaptics()?.onSetComplete?.()
    syncSet(variables.sessionExerciseId, variables.setNumber)
  }, [completeSet])

  return useMemo(() => ({ mutate }), [mutate])
}

// Persist an in-place edit of an already-completed set's measurement values
// (weight/reps/time/...) without uncompleting it. No rest timer, no completion
// haptic — this is an edit, not a completion.
export function useUpdateCompletedSet() {
  const updateCompletedSetValues = useWorkoutStore(state => state.updateCompletedSetValues)

  const mutate = useCallback((variables) => {
    updateCompletedSetValues(variables.sessionExerciseId, variables.setNumber, {
      weight: variables.weight,
      repsCompleted: variables.repsCompleted,
      timeSeconds: variables.timeSeconds,
      distanceMeters: variables.distanceMeters,
      paceSeconds: variables.paceSeconds,
      level: variables.level,
      caloriesBurned: variables.caloriesBurned,
    })
    syncCompletedSet(variables.sessionExerciseId, variables.setNumber)
  }, [updateCompletedSetValues])

  return useMemo(() => ({ mutate }), [mutate])
}

// The video, the effort, the notes and the set type go out in the queued upsert too, which carries
// the store's whole set. A separate UPDATE would hit no row while the set's upsert is still queued,
// and could land after a newer upsert and write the old value back.
export function useUpdateSetVideo() {
  const updateSetVideoStore = useWorkoutStore(state => state.updateSetVideo)

  const mutate = useCallback(({ sessionExerciseId, setNumber, videoUrl }) => {
    updateSetVideoStore(sessionExerciseId, setNumber, videoUrl)
    syncCompletedSet(sessionExerciseId, setNumber)
  }, [updateSetVideoStore])

  return useMemo(() => ({ mutate }), [mutate])
}

export function useUpdateSetDetails() {
  const updateSetDetails = useWorkoutStore(state => state.updateSetDetails)

  const mutate = useCallback(({ sessionExerciseId, setNumber, rirActual, notes, videoUrl, setType }) => {
    updateSetDetails(sessionExerciseId, setNumber, { rirActual, notes, videoUrl, setType })
    syncCompletedSet(sessionExerciseId, setNumber)
  }, [updateSetDetails])

  return useMemo(() => ({ mutate }), [mutate])
}

// Unchecking is local at once, like checking: the queue sends the delete when it can.
export function useUncompleteSet() {
  const uncompleteSet = useWorkoutStore(state => state.uncompleteSet)

  const mutate = useCallback(({ sessionExerciseId, setNumber }) => {
    uncompleteSet(sessionExerciseId, setNumber)
    syncSet(sessionExerciseId, setNumber)
  }, [uncompleteSet])

  return useMemo(() => ({ mutate }), [mutate])
}

// ============================================
// SYNC TRIGGERS
// ============================================

/**
 * Drains the queue while it holds sets a drain will still try: every SYNC_RETRY_INTERVAL_MS, when
 * the app comes back to the foreground and when the connection returns (callbacks injected per
 * platform). Every change already drains at once; this is what catches up after a failure.
 * @returns {number} queued sets not marked `failed`
 */
export function useSyncPendingSets({ onVisibilityChange, onConnectivityChange } = {}) {
  const sessionId = useWorkoutStore(state => state.sessionId)
  const sendableCount = useWorkoutStore(state => countPendingSets(state.pendingSets).sendable)

  useEffect(() => {
    if (!sessionId || sendableCount === 0) return
    drainPendingSets()
    const interval = setInterval(drainPendingSets, SYNC_RETRY_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [sessionId, sendableCount])

  useEffect(() => {
    if (!onVisibilityChange) return
    return onVisibilityChange(drainPendingSets)
  }, [onVisibilityChange])

  useEffect(() => {
    if (!onConnectivityChange) return
    return onConnectivityChange(drainPendingSets)
  }, [onConnectivityChange])

  return sendableCount
}
