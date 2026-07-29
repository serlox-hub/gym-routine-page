import { convertWeightValue } from './weightConversion.js'
import { resolveWeightUnit } from './exerciseUtils.js'

/**
 * Filtra las filas de user_exercise_gym_units por gym y devuelve { [exercise_id]: unidad }.
 * Compara gym_id como string porque los ids pueden llegar como número o string según el origen.
 * @param {Array<{exercise_id:number, gym_id:number, weight_unit:'kg'|'lb'}>} rows
 * @param {number|string|null} gymId
 * @returns {Object<number,'kg'|'lb'>}
 */
export function pickGymUnitOverrides(rows, gymId) {
  const map = {}
  for (const r of rows || []) {
    if (String(r.gym_id) === String(gymId)) map[r.exercise_id] = r.weight_unit
  }
  return map
}

/**
 * Unidad de peso efectiva por ejercicio en un gym, a partir del mapa de overrides
 * (exercise_id -> unidad, de fetchUserExerciseWeightUnits) y la preferencia global.
 * @param {number[]} exerciseIds
 * @param {Object<number,'kg'|'lb'>} overrides - unidad explícita por (ejercicio, gym); ausente = hereda global
 * @param {'kg'|'lb'|null|undefined} globalUnit - preferencia global del usuario
 * @returns {Object<number,'kg'|'lb'>}
 */
export function resolveUnitsForExercises(exerciseIds, overrides, globalUnit) {
  const map = {}
  for (const id of exerciseIds || []) {
    map[id] = resolveWeightUnit(overrides?.[id] ?? null, { weight_unit: globalUnit })
  }
  return map
}

/**
 * Dado el estado de series completadas de una sesión y la unidad resuelta por
 * ejercicio en el gym actual y en el destino, devuelve la lista de series cuyo peso
 * hay que convertir para preservar el peso real levantado al mover la sesión de gym.
 *
 * Puro (no hace fetch): el caller resuelve las unidades y pasa los mapas.
 * Solo convierte series con peso (`weight != null`) cuya unidad cambia entre gyms.
 * La dirección de conversión es por ejercicio (dos ejercicios pueden convertir en
 * sentidos opuestos si sus overrides difieren).
 *
 * @param {object} params
 * @param {Object<string,{sessionExerciseId:number,setNumber:number,weight:number|null}>} params.completedSets
 * @param {Object<number,number>} params.exerciseIdBySe - sessionExerciseId -> exerciseId
 * @param {Object<number,'kg'|'lb'>} params.oldUnitByExercise - unidad en el gym actual
 * @param {Object<number,'kg'|'lb'>} params.newUnitByExercise - unidad en el gym destino
 * @returns {Array<{sessionExerciseId:number,setNumber:number,exerciseId:number,fromUnit:string,toUnit:string,oldWeight:number,newWeight:number}>}
 */
export function planSessionWeightConversion({ completedSets, exerciseIdBySe, oldUnitByExercise, newUnitByExercise }) {
  const conversions = []
  for (const set of Object.values(completedSets || {})) {
    if (set?.weight == null) continue
    const exerciseId = exerciseIdBySe?.[set.sessionExerciseId]
    if (exerciseId == null) continue
    const fromUnit = oldUnitByExercise?.[exerciseId]
    const toUnit = newUnitByExercise?.[exerciseId]
    if (!fromUnit || !toUnit || fromUnit === toUnit) continue
    const converted = convertWeightValue(set.weight, fromUnit, toUnit)
    if (converted == null) continue
    conversions.push({
      sessionExerciseId: set.sessionExerciseId,
      setNumber: set.setNumber,
      exerciseId,
      fromUnit,
      toUnit,
      oldWeight: set.weight,
      newWeight: Math.round(converted * 100) / 100,
    })
  }
  return conversions
}

/**
 * Construye el trabajo de persistencia (RPC atómico) del cambio de gym de una sesión.
 * Si hay conversión ahora, o quedaba una pendiente sin sincronizar (`hadPendingWeights`),
 * manda el snapshot COMPLETO de pesos actuales (ya convertidos en el store): así es
 * idempotente y convergente aunque haya varios cambios de gym encadenados offline, incluido
 * arrastrar una conversión previa aún no persistida. Si es un cambio de gym sin ninguna
 * conversión implicada, `weights` va vacío (el RPC solo cambia el gym).
 * @param {object} params
 * @param {number} params.gymId - gym destino
 * @param {Object<string,{sessionExerciseId:number,setNumber:number,weight:number|null}>} params.completedSets
 * @param {boolean} params.hasConversions - la conversión de ESTE cambio afectó a alguna serie
 * @param {boolean} params.hadPendingWeights - ya había pesos encolados sin sincronizar
 * @returns {{gymId:number, weights:Array<{sessionExerciseId:number,setNumber:number,weight:number}>}}
 */
export function buildGymChangeJob({ gymId, completedSets, hasConversions, hadPendingWeights }) {
  const weights = (hasConversions || hadPendingWeights)
    ? Object.values(completedSets || {})
        .filter(s => s?.weight != null)
        .map(s => ({ sessionExerciseId: s.sessionExerciseId, setNumber: s.setNumber, weight: s.weight }))
    : []
  return { gymId, weights }
}
