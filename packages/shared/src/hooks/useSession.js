import { useRef, useEffect, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, SYNC_RETRY_INTERVAL_MS } from '../lib/constants.js'
import { resolveTrackedFields } from '../lib/measurementFields.js'
import { planSessionWeightConversion, resolveUnitsForExercises, buildGymChangeJob, pickGymUnitOverrides } from '../lib/sessionGymChange.js'
import {
  buildSessionExercisesCache,
  buildSessionExercisesFromBlocks,
  buildCompletedSetsMap,
} from '../lib/workoutTransforms.js'
import {
  calculateSessionExerciseStats,
  detectNewPersonalRecords,
  mergeExerciseStats,
} from '../lib/sessionStatsCalculation.js'
import {
  fetchActiveSession,
  fetchCompletedSetsForSession,
  startWorkoutSession,
  fetchExerciseIdsWithSets,
  deleteSessionExercisesWithoutSets,
  completeWorkoutSession,
  deleteWorkoutSession,
} from '../api/workoutApi.js'
import {
  fetchExerciseBests,
  upsertExerciseSessionStats,
} from '../api/exerciseStatsApi.js'
import { fetchSessionExercises } from '../api/sessionExercisesApi.js'
import { changeSessionGym } from '../api/gymsApi.js'
import { useWorkoutStore, getWorkoutStore } from './_stores.js'
import { useUserId } from './useAuth.js'
import { usePreference } from './usePreferences.js'
import { useSetSelectedGym } from './useGyms.js'
import { useAllUserExerciseGymUnits } from './useExercises.js'
import { getNotifier } from '../notifications.js'
import { t } from '../i18n/index.js'

// ============================================
// SESSION RESTORATION
// ============================================

export function useRestoreActiveSession({ onVisibilityChange } = {}) {
  const restoreSession = useWorkoutStore(state => state.restoreSession)
  const endSession = useWorkoutStore(state => state.endSession)

  const syncRef = useRef()
  syncRef.current = async () => {
    try {
      const activeSession = await fetchActiveSession()
      const localSessionId = getWorkoutStore().getState().sessionId

      if (!localSessionId) {
        if (!activeSession) return
        const rawSets = await fetchCompletedSetsForSession(activeSession.id)
        const completedSets = buildCompletedSetsMap(rawSets)
        restoreSession({
          sessionId: activeSession.id,
          routineDayId: activeSession.routine_day_id,
          routineId: activeSession.routine_days?.routine_id || null,
          gymId: activeSession.gym_id ?? null,
          startedAt: activeSession.started_at,
          completedSets,
          cachedSetData: completedSets,
        })
      } else if (!activeSession || activeSession.id !== localSessionId) {
        endSession()
      }
    } catch {
      // Error de red — no tocar el estado local para no perder datos
    }
  }

  useEffect(() => {
    syncRef.current()

    if (!onVisibilityChange) return
    const cleanup = onVisibilityChange(() => syncRef.current())
    return cleanup
  }, [onVisibilityChange])
}

// ============================================
// SESSION MUTATIONS
// ============================================

export function useStartSession({ onStartError } = {}) {
  const queryClient = useQueryClient()
  const startSession = useWorkoutStore(state => state.startSession)

  return useMutation({
    mutationFn: async ({ routineDayId = null, routineName = null, dayName = null, blocks = [], exercises: providedExercises = null, gymId = null } = {}) => {
      const exercises = providedExercises ?? buildSessionExercisesFromBlocks(blocks)
      return startWorkoutSession({ routineDayId, routineName, dayName, exercises, gymId })
    },
    onSuccess: (data, { routineDayId = null, routineId = null, blocks = [], gymId = null } = {}) => {
      startSession(data.id, routineDayId, routineId, data.gym_id ?? gymId ?? null)

      // Solo cacheamos si venimos de una rutina (blocks). Al copiar desde el
      // histórico no hay blocks, así que la pantalla de sesión hará fetch.
      if (data.session_exercises?.length > 0 && blocks.length > 0) {
        const cacheData = buildSessionExercisesCache(data.session_exercises, blocks)
        queryClient.setQueryData([QUERY_KEYS.SESSION_EXERCISES, data.id], cacheData)
      }

      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_SESSION] })
    },
    onError: () => {
      onStartError?.()
    },
  })
}

export function useEndSession({ onSuccess: onSuccessCb } = {}) {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const startedAt = useWorkoutStore(state => state.startedAt)
  const gymId = useWorkoutStore(state => state.gymId)
  const endSession = useWorkoutStore(state => state.endSession)
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ overallFeeling, notes }) => {
      // Capturar sets del store antes de que se limpie
      const completedSets = getWorkoutStore().getState().completedSets

      // Eliminar session_exercises sin series completadas
      const exerciseIdsWithSets = await fetchExerciseIdsWithSets(sessionId)

      if (exerciseIdsWithSets.length > 0) {
        await deleteSessionExercisesWithoutSets(sessionId, exerciseIdsWithSets)
      }

      const completedAt = new Date()
      const startedAtDate = new Date(startedAt)
      const durationMinutes = Math.round((completedAt - startedAtDate) / 60000)

      const sessionData = await completeWorkoutSession({
        sessionId,
        completedAt: completedAt.toISOString(),
        durationMinutes,
        overallFeeling,
        notes,
      })

      // Computar exercise_session_stats + detectar PRs
      const detectedPRs = await computeSessionStats({
        sessionId,
        sessionDate: startedAt,
        userId,
        gymId,
        completedSets,
        queryClient,
      })

      return { session: sessionData, detectedPRs }
    },
    onSuccess: (data) => {
      onSuccessCb?.(data)
      // Diferir la limpieza del store para que la transición de navegación del
      // consumer (p.ej. el overlay nativo) se aplique antes de que la UI de sesión
      // se desmonte. Si no, la pantalla de debajo aparece un instante.
      setTimeout(() => {
        endSession()
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_SESSION] })
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_HISTORY] })
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRAINING_GOAL_SESSIONS] })
      }, 0)
    },
  })
}

// ============================================
// CHANGE SESSION GYM (mid-session)
// ============================================

/**
 * Cambio de gym de una sesión EN CURSO, optimista y con detección LOCAL de unidades.
 *
 * La unidad de peso se resuelve por (ejercicio, gym). Si al mover la sesión a otro gym cambia
 * la unidad de algún ejercicio con series de peso ya registradas, se CONVIERTEN esos pesos
 * para preservar el peso real levantado. Todo en local e instantáneo (las unidades vienen
 * prefetcheadas por `useAllUserExerciseGymUnits`, así que funciona offline). La persistencia
 * se encola (`setPendingGymChange`) y la aplica `useSyncPendingGymChange` con el RPC atómico
 * `change_session_gym` y reintentos. Esta función NO hace red.
 *
 * `changeGym(newGymId, gymName)` → nº de series convertidas (0 = cambio sin conversión).
 */
export function useChangeSessionGym() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const currentGymId = useWorkoutStore(state => state.gymId)
  const setSessionGym = useWorkoutStore(state => state.setSessionGym)
  const applyWeightConversions = useWorkoutStore(state => state.applyWeightConversions)
  const setPendingGymChange = useWorkoutStore(state => state.setPendingGymChange)
  const { value: globalWeightUnit } = usePreference('weight_unit')
  const { setSelectedGym } = useSetSelectedGym()
  const { data: gymUnitRows } = useAllUserExerciseGymUnits()

  const changeGym = useCallback((newGymId, gymName) => {
    if (newGymId == null || String(newGymId) === String(currentGymId)) return 0

    const store = getWorkoutStore().getState()
    const completedSets = store.completedSets
    const sessionExercises = queryClient.getQueryData([QUERY_KEYS.SESSION_EXERCISES, sessionId]) || []
    const exerciseIdBySe = {}
    for (const se of sessionExercises) exerciseIdBySe[se.id] = se.exercise_id

    // Ejercicios con series de peso ya registradas
    const exerciseIds = [...new Set(
      Object.values(completedSets)
        .filter(s => s?.weight != null)
        .map(s => exerciseIdBySe[s.sessionExerciseId])
        .filter(id => id != null)
    )]

    // Unidad efectiva por ejercicio en el gym actual y en el destino, resuelta EN LOCAL desde
    // las unidades prefetcheadas (sin red) vía pickGymUnitOverrides(rows, gym) → { exercise_id: unidad }.
    let conversions = []
    if (exerciseIds.length) {
      const rows = gymUnitRows || []
      conversions = planSessionWeightConversion({
        completedSets,
        exerciseIdBySe,
        oldUnitByExercise: resolveUnitsForExercises(exerciseIds, pickGymUnitOverrides(rows, currentGymId), globalWeightUnit),
        newUnitByExercise: resolveUnitsForExercises(exerciseIds, pickGymUnitOverrides(rows, newGymId), globalWeightUnit),
      })
    }

    // Aplicar en local (optimista). applyWeightConversions bumpea el nonce → los SetRow
    // re-siembran su input con el peso ya convertido.
    if (conversions.length) applyWeightConversions(conversions)
    setSessionGym(newGymId)
    setSelectedGym(newGymId)

    // Encolar la persistencia (RPC atómico con reintentos). buildGymChangeJob decide si mandar
    // el snapshot completo de pesos (convergente ante cambios encadenados) o solo el gym.
    setPendingGymChange(buildGymChangeJob({
      gymId: newGymId,
      completedSets: getWorkoutStore().getState().completedSets,
      hasConversions: conversions.length > 0,
      hadPendingWeights: store.pendingGymChange?.weights?.length > 0,
    }))

    if (conversions.length && gymName) {
      getNotifier()?.show(t('workout:session.gymChangeConverted', { gym: gymName }), 'success')
    }
    return conversions.length
  }, [sessionId, currentGymId, globalWeightUnit, gymUnitRows, queryClient, applyWeightConversions, setSessionGym, setSelectedGym, setPendingGymChange])

  return { changeGym }
}

/**
 * Motor de reintentos del cambio de gym pendiente (la UI optimista ya está aplicada en el
 * store). Persiste con el RPC atómico `change_session_gym`; reintenta en intervalo, al
 * reconectar y al volver al primer plano (callbacks inyectados por plataforma). Se monta a
 * nivel de app, como `useSyncPendingSets`.
 */
export function useSyncPendingGymChange({ onConnectivityChange, onVisibilityChange } = {}) {
  const sessionId = useWorkoutStore(state => state.sessionId)
  const pendingGymChange = useWorkoutStore(state => state.pendingGymChange)
  const setPendingGymChange = useWorkoutStore(state => state.setPendingGymChange)
  const syncingRef = useRef(false)

  const sync = useCallback(async () => {
    const state = getWorkoutStore().getState()
    const job = state.pendingGymChange
    if (!job || !state.sessionId || syncingRef.current) return
    syncingRef.current = true
    try {
      await changeSessionGym({ sessionId: state.sessionId, gymId: job.gymId, weights: job.weights || [] })
      // Limpiar solo si no llegó otro cambio mientras sincronizaba (si llegó, se sincroniza luego)
      if (getWorkoutStore().getState().pendingGymChange === job) setPendingGymChange(null)
    } catch {
      // Sigue en cola para el próximo intento
    } finally {
      syncingRef.current = false
    }
  }, [setPendingGymChange])

  // Dispara al aparecer/cambiar el pendiente + reintento periódico mientras siga pendiente
  useEffect(() => {
    if (!sessionId || !pendingGymChange) return
    sync()
    const interval = setInterval(sync, SYNC_RETRY_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [sessionId, pendingGymChange, sync])

  useEffect(() => {
    if (!onVisibilityChange) return
    return onVisibilityChange(sync)
  }, [onVisibilityChange, sync])

  useEffect(() => {
    if (!onConnectivityChange) return
    return onConnectivityChange(sync)
  }, [onConnectivityChange, sync])
}

// ============================================
// SESSION STATS COMPUTATION (internal)
// ============================================

function storeSetToDbFormat(storeSet) {
  return {
    weight: storeSet.weight ?? null,
    reps_completed: storeSet.repsCompleted ?? null,
    time_seconds: storeSet.timeSeconds ?? null,
    distance_meters: storeSet.distanceMeters ?? null,
    pace_seconds: storeSet.paceSeconds ?? null,
  }
}

async function computeSessionStats({ sessionId, sessionDate, userId, gymId = null, completedSets, queryClient }) {
  try {
    // Obtener session_exercises (del cache o fetch)
    let sessionExercises = queryClient.getQueryData([QUERY_KEYS.SESSION_EXERCISES, sessionId])
    if (!sessionExercises) {
      sessionExercises = await fetchSessionExercises(sessionId)
    }
    if (!sessionExercises || sessionExercises.length === 0) return []

    // Agrupar completed sets por sessionExerciseId
    const setsByExercise = {}
    for (const storeSet of Object.values(completedSets)) {
      const seId = storeSet.sessionExerciseId
      if (!setsByExercise[seId]) setsByExercise[seId] = []
      setsByExercise[seId].push(storeSetToDbFormat(storeSet))
    }

    // Mapear sessionExerciseId → exerciseId + campos que mide
    const exerciseMap = {}
    const exerciseIds = []
    const trackedFieldsByExercise = {}
    for (const se of sessionExercises) {
      if (!setsByExercise[se.id]) continue
      const fields = resolveTrackedFields(se.exercise)
      exerciseMap[se.id] = {
        exerciseId: se.exercise_id,
        trackedFields: fields,
      }
      if (!exerciseIds.includes(se.exercise_id)) {
        exerciseIds.push(se.exercise_id)
        trackedFieldsByExercise[se.exercise_id] = fields
      }
    }

    if (exerciseIds.length === 0) return []

    // Calcular stats y obtener bests previos en paralelo
    const statsPerExercise = {}
    for (const [seId, sets] of Object.entries(setsByExercise)) {
      const info = exerciseMap[seId]
      if (!info) continue
      const stats = calculateSessionExerciseStats(sets, info.trackedFields)
      if (!stats) continue

      // Agregar stats por exerciseId (puede haber múltiples sessionExerciseId para el mismo exerciseId)
      if (!statsPerExercise[info.exerciseId]) {
        statsPerExercise[info.exerciseId] = stats
      } else {
        mergeExerciseStats(statsPerExercise[info.exerciseId], stats)
      }
    }

    const previousBests = await fetchExerciseBests(exerciseIds, { gymId })

    // Detectar PRs y preparar filas para upsert
    const statsRows = []
    const allDetectedPRs = []

    for (const exerciseId of exerciseIds) {
      const stats = statsPerExercise[exerciseId]
      if (!stats) continue

      const bests = previousBests[exerciseId] || null
      const { flags, details } = detectNewPersonalRecords(stats, bests, trackedFieldsByExercise[exerciseId])

      statsRows.push({
        userId,
        exerciseId,
        sessionId,
        sessionDate,
        gymId,
        ...stats,
        ...flags,
      })

      if (details.length > 0) {
        const exerciseInfo = sessionExercises.find(se => se.exercise_id === exerciseId)
        allDetectedPRs.push({
          exerciseId,
          exerciseName: exerciseInfo?.exercise?.name || 'Ejercicio',
          details,
        })
      }
    }

    if (statsRows.length > 0) {
      await upsertExerciseSessionStats(statsRows)
    }

    return allDetectedPRs
  } catch {
    // No bloquear el fin de sesión si falla el cálculo de stats
    return []
  }
}

export function useAbandonSession() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const endSession = useWorkoutStore(state => state.endSession)

  return useMutation({
    mutationFn: async () => {
      await deleteWorkoutSession(sessionId)
    },
    onSuccess: () => {
      endSession()
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_SESSION] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES] })
    },
  })
}
