import { useState, useEffect, useCallback, useRef } from 'react'
import { useWorkoutStore, getWorkoutStore } from './_stores.js'
import { useUpdateCompletedSet, useUpdateSetDetails } from './useCompletedSets.js'
import {
  createSetKey,
  isSetDataValid,
  buildCompletedSetData,
  getSetInitialInputValues,
  getSetMeasurementValues,
  isSuggestedValue,
  getSuggestedSetValues,
  buildCachedMeasurementValues,
  setMeasurementValuesChanged,
  formatSetTargetPlaceholder,
} from '../lib/setUtils.js'
import { SetField, distanceToMeters, getProgressableField, metersToDistanceUnit, resolveTargetField } from '../lib/measurementFields.js'
import { SET_EDIT_DEBOUNCE_MS } from '../lib/constants.js'

/**
 * Envuelve un setter de input para que CUALQUIER edición del usuario saque la fila del estado
 * "pristine" (ver el reemplazo de ejercicio en useSetInputs). Los efectos de siembra usan el
 * setter crudo a propósito: sembrar una sugerencia no es teclear.
 */
function useUserEditedSetter(setState, pristineRef) {
  return useCallback((value) => {
    pristineRef.current = false
    setState(value)
  }, [setState, pristineRef])
}

/**
 * Estado y persistencia de los inputs de una serie durante la sesión activa.
 * Platform-agnostic (solo store inyectado + utils/mutaciones compartidas) → ÚNICA fuente
 * para web y native (regla DRY del CLAUDE.md). Los SetRow solo consumen y renderizan.
 *
 * - init de inputs desde cachedData > setData (una vez, al montar)
 * - prefill asíncrono desde la sesión anterior (solo campos vacíos, sin pisar lo tecleado)
 * - commit debounced: serie completada → persiste in situ (store + servidor) SIN desmarcar;
 *   serie no completada → cachea en el store para no perder el valor al colapsar/navegar
 *   o completar en otro orden
 * - flush en unmount: guarda ediciones pendientes dentro de la ventana del debounce
 *   (commit idempotente vía setMeasurementValuesChanged → timer + unmount no duplican)
 * - reset al REEMPLAZAR el ejercicio de la fila: la fila no se remonta, así que el estado local
 *   se tira a mano con la señal del store (issue #72)
 *
 * @param {{sessionExerciseId: string|number, setNumber: number, exerciseId: number,
 *   trackedFields: string[], weightUnit?: string, distanceUnit?: string,
 *   previousSet?: Object, previousLoaded?: boolean (¿resuelta la query del "Anterior"? default false,
 *     conservador: sin saberlo no se siembra el nivel prescrito), target?: string|number,
 *   targetField?: string|null, levelTarget?: number|null}} params
 */
export function useSetInputs({ sessionExerciseId, setNumber, exerciseId, trackedFields, weightUnit, distanceUnit = 'm', previousSet, previousLoaded = false, target, targetField, levelTarget }) {
  const setKey = createSetKey(sessionExerciseId, setNumber)
  const isCompleted = useWorkoutStore(state => !!state.completedSets[setKey])
  const setData = useWorkoutStore(state => state.completedSets[setKey])
  const weightConversionNonce = useWorkoutStore(state => state.weightConversionNonce)
  // Nonce de reemplazo de ESTA fila (ver el efecto de reset más abajo). `?? 0` porque el mapa
  // solo tiene entrada para las filas cuyo ejercicio se ha sustituido alguna vez.
  const exerciseResetNonce = useWorkoutStore(state => state.exerciseResetNonces[sessionExerciseId] ?? 0)
  const cachedData = useWorkoutStore(state => state.cachedSetData[setKey])
  const setCachedSetData = useWorkoutStore(state => state.setCachedSetData)
  const { mutate: updateCompletedSet } = useUpdateCompletedSet()
  const { mutate: updateSetDetails } = useUpdateSetDetails()

  // Valores iniciales de los inputs: caché de edición > datos completados (una vez, al montar)
  const [initValues] = useState(() => getSetInitialInputValues({ setData, cachedData, distanceUnit }))
  // Los setters CRUDOS (`*State`) los usan los efectos de siembra de este archivo; el consumidor
  // recibe los envueltos de más abajo, que además marcan la fila como editada (mismo patrón que
  // `setRirState` / `setRir`).
  const [weight, setWeightState] = useState(initValues.weight)
  const [reps, setRepsState] = useState(initValues.reps)
  const [time, setTimeState] = useState(initValues.time)
  const [distance, setDistanceState] = useState(initValues.distance)
  const [calories, setCaloriesState] = useState(initValues.calories)
  const [level, setLevelState] = useState(initValues.level)
  const [pace, setPaceState] = useState(initValues.pace)

  // Detalles de la serie (esfuerzo, notas, tipo): grupo que se persiste junto (la API
  // updateSetDetails reescribe rir_actual + notes + set_type). Estado local para feedback
  // inmediato. Se pueden editar ANTES de completar: se cachean en el store y se aplican en
  // buildCompletedSetData al completar (mismo patrón que las mediciones). El vídeo NO va en
  // este grupo (se adjunta a una serie ya completada; ver SetRow).
  // Ojo: `??` (no `||`) porque 0 y -1 (F) son valores de RIR válidos; setType por defecto 'normal'.
  const [rir, setRirState] = useState(() => cachedData?.rirActual ?? setData?.rirActual ?? null)
  const [notes, setNotesState] = useState(() => cachedData?.notes ?? setData?.notes ?? null)
  const [setType, setSetTypeState] = useState(() => cachedData?.setType ?? setData?.setType ?? 'normal')

  // Estado de la fila frente a un REEMPLAZO del ejercicio (issue #72); el efecto que lo mueve
  // todo está más abajo, declarado antes del prefill porque el orden importa.
  // - `pristineRef`: la fila acaba de quedar en blanco y todavía no tiene nada que guardar.
  // - `discardedPreviousRef`: `{ ref }` con el "Anterior" que dejó de aplicar (null = nada bloqueado).
  // - `blockedLevelTargetRef`: `{ value }` con el nivel prescrito que dejó de aplicar (null = nada
  //   bloqueado). Valor y no booleano: el bloqueo caduca en cuanto la prescripción CAMBIA, porque
  //   entonces ya es la del ejercicio nuevo.
  const previousSetRef = useRef(null)
  const lastExerciseResetNonceRef = useRef(exerciseResetNonce)
  const pristineRef = useRef(false)
  const discardedPreviousRef = useRef(null)
  const blockedLevelTargetRef = useRef(null)

  const setWeight = useUserEditedSetter(setWeightState, pristineRef)
  const setReps = useUserEditedSetter(setRepsState, pristineRef)
  const setTime = useUserEditedSetter(setTimeState, pristineRef)
  const setDistance = useUserEditedSetter(setDistanceState, pristineRef)
  const setCalories = useUserEditedSetter(setCaloriesState, pristineRef)
  const setLevel = useUserEditedSetter(setLevelState, pristineRef)
  const setPace = useUserEditedSetter(setPaceState, pristineRef)

  // Persiste el grupo de detalles: completada → updateSetDetails (in situ, sin desmarcar y
  // sin videoUrl → la API preserva el vídeo); no completada → caché en el store (merge, no
  // pisa mediciones porque setMeasurementValuesChanged solo compara claves de medición).
  const persistDetails = useCallback((group) => {
    pristineRef.current = false
    if (isCompleted) {
      updateSetDetails({ sessionExerciseId, setNumber, rirActual: group.rir, notes: group.notes, setType: group.setType })
    } else {
      setCachedSetData(sessionExerciseId, setNumber, { rirActual: group.rir, notes: group.notes, setType: group.setType })
    }
  }, [isCompleted, sessionExerciseId, setNumber, updateSetDetails, setCachedSetData])

  const setRir = useCallback((value) => {
    setRirState(value)
    persistDetails({ rir: value, notes, setType })
  }, [persistDetails, notes, setType])

  // Guardar notas + tipo de serie juntos (desde la hoja de detalles), preservando el RIR.
  const saveDetails = useCallback(({ notes: nextNotes, setType: nextSetType }) => {
    setNotesState(nextNotes)
    setSetTypeState(nextSetType)
    persistDetails({ rir, notes: nextNotes, setType: nextSetType })
  }, [persistDetails, rir])

  // Fijar el tipo de serie (normal/dropset) solo, preservando RIR y notas. Lo usa el toggle
  // Normal/Dropset de SetDetailsModal (prop onSetTypeChange); mismo patrón que setRir.
  const setSetType = useCallback((value) => {
    setSetTypeState(value)
    persistDetails({ rir, notes, setType: value })
  }, [persistDetails, rir, notes])

  // Reemplazo del ejercicio de la fila (issue #72). Sustituir un ejercicio en sesión NO remonta
  // sus filas —la key de cada SetRow cuelga del sessionExerciseId, que no cambia—, así que sin
  // esto todo el estado local de arriba sobrevive y la fila sigue enseñando el peso, el RIR y las
  // notas del ejercicio anterior. La señal es el nonce por fila que el store bumpea DENTRO del
  // mismo set() que vacía sus datos: el `exerciseId` nuevo no llega hasta que responde el refetch,
  // una vuelta de red más tarde, y para entonces el commit con debounce ya habría cacheado los
  // valores viejos.
  //
  // ⚠️ Este efecto se declara ANTES del prefill y del nivel prescrito a propósito: React corre los
  // efectos en orden de declaración y, con la query del "Anterior" ya caliente, el reset y el
  // "Anterior" del ejercicio nuevo pueden llegar en el MISMO commit. Declarado después, el reset
  // borraría la siembra recién hecha y `previousSet` ya no volvería a cambiar nunca.
  useEffect(() => {
    if (exerciseResetNonce === lastExerciseResetNonceRef.current) return
    lastExerciseResetNonceRef.current = exerciseResetNonce
    pristineRef.current = true
    blockedLevelTargetRef.current = { value: levelTarget }
    // Se bloquea la referencia que el prefill VIO por última vez, no la prop de este render: si el
    // "Anterior" del ejercicio nuevo ha llegado en este mismo commit, la prop ya es otra y tiene
    // que sembrarse.
    discardedPreviousRef.current = { ref: previousSetRef.current }
    setWeightState(''); setRepsState(''); setTimeState(''); setDistanceState('')
    setCaloriesState(''); setLevelState(''); setPaceState('')
    setRirState(null); setNotesState(null); setSetTypeState('normal')
    // `levelTarget` en las deps solo por exhaustive-deps: el cuerpo sale antes si el nonce no ha
    // cambiado, así que el valor que se bloquea sigue siendo el del render del bump.
  }, [exerciseResetNonce, levelTarget])

  // Prefill de la sesión anterior. Llega asíncrono. Al montar rellena solo los campos vacíos;
  // y cuando `previousSet` CAMBIA (p. ej. cambio de gym a mitad de sesión → se re-consulta el
  // "Anterior" del gym nuevo) re-prellena las series aún no tocadas con ese último entreno del
  // gym nuevo, sobrescribiendo la sugerencia vieja. Nunca pisa lo ya completado (setData) ni lo
  // que el usuario haya guardado (cachedData).
  useEffect(() => {
    // NO tocar el ref mientras previousSet está transitoriamente vacío: al cambiar de gym, la
    // query del "Anterior" (key con gymId, sin keepPreviousData) pasa por undefined mientras
    // recarga. Conservar el último real permite detectar el cambio cuando llega el del gym nuevo.
    if (!previousSet) return
    // Tras un reemplazo, la query sigue devolviendo el histórico del ejercicio VIEJO hasta que el
    // refetch trae el exerciseId nuevo: sembrarlo repintaría justo lo que el reset acaba de borrar.
    // Se desbloquea con la primera referencia distinta, que ya es la del ejercicio nuevo.
    const discarded = discardedPreviousRef.current
    if (discarded) {
      if (previousSet === discarded.ref) return
      discardedPreviousRef.current = null
      previousSetRef.current = null // lo primero del ejercicio nuevo es una PRIMERA siembra
    }
    if (setData || cachedData) { previousSetRef.current = previousSet; return }
    const changed = previousSetRef.current != null && previousSetRef.current !== previousSet
    previousSetRef.current = previousSet
    const pick = (current, next) => (changed || current === '') ? next : current
    // Qué se siembra en cada campo sale de getSuggestedSetValues, la misma fuente que decide
    // luego si un valor SIGUE siendo la sugerencia (suggestedFields, más abajo).
    // ⚠️ `levelTarget` NO se pasa aquí a propósito, aunque la otra llamada sí lo haga: el nivel
    // prescrito solo puede sembrarse cuando `previousLoaded` es true (ver el efecto de más
    // abajo), o pisa el nivel al que progresaste. Si se unifican las dos llamadas "por DRY", ese
    // efecto deja de mandar y el 8 de la rutina sustituye en silencio a tu 9.
    const seed = getSuggestedSetValues(previousSet, { distanceUnit })
    const setters = {
      [SetField.WEIGHT]: setWeightState, [SetField.REPS]: setRepsState, [SetField.TIME]: setTimeState,
      [SetField.DISTANCE]: setDistanceState, [SetField.CALORIES]: setCaloriesState,
      [SetField.LEVEL]: setLevelState, [SetField.PACE]: setPaceState,
    }
    for (const [field, next] of Object.entries(seed)) setters[field](current => pick(current, next))
    // Ya hay algo que la fila puede guardar: la sugerencia sembrada (ver pristineRef).
    pristineRef.current = false
  }, [previousSet, setData, cachedData, distanceUnit])

  // Re-siembra el peso cuando una conversión de unidad (cambio de gym a mitad de sesión)
  // reescribe los pesos en el store. El input se inicializa una sola vez (arriba), así que
  // sin esto la fila seguiría mostrando el número en la unidad vieja. Se lee del store ya
  // convertido; tras esto local == store, así que el commit con debounce no lo reescribe.
  // Solo actúa cuando el nonce REALMENTE se incrementa (no en el montaje ni si cambia setKey).
  const lastNonceRef = useRef(weightConversionNonce)
  useEffect(() => {
    if (weightConversionNonce === lastNonceRef.current) return
    lastNonceRef.current = weightConversionNonce
    const state = getWorkoutStore().getState()
    const converted = state.completedSets[setKey] ?? state.cachedSetData[setKey]
    if (converted?.weight != null) setWeightState(converted.weight)
  }, [weightConversionNonce, setKey])

  // Re-lee la distancia cuando cambia la unidad de DISPLAY. A diferencia del peso, esta unidad no
  // está disponible en el primer render: sale de `useUserExerciseDistanceUnits`, que resuelve un
  // tick después, y además el usuario puede cambiar el override con la tarjeta abierta. El input se
  // siembra una sola vez, así que sin esto la fila pinta metros bajo una cabecera "KM" y, peor, el
  // commit con debounce reinterpreta ESE número en la unidad nueva y escribe en BD el valor
  // multiplicado (o dividido) por mil. Se convierte el valor LOCAL en vez de re-sembrar del store
  // (lo que hace el nonce de peso) para no descartar una edición aún sin commitear.
  const lastDistanceUnitRef = useRef(distanceUnit)
  useEffect(() => {
    const previousUnit = lastDistanceUnitRef.current
    if (distanceUnit === previousUnit) return
    lastDistanceUnitRef.current = distanceUnit
    setDistanceState(current => (current === '' || current == null
      ? current
      : metersToDistanceUnit(distanceToMeters(current, previousUnit), distanceUnit)))
  }, [distanceUnit])

  // Nivel prescrito por la rutina (`routine_exercises.level`): siembra la columna de nivel cuando
  // no hay nada más de donde sacarlo. Espera a que la referencia de la última vez esté resuelta
  // (`previousLoaded`) porque lo de la última vez MANDA: si progresaste a nivel 9 la rutina sigue
  // diciendo 8, y sembrar el 8 encima sería una regresión. Sin esa espera, el nivel prescrito
  // llegaría antes que la referencia y ganaría la carrera.
  // El `previousSet?.level != null` NO es redundante aunque hoy el updater funcional lo cubra: hace
  // que la precedencia no dependa del ORDEN de los efectos. Si este efecto pasara a declararse
  // antes que el prefill, sin esa condición sembraría el 8 y el prefill ya vería la casilla llena.
  // Una fila REEMPLAZADA deja de sembrar ESA prescripción: `session_exercises.level` sigue siendo
  // la del ejercicio viejo (la mutación solo toca exercise_id/rir/notes) y un "nivel 8" es la
  // escala de OTRA máquina. El bloqueo guarda el VALOR, no un booleano: en cuanto la prescripción
  // cambia ya es del ejercicio nuevo (el usuario la ha reconfigurado desde «Editar») y volver a
  // ignorarla sería tragarse en silencio algo que acaba de teclear. Ver docs/DECISIONS.md (#72).
  useEffect(() => {
    const blockedLevel = blockedLevelTargetRef.current
    if (blockedLevel) {
      if (levelTarget === blockedLevel.value) return
      blockedLevelTargetRef.current = null
    }
    if (levelTarget == null || !previousLoaded) return
    if (setData || cachedData || previousSet?.level != null) return
    setLevelState(current => (current === '' ? levelTarget : current))
  }, [levelTarget, previousLoaded, previousSet, setData, cachedData])

  const isValid = () => isSetDataValid(trackedFields, { weight, reps, time, distance, calories, level, pace })
  // El objetivo de la rutina se pinta como placeholder de SU columna (la del campo objetivo), no
  // solo en la de reps: en un cardio "20min" es la pista de la columna de tiempo.
  const targetPlaceholder = formatSetTargetPlaceholder(target)
  const resolvedTargetField = resolveTargetField(targetField, trackedFields)
  // Valor VIVO del campo progresable (lo que se compara con la sesión anterior para apagar el
  // aviso de progresión). Se resuelve aquí y no en cada SetRow: es el hook el que tiene los
  // estados de los siete campos, y duplicar el mapeo en web y native garantiza que un día uno
  // de los dos lo corrija y el otro no.
  const progressableField = getProgressableField(trackedFields)
  const progressableValue = progressableField === SetField.LEVEL ? level : weight

  // Qué campos siguen mostrando LA SUGERENCIA y no un dato del usuario; el consumidor los atenúa
  // para que no se confundan con lo ya registrado. Comparación contra lo que se sembraría ahora
  // mismo, sin rastrear ediciones: ver el porqué en isSuggestedValue.
  const suggestions = getSuggestedSetValues(previousSet, { levelTarget, distanceUnit })
  const suggestedFields = {}
  for (const [field, value] of Object.entries({
    [SetField.WEIGHT]: weight, [SetField.REPS]: reps, [SetField.TIME]: time,
    [SetField.DISTANCE]: distance, [SetField.CALORIES]: calories,
    [SetField.LEVEL]: level, [SetField.PACE]: pace,
  })) {
    suggestedFields[field] = isSuggestedValue({ value, suggestion: suggestions[field], isCompleted })
  }

  // Dos guardas, porque son dos caminos distintos por los que los valores del ejercicio VIEJO
  // podrían colarse en el store después del reemplazo:
  // - `pristineRef`: la fila sigue montada y ya se reseteó, pero el timer del debounce puede estar
  //   armado con un `commit` que cierra sobre los valores de antes (el vaciado de cachedSetData
  //   cambia la identidad de `commit` y REARMA el timer justo con ellos).
  // - nonce vivo: la fila se desmonta en el MISMO commit que el clearExercise (al vaciarse
  //   exerciseSetCounts, una serie añadida a mano desaparece). Ahí el efecto de reset ya no corre,
  //   solo el flush de desmontaje, así que hay que preguntárselo al store VIVO; sin esto escribiría
  //   una entrada huérfana en cachedSetData bajo un número de serie que nadie va a revisitar.
  const commit = useCallback(() => {
    if (pristineRef.current) return
    const liveNonce = getWorkoutStore().getState().exerciseResetNonces[sessionExerciseId] ?? 0
    if (liveNonce !== lastExerciseResetNonceRef.current) return
    const formData = { weight, reps, time, distance, calories, level, pace }
    if (isCompleted) {
      if (!isSetDataValid(trackedFields, formData)) return
      const values = getSetMeasurementValues(trackedFields, formData, { distanceUnit })
      if (!setMeasurementValuesChanged(setData, values)) return
      updateCompletedSet(buildCompletedSetData(trackedFields, formData, {
        sessionExerciseId, exerciseId, setNumber, weightUnit, distanceUnit,
        rirActual: setData?.rirActual, notes: setData?.notes, videoUrl: setData?.videoUrl, setType: setData?.setType,
      }))
    } else {
      // Incluye los campos vaciados como null → borrar un valor persiste (sobrescribe la
      // caché); una fila pendiente sin datos no dispara escritura (todo null == ausente).
      const cached = buildCachedMeasurementValues(trackedFields, formData, { distanceUnit })
      if (setMeasurementValuesChanged(cachedData, cached)) {
        setCachedSetData(sessionExerciseId, setNumber, cached)
      }
    }
  }, [weight, reps, time, distance, calories, level, pace, isCompleted, setData, cachedData, trackedFields, distanceUnit, sessionExerciseId, exerciseId, setNumber, weightUnit, updateCompletedSet, setCachedSetData])

  useEffect(() => {
    const handle = setTimeout(commit, SET_EDIT_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [commit])

  // Flush en el desmontaje: guarda ediciones pendientes antes de perder el estado local
  const commitRef = useRef(commit)
  commitRef.current = commit
  useEffect(() => () => commitRef.current(), [])

  return {
    weight, setWeight,
    reps, setReps,
    time, setTime,
    distance, setDistance,
    calories, setCalories,
    level, setLevel,
    pace, setPace,
    rir, setRir,
    notes, setType, saveDetails, setSetType,
    isCompleted,
    setData,
    cachedData,
    isValid,
    targetPlaceholder,
    targetField: resolvedTargetField,
    progressableValue,
    suggestedFields,
  }
}
