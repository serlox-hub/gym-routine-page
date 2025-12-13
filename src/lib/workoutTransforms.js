/**
 * Utilidades para transformación de datos de sesiones de entrenamiento
 */

// ============================================
// SESSION EXERCISES (nueva tabla)
// ============================================

/**
 * Transforma session_exercises de la BD al formato esperado por los componentes
 * @param {Array} sessionExercises - Ejercicios de la sesión desde session_exercises
 * @returns {{exercisesByBlock: Array, flatExercises: Array}}
 */
export function transformSessionExercises(sessionExercises) {
  if (!sessionExercises || sessionExercises.length === 0) {
    return { exercisesByBlock: [], flatExercises: [] }
  }

  // Ordenar por sort_order
  const sorted = [...sessionExercises].sort((a, b) => a.sort_order - b.sort_order)

  // Agrupar por bloque
  const blockMap = new Map()
  sorted.forEach(se => {
    const blockName = se.block_name || 'Principal'
    if (!blockMap.has(blockName)) {
      blockMap.set(blockName, {
        blockName,
        isWarmup: blockName.toLowerCase() === 'calentamiento',
        exerciseGroups: [],
      })
    }
  })

  // Crear grupos de ejercicios (individuales y supersets)
  const supersetMap = new Map()

  sorted.forEach(se => {
    const blockName = se.block_name || 'Principal'
    const block = blockMap.get(blockName)

    const enrichedExercise = {
      id: se.id,
      sessionExerciseId: se.id,
      exercise: se.exercise,
      exercise_id: se.exercise_id,
      series: se.series,
      reps: se.reps,
      rir: se.rir,
      rest_seconds: se.rest_seconds,
      tempo: se.tempo,
      notes: se.notes,
      superset_group: se.superset_group,
      is_extra: se.is_extra,
      routine_exercise: se.routine_exercise,
      blockName,
      isWarmup: blockName.toLowerCase() === 'calentamiento',
      type: se.is_extra ? 'extra' : 'routine',
    }

    if (se.superset_group === null || se.superset_group === undefined) {
      // Ejercicio individual
      block.exerciseGroups.push({
        type: 'individual',
        exercise: enrichedExercise,
      })
    } else {
      // Parte de un superset
      const supersetKey = `${blockName}-${se.superset_group}`
      if (!supersetMap.has(supersetKey)) {
        const supersetGroup = {
          type: 'superset',
          supersetId: se.superset_group,
          exercises: [],
        }
        supersetMap.set(supersetKey, supersetGroup)
        block.exerciseGroups.push(supersetGroup)
      }
      supersetMap.get(supersetKey).exercises.push(enrichedExercise)
    }
  })

  // Construir exercisesByBlock en orden predeterminado
  const exercisesByBlock = []
  const warmupBlock = blockMap.get('Calentamiento')
  if (warmupBlock && warmupBlock.exerciseGroups.length > 0) {
    exercisesByBlock.push(warmupBlock)
  }
  const mainBlock = blockMap.get('Principal')
  if (mainBlock && mainBlock.exerciseGroups.length > 0) {
    exercisesByBlock.push(mainBlock)
  }
  const addedBlock = blockMap.get('Añadido')
  if (addedBlock && addedBlock.exerciseGroups.length > 0) {
    exercisesByBlock.push(addedBlock)
  }

  // flatExercises mantiene el orden de sort_order
  const flatExercises = sorted.map(se => ({
    id: se.id,
    sessionExerciseId: se.id,
    exercise: se.exercise,
    exercise_id: se.exercise_id,
    series: se.series,
    reps: se.reps,
    rir: se.rir,
    rest_seconds: se.rest_seconds,
    tempo: se.tempo,
    notes: se.notes,
    superset_group: se.superset_group,
    is_extra: se.is_extra,
    routine_exercise: se.routine_exercise,
    blockName: se.block_name || 'Principal',
    isWarmup: (se.block_name || '').toLowerCase() === 'calentamiento',
    type: se.is_extra ? 'extra' : 'routine',
  }))

  return { exercisesByBlock, flatExercises }
}

/**
 * Construye los datos para insertar en session_exercises desde routine_exercises
 * @param {Array} blocks - Bloques de la rutina
 * @returns {Array} Array de objetos listos para insertar en session_exercises
 */
export function buildSessionExercisesFromBlocks(blocks) {
  if (!blocks) return []

  const sessionExercises = []
  let sortOrder = 1

  blocks.forEach(block => {
    const blockExercises = [...(block.routine_exercises || [])].sort(
      (a, b) => a.sort_order - b.sort_order
    )

    blockExercises.forEach(re => {
      sessionExercises.push({
        exercise_id: re.exercise_id,
        routine_exercise_id: re.id,
        sort_order: sortOrder++,
        series: re.series,
        reps: re.reps,
        rir: re.rir,
        rest_seconds: re.rest_seconds,
        tempo: re.tempo,
        notes: re.notes,
        superset_group: re.superset_group,
        is_extra: false,
        block_name: block.name,
      })
    })
  })

  return sessionExercises
}

// ============================================
// ROUTINE EXERCISES (funciones legacy para rutinas)
// ============================================

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

