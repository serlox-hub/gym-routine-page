import { useState, useEffect, useCallback, useRef } from 'react'
import { useWorkoutStore, getWorkoutStore } from './_stores.js'
import { useUpdateCompletedSet, useUpdateSetDetails } from './useCompletedSets.js'
import {
  createSetKey,
  isSetDataValid,
  buildCompletedSetData,
  getSetInitialInputValues,
  getSetMeasurementValues,
  buildCachedMeasurementValues,
  setMeasurementValuesChanged,
  formatRepsPlaceholder,
  metersToDistanceUnit,
} from '../lib/setUtils.js'
import { SET_EDIT_DEBOUNCE_MS } from '../lib/constants.js'

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
 *
 * @param {{sessionExerciseId: string|number, setNumber: number, exerciseId: number,
 *   measurementType: string, weightUnit?: string, distanceUnit?: string,
 *   previousSet?: Object, repsTarget?: string|number}} params
 */
export function useSetInputs({ sessionExerciseId, setNumber, exerciseId, measurementType, weightUnit, distanceUnit = 'm', previousSet, repsTarget }) {
  const setKey = createSetKey(sessionExerciseId, setNumber)
  const isCompleted = useWorkoutStore(state => !!state.completedSets[setKey])
  const setData = useWorkoutStore(state => state.completedSets[setKey])
  const weightConversionNonce = useWorkoutStore(state => state.weightConversionNonce)
  const cachedData = useWorkoutStore(state => state.cachedSetData[setKey])
  const setCachedSetData = useWorkoutStore(state => state.setCachedSetData)
  const { mutate: updateCompletedSet } = useUpdateCompletedSet()
  const { mutate: updateSetDetails } = useUpdateSetDetails()

  // Valores iniciales de los inputs: caché de edición > datos completados (una vez, al montar)
  const [initValues] = useState(() => getSetInitialInputValues({ setData, cachedData, distanceUnit }))
  const [weight, setWeight] = useState(initValues.weight)
  const [reps, setReps] = useState(initValues.reps)
  const [time, setTime] = useState(initValues.time)
  const [distance, setDistance] = useState(initValues.distance)
  const [calories, setCalories] = useState(initValues.calories)
  const [level, setLevel] = useState(initValues.level)
  const [pace, setPace] = useState(initValues.pace)

  // Detalles de la serie (esfuerzo, notas, tipo): grupo que se persiste junto (la API
  // updateSetDetails reescribe rir_actual + notes + set_type). Estado local para feedback
  // inmediato. Se pueden editar ANTES de completar: se cachean en el store y se aplican en
  // buildCompletedSetData al completar (mismo patrón que las mediciones). El vídeo NO va en
  // este grupo (se adjunta a una serie ya completada; ver SetRow).
  // Ojo: `??` (no `||`) porque 0 y -1 (F) son valores de RIR válidos; setType por defecto 'normal'.
  const [rir, setRirState] = useState(() => cachedData?.rirActual ?? setData?.rirActual ?? null)
  const [notes, setNotesState] = useState(() => cachedData?.notes ?? setData?.notes ?? null)
  const [setType, setSetTypeState] = useState(() => cachedData?.setType ?? setData?.setType ?? 'normal')

  // Persiste el grupo de detalles: completada → updateSetDetails (in situ, sin desmarcar y
  // sin videoUrl → la API preserva el vídeo); no completada → caché en el store (merge, no
  // pisa mediciones porque setMeasurementValuesChanged solo compara claves de medición).
  const persistDetails = useCallback((group) => {
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

  // Prefill de la sesión anterior. Llega asíncrono. Al montar rellena solo los campos vacíos;
  // y cuando `previousSet` CAMBIA (p. ej. cambio de gym a mitad de sesión → se re-consulta el
  // "Anterior" del gym nuevo) re-prellena las series aún no tocadas con ese último entreno del
  // gym nuevo, sobrescribiendo la sugerencia vieja. Nunca pisa lo ya completado (setData) ni lo
  // que el usuario haya guardado (cachedData).
  const previousSetRef = useRef(null)
  useEffect(() => {
    // NO tocar el ref mientras previousSet está transitoriamente vacío: al cambiar de gym, la
    // query del "Anterior" (key con gymId, sin keepPreviousData) pasa por undefined mientras
    // recarga. Conservar el último real permite detectar el cambio cuando llega el del gym nuevo.
    if (!previousSet) return
    if (setData || cachedData) { previousSetRef.current = previousSet; return }
    const changed = previousSetRef.current != null && previousSetRef.current !== previousSet
    previousSetRef.current = previousSet
    const pick = (current, next) => (changed || current === '') ? next : current
    if (previousSet.weight != null) setWeight(w => pick(w, previousSet.weight))
    if (previousSet.reps != null) setReps(r => pick(r, previousSet.reps))
    if (previousSet.timeSeconds != null) setTime(tm => pick(tm, previousSet.timeSeconds))
    if (previousSet.distanceMeters != null) setDistance(d => pick(d, metersToDistanceUnit(previousSet.distanceMeters, distanceUnit)))
    if (previousSet.caloriesBurned != null) setCalories(c => pick(c, previousSet.caloriesBurned))
    if (previousSet.level != null) setLevel(l => pick(l, previousSet.level))
    if (previousSet.paceSeconds != null) setPace(p => pick(p, previousSet.paceSeconds))
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
    if (converted?.weight != null) setWeight(converted.weight)
  }, [weightConversionNonce, setKey])

  const isValid = () => isSetDataValid(measurementType, { weight, reps, time, distance, calories, level, pace })
  const repsPlaceholder = formatRepsPlaceholder(repsTarget)

  const commit = useCallback(() => {
    const formData = { weight, reps, time, distance, calories, level, pace }
    if (isCompleted) {
      if (!isSetDataValid(measurementType, formData)) return
      const values = getSetMeasurementValues(measurementType, formData, { distanceUnit })
      if (!setMeasurementValuesChanged(setData, values)) return
      updateCompletedSet(buildCompletedSetData(measurementType, formData, {
        sessionExerciseId, exerciseId, setNumber, weightUnit, distanceUnit,
        rirActual: setData?.rirActual, notes: setData?.notes, videoUrl: setData?.videoUrl, setType: setData?.setType,
      }))
    } else {
      // Incluye los campos vaciados como null → borrar un valor persiste (sobrescribe la
      // caché); una fila pendiente sin datos no dispara escritura (todo null == ausente).
      const cached = buildCachedMeasurementValues(measurementType, formData, { distanceUnit })
      if (setMeasurementValuesChanged(cachedData, cached)) {
        setCachedSetData(sessionExerciseId, setNumber, cached)
      }
    }
  }, [weight, reps, time, distance, calories, level, pace, isCompleted, setData, cachedData, measurementType, distanceUnit, sessionExerciseId, exerciseId, setNumber, weightUnit, updateCompletedSet, setCachedSetData])

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
    repsPlaceholder,
  }
}
