import { useRef, useState, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, PR_NOTIFICATION_DURATION_MS } from '../lib/constants.js'
import { computeExercisePRSets, computeExercisePRSetNumbers } from '../lib/sessionStatsCalculation.js'
import { fetchExerciseBests } from '../api/exerciseStatsApi.js'
import { fetchUserExerciseOverride } from '../api/exerciseApi.js'
import { resolveWeightUnit } from '../lib/exerciseUtils.js'
import { t } from '../i18n/index.js'
import { useUserId } from './useAuth.js'
import { useWorkoutStore } from './_stores.js'
import { useSessionExercises } from './useSessionExercises.js'
import { getHaptics } from '../haptics.js'

// ============================================
// REAL-TIME PR DETECTION DURING SESSION
// ============================================

function setsEqual(a, b) {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

/**
 * Detección de PRs en vivo durante la sesión. Trofeo (prSets) y celebración (toast +
 * háptica) se DERIVAN de un único recálculo desde cero de completedSets + bests previos,
 * así que van siempre sincronizados y responden por igual a completar, editar o descompletar.
 *
 * - Trofeo: qué series son PR ahora mismo.
 * - Toast: se dispara cuando una serie TRANSICIONA a PR (completar o editar hacia arriba).
 *   Dedup grow-only (`notifiedKeysRef`) → cada serie celebra una vez por sesión (editar
 *   arriba/abajo no re-spamea; combinado con el debounce de 600ms de la edición, no hay
 *   ráfagas al teclear). Baseline: el primer pase (restaurar sesión) siembra los keys ya
 *   PR en silencio para no reproducir viejos PRs.
 */
export function useSessionPRDetection() {
  const sessionId = useWorkoutStore(state => state.sessionId)
  const gymId = useWorkoutStore(state => state.gymId)
  const completedSets = useWorkoutStore(state => state.completedSets)
  const queryClient = useQueryClient()
  const userId = useUserId()
  const { data: sessionExercises } = useSessionExercises(sessionId)

  // Cache de bests pre-sesión por ejercicio: { [exerciseId]: Promise | bests | 'none' }.
  // Guarda la promesa en vuelo para deduplicar peticiones concurrentes del mismo ejercicio.
  const preSessionBestsRef = useRef({})
  // Keys "sessionExerciseId-setNumber" ya celebrados esta sesión (grow-only, evita re-toast).
  const notifiedKeysRef = useRef(new Set())
  // El primer pase completo solo siembra notifiedKeysRef (no celebra PRs restaurados).
  const hasInitializedRef = useRef(false)

  // Sets que son PR ahora (DERIVADO). El trofeo solo se pinta si la serie está completada.
  const [prSets, setPRSets] = useState(new Set())

  // Latest PR notification (auto-clears)
  const [prNotification, setPRNotification] = useState(null)
  const timerRef = useRef(null)

  const resetPRState = useCallback(() => {
    preSessionBestsRef.current = {}
    notifiedKeysRef.current = new Set()
    hasInitializedRef.current = false
    setPRSets(new Set())
    setPRNotification(null)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  // Bests pre-sesión con cache de promesa compartida (una sola petición por ejercicio).
  // Devuelve el objeto de bests o 'none' (primera vez del ejercicio / sin historial).
  const getPreSessionBests = useCallback(async (exerciseId) => {
    // Devuelve el valor cacheado o la promesa en vuelo; el llamador hace await de ambos.
    // Un fallo transitorio de red se normaliza a 'none' PERO no se cachea (sentinel
    // 'error'): así un blip no desactiva la detección de PR del ejercicio el resto de la
    // sesión; se reintenta en el próximo recálculo (complete/edit, ya debounced).
    const cached = preSessionBestsRef.current[exerciseId]
    if (cached !== undefined) {
      const value = await cached
      return value === 'error' ? 'none' : value
    }

    const promise = fetchExerciseBests([exerciseId], { gymId })
      .then(allBests => allBests[exerciseId] || 'none')
      .catch(() => 'error')
    preSessionBestsRef.current[exerciseId] = promise
    const resolved = await promise
    if (resolved === 'error') {
      if (preSessionBestsRef.current[exerciseId] === promise) {
        delete preSessionBestsRef.current[exerciseId]
      }
      return 'none'
    }
    preSessionBestsRef.current[exerciseId] = resolved
    return resolved
  }, [gymId])

  // Unidad de peso efectiva del ejercicio (override > preferencia global). El override
  // puede no estar en caché si nunca se montó su card → fetch como fallback.
  const resolveExerciseWeightUnit = useCallback(async (exerciseId) => {
    let override = queryClient.getQueryData([QUERY_KEYS.EXERCISES, 'override', exerciseId])
    if (override === undefined) {
      try {
        override = await fetchUserExerciseOverride(exerciseId)
        queryClient.setQueryData([QUERY_KEYS.EXERCISES, 'override', exerciseId], override)
      } catch {
        override = null
      }
    }
    const userPrefs = queryClient.getQueryData([QUERY_KEYS.USER_PREFERENCES, userId])
    return resolveWeightUnit(override, userPrefs)
  }, [queryClient, userId])

  const showPRNotification = useCallback((exerciseName, records) => {
    getHaptics()?.onPRDetected?.()
    setPRNotification({ exerciseName, records, timestamp: Date.now() })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setPRNotification(null), PR_NOTIFICATION_DURATION_MS)
  }, [])

  // Los PRs son POR GIMNASIO (fetchExerciseBests recibe gymId). Si se cambia de gym a
  // mitad de sesión, invalidar todo el estado de PR para recalcular contra el historial
  // del nuevo gym. Debe ir declarado ANTES del efecto de derivación: así resetPRState
  // limpia el cache de bests (síncrono) antes de que la derivación lo relea al re-correr
  // (getPreSessionBests depende de gymId). El siguiente pase re-siembra el baseline en
  // silencio → sin toasts de las series ya hechas.
  useEffect(() => {
    resetPRState()
  }, [gymId, resetPRState])

  // Recálculo del trofeo + disparo de la celebración. Se ejecuta cuando cambian las series
  // completadas (completar, editar in situ o descompletar) o el catálogo de la sesión.
  useEffect(() => {
    if (!sessionId || !sessionExercises) return
    let cancelled = false

    ;(async () => {
      const byExercise = new Map()
      for (const set of Object.values(completedSets)) {
        const list = byExercise.get(set.sessionExerciseId)
        if (list) list.push(set)
        else byExercise.set(set.sessionExerciseId, [set])
      }

      const nextKeys = new Set()
      // Contexto por serie-PR para resolver la notificación de las que transicionen.
      const prContextByKey = new Map()
      for (const [sessionExerciseId, sets] of byExercise) {
        const sessionExercise = sessionExercises.find(se => se.id === sessionExerciseId)
        if (!sessionExercise) continue
        const measurementType = sessionExercise.exercise?.measurement_type || 'weight_reps'
        const preBests = await getPreSessionBests(sessionExercise.exercise_id)
        if (cancelled) return
        if (preBests === 'none') continue

        // Trofeo: solo necesita QUÉ series son PR (sin records ni unidad de peso). Los
        // records con unidad se calculan luego, solo para la serie que se celebre.
        const prSetNumbers = computeExercisePRSetNumbers(sets, preBests, measurementType)
        for (const setNumber of prSetNumbers) {
          const key = `${sessionExerciseId}-${setNumber}`
          nextKeys.add(key)
          prContextByKey.set(key, { sessionExercise, sets, preBests, measurementType, setNumber })
        }
      }
      if (cancelled) return

      setPRSets(prev => (setsEqual(prev, nextKeys) ? prev : nextKeys))

      // Primer pase: sembrar baseline sin celebrar (sesión restaurada con PRs previos).
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true
        notifiedKeysRef.current = new Set(nextKeys)
        return
      }

      // Series que acaban de transicionar a PR y aún no se han celebrado.
      const newlyPR = [...nextKeys].filter(key => !notifiedKeysRef.current.has(key))
      if (newlyPR.length === 0) return

      // Celebrar solo la más reciente (setNumber mayor). Solo aquí resolvemos la unidad de
      // peso (rara vez). En la práctica las series se completan/editan de una en una, así
      // que newlyPR casi siempre tiene 1 elemento; si coincidieran varias en un mismo pase
      // se muestra un único toast (evita ráfagas) y las demás se dan por celebradas.
      const latestKey = [...newlyPR].sort((a, b) => prContextByKey.get(a).setNumber - prContextByKey.get(b).setNumber).pop()
      const ctx = prContextByKey.get(latestKey)
      const weightUnit = await resolveExerciseWeightUnit(ctx.sessionExercise.exercise_id)
      // Un pase cancelado (edición encadenada) no debe tocar notifiedKeysRef ni notificar:
      // dejaría series marcadas como celebradas sin haber mostrado el toast.
      if (cancelled) return
      for (const key of newlyPR) notifiedKeysRef.current.add(key)
      const records = computeExercisePRSets(ctx.sets, ctx.preBests, ctx.measurementType, weightUnit)
        .find(r => r.setNumber === ctx.setNumber)?.records
      if (records?.length) {
        showPRNotification(ctx.sessionExercise.exercise?.name || t('workout:pr.exerciseFallback'), records)
      }
    })()

    return () => { cancelled = true }
  }, [completedSets, sessionExercises, sessionId, getPreSessionBests, resolveExerciseWeightUnit, showPRNotification])

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { prSets, prNotification, dismissPR: () => setPRNotification(null) }
}
