import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Fields cleared by EVERY session transition (start / end / restore).
 * Shared so the RN store (which overrides those actions to also drive workoutVisible)
 * spreads this list instead of re-typing it: two drift incidents came from the copy.
 * Constructora y no constante a propósito: devolver objetos nuevos en cada transición
 * evita que los mapas vacíos se compartan por referencia entre stores y entre resets.
 */
export function buildSessionTransitionReset() {
  return {
    weightConversionNonce: 0,
    exerciseResetNonces: {},
    pendingGymChange: null,
    restTimerActive: false,
    restTimerEndTime: null,
    restTimeInitial: 0,
    restTimerMinimized: false,
  }
}

/**
 * Additionally cleared by startSession/endSession — NOT by restoreSession, which runs on
 * foreground/revisit/cold start over the SAME session and must keep its set data and its
 * open accordion card.
 */
export function buildSessionSetDataReset() {
  return {
    completedSets: {},
    cachedSetData: {},
    exerciseSetCounts: {},
    pendingSets: {},
    expandedExerciseKey: undefined,
  }
}

/**
 * Workout store state builder.
 * Exported for platforms that need to extend the state (e.g. RN adds workoutVisible).
 */
export function workoutStoreState(set, get) {
  return {
    // ¿Ya sabemos si hay una sesión activa en el servidor para el usuario actual?
    // "No hay sesión" y "todavía no lo sé" son estados distintos: sin esto la UI
    // los confunde y deja arrancar un entrenamiento encima de otro (issue #30).
    // NO se persiste: en frío hay que volver a preguntar al servidor.
    activeSessionSynced: false,

    // Current session
    sessionId: null,
    routineDayId: null,
    routineId: null,
    gymId: null,
    startedAt: null,

    // Completed sets during this session (optimistic UI cache)
    // Key: `${sessionExerciseId}-${setNumber}` -> setData
    completedSets: {},
    // Cached set data (for re-checking after uncomplete)
    cachedSetData: {},
    // Current set count per exercise (for tracking added/removed sets)
    // Key: sessionExerciseId -> number of sets
    exerciseSetCounts: {},
    // Sets pending sync (failed to save to server)
    // Key: `${sessionExerciseId}-${setNumber}` -> mutation payload
    pendingSets: {},

    // Contador que se incrementa cuando se convierten pesos por un cambio de unidad
    // (cambio de gym a mitad de sesión). Es la señal para que useSetInputs re-siembre su
    // input local (que se inicializa una sola vez); sin esto la fila seguiría mostrando el
    // número en la unidad vieja y el commit con debounce lo reescribiría encima.
    weightConversionNonce: 0,

    // Contador POR FILA (sessionExerciseId -> entero) que `clearExercise` incrementa: la señal de
    // "el ejercicio que había en esta fila ya no es el mismo" (reemplazo a mitad de sesión, issue
    // #72). Las filas NO se remontan al reemplazar (su key cuelga del sessionExerciseId, que no
    // cambia), así que sin esta señal el estado local de useSetInputs/useSetVideoUpload sobrevive y
    // la fila sigue enseñando el peso, el RIR o el vídeo del ejercicio anterior.
    // Por fila y no global (a diferencia de weightConversionNonce): un contador único reiniciaría
    // todas las filas de la sesión. NO se persiste: rehidratarlo dispararía un reset al restaurar.
    exerciseResetNonces: {},

    // Cambio de gym pendiente de persistir en BD (UI optimista). Se aplica ya en local y se
    // encola aquí; useSyncPendingGymChange lo reintenta hasta persistirlo con el RPC atómico.
    // Persistido → sobrevive a cierres de app offline. { gymId, weights: [{sessionExerciseId, setNumber, weight}] }
    pendingGymChange: null,

    // Ejercicio abierto en el acordeón de la sesión (accordion: solo uno a la vez).
    // Persistido → al salir y volver (o cold start) reabre la misma card en vez de la primera.
    // Sentinela: undefined = "auto" (abrir el primer ejercicio), null = "todo colapsado"
    // (elección explícita del usuario, se respeta), string = key de la card abierta.
    expandedExerciseKey: undefined,

    // Rest timer state
    restTimerActive: false,
    restTimerEndTime: null,  // Timestamp cuando termina el timer
    restTimeInitial: 0,
    restTimerMinimized: false,
    restTimerContext: {},  // { setNumber, totalSets, exerciseName }

    // Marca que la sincronización con el servidor ya respondió (o falló, y entonces
    // lo mejor que tenemos es el estado local persistido).
    setActiveSessionSynced: (synced) => set({ activeSessionSynced: synced }),

    // Start a new workout session
    // routineId and routineDayId can be null for free sessions
    startSession: (sessionId, routineDayId, routineId = null, gymId = null) => set({
      sessionId,
      routineDayId,
      routineId,
      gymId,
      startedAt: new Date().toISOString(),
      ...buildSessionSetDataReset(),
      ...buildSessionTransitionReset(),
    }),

    // Restore session from backend
    // OJO: expandedExerciseKey NO se resetea aquí a propósito — restore corre al volver
    // a la sesión activa (foreground/revisita/cold start) y debe PRESERVAR la card abierta.
    restoreSession: ({ sessionId, routineDayId, routineId, gymId = null, startedAt, completedSets, cachedSetData }) => set({
      sessionId,
      routineDayId,
      routineId,
      gymId,
      startedAt,
      completedSets,
      cachedSetData,
      ...buildSessionTransitionReset(),
    }),

    // Change the gym of the active session (quick change from the session header)
    setSessionGym: (gymId) => set({ gymId }),

    // Set which exercise card is expanded (accordion). null = colapsar todo.
    setExpandedExerciseKey: (key) => set({ expandedExerciseKey: key }),

    // End current session
    endSession: () => set({
      sessionId: null,
      routineDayId: null,
      routineId: null,
      gymId: null,
      startedAt: null,
      ...buildSessionSetDataReset(),
      ...buildSessionTransitionReset(),
    }),

    // Mark a set as completed (optimistic update)
    completeSet: (sessionExerciseId, setNumber, data) => set(state => {
      const key = `${sessionExerciseId}-${setNumber}`
      const setData = {
        sessionExerciseId,
        setNumber,
        ...data,
        completedAt: new Date().toISOString(),
      }
      return {
        completedSets: {
          ...state.completedSets,
          [key]: setData,
        },
        cachedSetData: {
          ...state.cachedSetData,
          [key]: setData,
        },
      }
    }),

    // Uncheck a completed set (keeps data in cache for re-checking)
    uncompleteSet: (sessionExerciseId, setNumber) => set(state => {
      const newCompletedSets = { ...state.completedSets }
      delete newCompletedSets[`${sessionExerciseId}-${setNumber}`]
      return { completedSets: newCompletedSets }
    }),

    // Get cached data for a set (even if uncompleted)
    getCachedSetData: (sessionExerciseId, setNumber) => {
      const state = get()
      return state.cachedSetData[`${sessionExerciseId}-${setNumber}`]
    },

    // Cache edited values of a NOT-completed set so they survive collapse/navigation
    // and out-of-order completion. Merges measurement values into the cache entry.
    setCachedSetData: (sessionExerciseId, setNumber, values) => set(state => {
      const key = `${sessionExerciseId}-${setNumber}`
      return {
        cachedSetData: {
          ...state.cachedSetData,
          [key]: { sessionExerciseId, setNumber, ...state.cachedSetData[key], ...values },
        },
      }
    }),

    // Edit the measurement values of an already-completed set in place, without
    // uncompleting it. Preserves dbId/rir/notes/videoUrl/setType/completedAt.
    updateCompletedSetValues: (sessionExerciseId, setNumber, values) => set(state => {
      const key = `${sessionExerciseId}-${setNumber}`
      const existing = state.completedSets[key]
      if (!existing) return state
      // Ignorar claves undefined (campos que lo que mide el ejercicio no usa) para no
      // sobrescribir valores presentes con undefined.
      const clean = {}
      for (const [k, v] of Object.entries(values)) {
        if (v !== undefined) clean[k] = v
      }
      const updated = { ...existing, ...clean }
      return {
        completedSets: { ...state.completedSets, [key]: updated },
        cachedSetData: { ...state.cachedSetData, [key]: updated },
      }
    }),

    // Aplica en bloque la conversión de peso de varias series completadas (al mover la sesión
    // a un gym con distinta unidad). Actualiza completedSets, cachedSetData y también
    // pendingSets (una serie completada offline que aún no sincronizó lleva el peso viejo en su
    // payload; sin convertirlo, al sincronizar insertaría el peso sin convertir en BD). BUMPEA
    // weightConversionNonce para que los SetRow montados re-siembren su input local.
    applyWeightConversions: (conversions) => set(state => {
      if (!conversions?.length) return state
      const completedSets = { ...state.completedSets }
      const cachedSetData = { ...state.cachedSetData }
      const pendingSets = { ...state.pendingSets }
      for (const c of conversions) {
        const key = `${c.sessionExerciseId}-${c.setNumber}`
        if (completedSets[key]) completedSets[key] = { ...completedSets[key], weight: c.newWeight }
        if (cachedSetData[key]) cachedSetData[key] = { ...cachedSetData[key], weight: c.newWeight }
        if (pendingSets[key]) pendingSets[key] = { ...pendingSets[key], weight: c.newWeight }
      }
      return { completedSets, cachedSetData, pendingSets, weightConversionNonce: state.weightConversionNonce + 1 }
    }),

    // Fija (o limpia con null) el cambio de gym pendiente de persistir en BD.
    setPendingGymChange: (job) => set({ pendingGymChange: job }),

    // Get completed sets for an exercise
    getSetsForExercise: (sessionExerciseId) => {
      const state = get()
      return Object.values(state.completedSets)
        .filter(set => set.sessionExerciseId === sessionExerciseId)
        .sort((a, b) => a.setNumber - b.setNumber)
    },

    // Check if a specific set is completed
    isSetCompleted: (sessionExerciseId, setNumber) => {
      const state = get()
      return !!state.completedSets[`${sessionExerciseId}-${setNumber}`]
    },

    // Get data for a specific set
    getSetData: (sessionExerciseId, setNumber) => {
      const state = get()
      return state.completedSets[`${sessionExerciseId}-${setNumber}`]
    },

    // Update dbId after server confirms (for optimistic updates)
    updateSetDbId: (sessionExerciseId, setNumber, dbId) => set(state => {
      const key = `${sessionExerciseId}-${setNumber}`
      const existing = state.completedSets[key]
      if (!existing) return state
      return {
        completedSets: {
          ...state.completedSets,
          [key]: { ...existing, dbId },
        },
        cachedSetData: {
          ...state.cachedSetData,
          [key]: { ...existing, dbId },
        },
      }
    }),

    // Update videoUrl for a set (used for background uploads)
    updateSetVideo: (sessionExerciseId, setNumber, videoUrl) => set(state => {
      const key = `${sessionExerciseId}-${setNumber}`
      const existing = state.completedSets[key]
      if (!existing) return state
      return {
        completedSets: {
          ...state.completedSets,
          [key]: { ...existing, videoUrl },
        },
        cachedSetData: {
          ...state.cachedSetData,
          [key]: { ...existing, videoUrl },
        },
      }
    }),

    // Update RIR/notes (and optionally setType/videoUrl) of a completed set without
    // uncompleting. setType/videoUrl solo se aplican si llegan definidos (no pisar con
    // undefined cuando la mutación solo actualiza el esfuerzo). Nota: hoy ningún caller pasa
    // videoUrl por aquí (el vídeo va por updateSetVideo); la guarda se mantiene para que el
    // store quede consistente con la API si en el futuro se reusa esta mutación con vídeo.
    updateSetDetails: (sessionExerciseId, setNumber, { rirActual, notes, videoUrl, setType }) => set(state => {
      const key = `${sessionExerciseId}-${setNumber}`
      const existing = state.completedSets[key]
      if (!existing) return state
      const updated = { ...existing, rirActual, notes }
      if (videoUrl !== undefined) updated.videoUrl = videoUrl
      if (setType !== undefined) updated.setType = setType
      return {
        completedSets: {
          ...state.completedSets,
          [key]: updated,
        },
        cachedSetData: {
          ...state.cachedSetData,
          [key]: updated,
        },
      }
    }),

    // Rollback a set (remove from completedSets, for error handling)
    rollbackSet: (sessionExerciseId, setNumber) => set(state => {
      const key = `${sessionExerciseId}-${setNumber}`
      const { [key]: _removed, ...restCompleted } = state.completedSets
      const { [key]: _removedCached, ...restCached } = state.cachedSetData
      return {
        completedSets: restCompleted,
        cachedSetData: restCached,
      }
    }),

    // Add a set to the pending sync queue
    addPendingSet: (sessionExerciseId, setNumber, payload) => set(state => ({
      pendingSets: {
        ...state.pendingSets,
        [`${sessionExerciseId}-${setNumber}`]: payload,
      },
    })),

    // Remove a set from the pending sync queue
    removePendingSet: (sessionExerciseId, setNumber) => set(state => {
      const { [`${sessionExerciseId}-${setNumber}`]: _, ...rest } = state.pendingSets
      return { pendingSets: rest }
    }),

    // Check if session is active
    hasActiveSession: () => {
      const state = get()
      return !!state.sessionId
    },

    // Rest timer actions
    startRestTimer: (seconds, context = {}) => set({
      restTimerActive: true,
      restTimerEndTime: Date.now() + seconds * 1000,
      restTimeInitial: seconds,
      restTimerContext: context,
    }),

    // Calcula tiempo restante basado en timestamp real
    getTimeRemaining: () => {
      const state = get()
      if (!state.restTimerActive || !state.restTimerEndTime) return 0
      return Math.max(0, Math.ceil((state.restTimerEndTime - Date.now()) / 1000))
    },

    // Tick solo verifica si el timer debe parar
    tickTimer: () => {
      const state = get()
      if (!state.restTimerActive) return
      const remaining = Math.ceil((state.restTimerEndTime - Date.now()) / 1000)
      if (remaining <= 0) {
        set({ restTimerActive: false, restTimerEndTime: null, restTimerContext: {} })
      }
    },

    skipRest: () => set({
      restTimerActive: false,
      restTimerEndTime: null,
      restTimerContext: {},
    }),

    adjustRestTime: (delta) => set(state => ({
      restTimerEndTime: state.restTimerEndTime ? state.restTimerEndTime + delta * 1000 : null,
      restTimeInitial: Math.max(1, state.restTimeInitial + delta),
    })),

    setRestTimerMinimized: (minimized) => set({ restTimerMinimized: minimized }),

    // Exercise set count actions
    setExerciseSetCount: (sessionExerciseId, count) => set(state => ({
      exerciseSetCounts: {
        ...state.exerciseSetCounts,
        [sessionExerciseId]: count,
      },
    })),

    getExerciseSetCount: (sessionExerciseId, defaultCount) => {
      const state = get()
      return state.exerciseSetCounts[sessionExerciseId] ?? defaultCount
    },

    clearExercise: (sessionExerciseId) => set(state => {
      const newCompleted = {}
      for (const [key, val] of Object.entries(state.completedSets)) {
        if (val.sessionExerciseId !== sessionExerciseId) newCompleted[key] = val
      }
      const newCached = {}
      for (const [key, val] of Object.entries(state.cachedSetData)) {
        if (val.sessionExerciseId !== sessionExerciseId) newCached[key] = val
      }
      // La cola offline también, y es la que más duele: se PERSISTE y lleva el payload completo
      // de upsert indexado por `${sessionExerciseId}-${setNumber}`, clave que sobrevive al
      // reemplazo porque el session_exercise_id no cambia. Sin vaciarla, el reintento de
      // useSyncPendingSets reinserta en BD una serie del ejercicio VIEJO atribuida al NUEVO
      // (invisible en pantalla, visible en historial y PRs); y viniendo de useRemoveSessionExercise
      // el upsert choca contra la FK de un session_exercises ya borrado y reintenta cada 10 s.
      const newPending = {}
      for (const [key, val] of Object.entries(state.pendingSets)) {
        if (val.sessionExerciseId !== sessionExerciseId) newPending[key] = val
      }
      const { [sessionExerciseId]: _, ...newCounts } = state.exerciseSetCounts
      // El bump viaja en el MISMO set() que el vaciado: quien lo observe encuentra el store ya
      // limpio, y la señal llega con el clearExercise en vez de una vuelta de red más tarde.
      return {
        completedSets: newCompleted,
        cachedSetData: newCached,
        pendingSets: newPending,
        exerciseSetCounts: newCounts,
        exerciseResetNonces: {
          ...state.exerciseResetNonces,
          [sessionExerciseId]: (state.exerciseResetNonces[sessionExerciseId] ?? 0) + 1,
        },
      }
    }),
  }
}

/**
 * The persisted shape of the workout store: everything except the transient fields.
 * Exported so the RN store reuses this exclusion list and only wraps it to drop its
 * RN-only workoutVisible.
 */
export function workoutPartialize(state) {
  const {
    restTimerActive: _rta, restTimerEndTime: _rte,
    restTimeInitial: _rti, restTimerMinimized: _rtm,
    // activeSessionSynced fuera: rehidratarlo a true daría por sabido lo que
    // todavía no se ha preguntado, que es justo el bug que evita (issue #30).
    activeSessionSynced: _ass,
    // exerciseResetNonces fuera: es una señal intra-sesión. Rehidratarla haría que la primera
    // lectura tras un cold start viera un nonce "nuevo" y reseteara filas intactas.
    exerciseResetNonces: _ern,
    ...rest
  } = state
  return rest
}

/**
 * Factory that creates a workout Zustand store with persist middleware.
 * @param {object} [storage] - Optional Zustand storage adapter. Omit for default. Pass custom adapter for other environments.
 * @returns {object} Zustand store instance
 */
export function createWorkoutStore(storage) {
  const persistOptions = {
    name: 'workout-session',
    partialize: workoutPartialize,
  }
  if (storage) {
    persistOptions.storage = storage
  }
  return create(persist(workoutStoreState, persistOptions))
}
