import { useState, useEffect, useCallback, useRef } from 'react'
import { useWorkoutStore } from './_stores.js'
import { useUpdateCompletedSet } from './useCompletedSets.js'
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
  const cachedData = useWorkoutStore(state => state.cachedSetData[setKey])
  const setCachedSetData = useWorkoutStore(state => state.setCachedSetData)
  const { mutate: updateCompletedSet } = useUpdateCompletedSet()

  // Valores iniciales de los inputs: caché de edición > datos completados (una vez, al montar)
  const [initValues] = useState(() => getSetInitialInputValues({ setData, cachedData, distanceUnit }))
  const [weight, setWeight] = useState(initValues.weight)
  const [reps, setReps] = useState(initValues.reps)
  const [time, setTime] = useState(initValues.time)
  const [distance, setDistance] = useState(initValues.distance)
  const [calories, setCalories] = useState(initValues.calories)
  const [level, setLevel] = useState(initValues.level)
  const [pace, setPace] = useState(initValues.pace)

  // Prefill de la sesión anterior: llega asíncrono; solo rellena campos aún vacíos
  // y solo si no hay datos completados ni cacheados (para no pisar lo que el usuario escriba).
  useEffect(() => {
    if (!previousSet || setData || cachedData) return
    if (previousSet.weight != null) setWeight(w => w === '' ? previousSet.weight : w)
    if (previousSet.reps != null) setReps(r => r === '' ? previousSet.reps : r)
    if (previousSet.timeSeconds != null) setTime(tm => tm === '' ? previousSet.timeSeconds : tm)
    if (previousSet.distanceMeters != null) setDistance(d => d === '' ? metersToDistanceUnit(previousSet.distanceMeters, distanceUnit) : d)
    if (previousSet.caloriesBurned != null) setCalories(c => c === '' ? previousSet.caloriesBurned : c)
    if (previousSet.level != null) setLevel(l => l === '' ? previousSet.level : l)
    if (previousSet.paceSeconds != null) setPace(p => p === '' ? previousSet.paceSeconds : p)
  }, [previousSet, setData, cachedData, distanceUnit])

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
    isCompleted,
    setData,
    cachedData,
    isValid,
    repsPlaceholder,
  }
}
