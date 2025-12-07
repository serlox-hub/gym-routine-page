/**
 * Utilidades para transformación de datos de sesiones de entrenamiento
 */

/**
 * Construye un mapa de ejercicios de rutina desde los bloques
 * @param {Array} blocks - Bloques de la rutina
 * @returns {Map} Mapa de exerciseId -> exerciseData
 */
export function buildRoutineExerciseMap(blocks) {
  const map = new Map()
  if (!blocks) return map

  blocks.forEach(block => {
    block.routine_exercises.forEach(re => {
      map.set(re.id, {
        ...re,
        blockName: block.name,
        blockOrder: block.sort_order,
        isWarmup: block.name.toLowerCase() === 'calentamiento'
      })
    })
  })

  return map
}

/**
 * Agrupa ejercicios por bloque para mostrar en la UI
 * @param {Array} blocks - Bloques de la rutina
 * @returns {Array} Array de bloques con sus ejercicios formateados
 */
export function groupExercisesByBlock(blocks) {
  if (!blocks) return []

  return blocks.map(block => ({
    blockName: block.name,
    blockOrder: block.sort_order,
    isWarmup: block.name.toLowerCase() === 'calentamiento',
    durationMin: block.duration_min,
    exerciseGroups: groupExercisesBySupersetId(block.routine_exercises, block.name),
  }))
}

/**
 * Agrupa ejercicios por superset_group dentro de un bloque
 * @param {Array} exercises - Ejercicios del bloque
 * @param {string} blockName - Nombre del bloque
 * @returns {Array} Array de grupos: [{type: 'individual', exercise}, {type: 'superset', exercises, supersetId}]
 */
export function groupExercisesBySupersetId(exercises, blockName) {
  if (!exercises || exercises.length === 0) return []

  const isWarmup = blockName.toLowerCase() === 'calentamiento'
  const groups = []
  const supersetMap = new Map()

  // Ordenar por sort_order
  const sorted = [...exercises].sort((a, b) => a.sort_order - b.sort_order)

  sorted.forEach(re => {
    const enrichedExercise = {
      ...re,
      blockName,
      isWarmup,
      type: 'routine',
    }

    if (re.superset_group === null || re.superset_group === undefined) {
      // Ejercicio individual
      groups.push({
        type: 'individual',
        exercise: enrichedExercise,
      })
    } else {
      // Parte de un superset
      if (!supersetMap.has(re.superset_group)) {
        const supersetGroup = {
          type: 'superset',
          supersetId: re.superset_group,
          exercises: [],
        }
        supersetMap.set(re.superset_group, supersetGroup)
        groups.push(supersetGroup)
      }
      supersetMap.get(re.superset_group).exercises.push(enrichedExercise)
    }
  })

  return groups
}

/**
 * Construye el orden por defecto de ejercicios desde los bloques agrupados
 * @param {Array} groupedBlocks - Bloques agrupados por groupExercisesByBlock
 * @returns {Array} Lista plana de ejercicios en orden
 */
export function buildDefaultExerciseOrder(groupedBlocks) {
  const order = []
  groupedBlocks.forEach(block => {
    block.exerciseGroups.forEach(group => {
      if (group.type === 'individual') {
        order.push(group.exercise)
      } else {
        group.exercises.forEach(ex => order.push(ex))
      }
    })
  })
  return order
}

/**
 * Aplica un orden personalizado de ejercicios
 * @param {Array} exerciseOrder - Orden personalizado [{id, type}]
 * @param {Map} routineExerciseMap - Mapa de ejercicios de rutina
 * @param {Array} extraExercises - Ejercicios extra añadidos
 * @returns {Array} Lista de ejercicios en el orden especificado
 */
export function applyCustomExerciseOrder(exerciseOrder, routineExerciseMap, extraExercises) {
  return exerciseOrder.map(item => {
    if (item.type === 'routine') {
      const re = routineExerciseMap.get(item.id)
      return re ? { ...re, type: 'routine' } : null
    } else {
      const extra = extraExercises.find(e => e.id === item.id)
      return extra ? { ...extra, type: 'extra', blockName: 'Añadido' } : null
    }
  }).filter(Boolean)
}

/**
 * Detecta si el orden actual difiere del orden por defecto
 * @param {Array} flatOrder - Orden actual plano
 * @param {Array} defaultOrder - Orden por defecto
 * @param {boolean} hasExtraExercises - Si hay ejercicios extra
 * @returns {boolean}
 */
export function hasCustomOrderChanged(flatOrder, defaultOrder, hasExtraExercises) {
  if (hasExtraExercises) return true
  if (flatOrder.length !== defaultOrder.length) return true
  return flatOrder.some((ex, i) => defaultOrder[i]?.id !== ex.id)
}

/**
 * Transforma datos de bloques para la sesión de entrenamiento
 * @param {Array} blocks - Bloques de la rutina
 * @param {Array} exerciseOrder - Orden personalizado (puede estar vacío)
 * @param {Array} extraExercises - Ejercicios extra añadidos
 * @returns {{exercisesByBlock: Array, flatExercises: Array, hasCustomOrder: boolean}}
 */
export function transformWorkoutSessionData(blocks, exerciseOrder, extraExercises) {
  if (!blocks) {
    return { exercisesByBlock: [], flatExercises: [], hasCustomOrder: false }
  }

  const routineExerciseMap = buildRoutineExerciseMap(blocks)
  const exercisesByBlock = groupExercisesByBlock(blocks)
  const defaultOrder = buildDefaultExerciseOrder(exercisesByBlock)

  let flatExercises
  let hasCustomOrder

  if (exerciseOrder.length === 0) {
    flatExercises = defaultOrder
    hasCustomOrder = false
  } else {
    flatExercises = applyCustomExerciseOrder(exerciseOrder, routineExerciseMap, extraExercises)
    hasCustomOrder = hasCustomOrderChanged(flatExercises, defaultOrder, extraExercises.length > 0)
  }

  return { exercisesByBlock, flatExercises, hasCustomOrder }
}

/**
 * Construye el orden inicial de ejercicios desde bloques (para el store)
 * @param {Array} blocks - Bloques de la rutina
 * @returns {Array} Array de {id, type, blockId}
 */
export function buildExerciseOrderFromBlocks(blocks) {
  const order = []
  blocks.forEach(block => {
    block.routine_exercises.forEach(re => {
      order.push({ id: re.id, type: 'routine', blockId: block.id })
    })
  })
  return order
}
