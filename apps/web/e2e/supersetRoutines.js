// Routines with a superset: `testData.setup.js` seeds them and `reorderExercises.spec.js` drags them.
// They live here and not in the setup because importing the setup from a spec would register its
// setup again. Each one is its own routine so they neither move the locators of the tests that use
// the base routine nor collide between specs running in parallel. Exercise names are recognizable
// and stable because drags are checked by reading the row order.
//
// A day's exercises are `[name, superset_group]`, in order.
export const SUPERSET_ROUTINES = [
  {
    // Drag to reorder (issue #88): Uno · (Dos + Tres) · Cuatro
    name: 'Rutina Superset E2E',
    description: 'Día con superserie para los e2e de arrastre',
    days: [{ name: 'Día Superset E2E', exercises: [['E2E Uno', null], ['E2E Dos', 1], ['E2E Tres', 1], ['E2E Cuatro', null]] }],
  },
  {
    // Join and leave a superset by drag (issue #89): Uno · (Dos + Tres) · Cuatro · Cinco
    name: 'Rutina Pertenencia E2E',
    description: 'Día con superserie para los e2e de pertenencia',
    days: [{
      name: 'Día Pertenencia E2E',
      exercises: [['E2E Uno', null], ['E2E Dos', 1], ['E2E Tres', 1], ['E2E Cuatro', null], ['E2E Cinco', null]],
    }],
  },
  {
    // The bare `reorder_routine_exercises` RPC (issue #89): a day with a superset and a separate one.
    name: 'Rutina RPC E2E',
    description: 'Días para el e2e de la RPC de reordenación',
    days: [
      { name: 'Día RPC A', exercises: [['E2E Uno', null], ['E2E Dos', 1], ['E2E Tres', 1]] },
      { name: 'Día RPC B', exercises: [['E2E Cuatro', null]] },
    ],
  },
]

/**
 * Ids of a seeded routine's days and of their rows, by name: `{ [dayName]: { id, rows: { [exerciseName]: rowId } } }`.
 * By name and not by `sort_order`, which is exactly what the specs change.
 */
export async function findSeededRoutine(supabase, routineName) {
  const { data: routine, error } = await supabase
    .from('routines')
    .select('routine_days(id, name, routine_exercises(id, exercise:exercises(name_es)))')
    .eq('name', routineName)
    .single()
  if (error) throw error

  const days = {}
  for (const day of routine.routine_days) {
    const rows = {}
    for (const row of day.routine_exercises) rows[row.exercise.name_es] = row.id
    days[day.name] = { id: day.id, rows }
  }
  return days
}

/**
 * Puts a seeded routine back in its seeded order and membership. The database is reset once per
 * run, not per retry: without this, a retry in CI starts from the order the failed attempt left
 * and can never pass. Row by row and not through the reorder RPC, which is under test.
 */
export async function restoreSeededRoutine(supabase, routineName) {
  const seeded = SUPERSET_ROUTINES.find(routine => routine.name === routineName)
  if (!seeded) throw new Error(`Unknown seeded routine: ${routineName}`)
  const days = await findSeededRoutine(supabase, routineName)

  for (const day of seeded.days) {
    for (const [index, [exerciseName, supersetGroup]] of day.exercises.entries()) {
      const { error } = await supabase
        .from('routine_exercises')
        .update({ sort_order: index + 1, superset_group: supersetGroup })
        .eq('id', days[day.name].rows[exerciseName])
      if (error) throw error
    }
  }
}

/** Id of the user's exercise with that name, creating it if it does not exist. */
export async function findOrCreateExercise(supabase, userId, name, muscleGroupId) {
  const { data: found } = await supabase
    .from('exercises')
    .select('id')
    .eq('user_id', userId)
    .eq('name_es', name)
    .is('deleted_at', null)
    .limit(1)

  if (found && found.length > 0) return found[0].id

  const { data: created, error } = await supabase
    .from('exercises')
    .insert({ name_es: name, tracked_fields: ['weight', 'reps'], muscle_group_id: muscleGroupId, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return created.id
}

/** Routine with its days and exercises (`[name, superset_group]`, in order). No-op if it already exists. */
export async function seedRoutine(supabase, userId, { name, description, days }) {
  const { data: existing } = await supabase
    .from('routines')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)
    .limit(1)

  if (existing && existing.length > 0) return

  const { data: muscleGroups } = await supabase.from('muscle_groups').select('id').limit(1)
  if (!muscleGroups || muscleGroups.length === 0) throw new Error('No hay grupos musculares en la BD')

  const { data: routine, error: routineError } = await supabase
    .from('routines')
    .insert({ name, description, user_id: userId })
    .select()
    .single()
  if (routineError) throw routineError

  for (const [dayIndex, day] of days.entries()) {
    const { data: createdDay, error: dayError } = await supabase
      .from('routine_days')
      .insert({ routine_id: routine.id, name: day.name, sort_order: dayIndex + 1 })
      .select()
      .single()
    if (dayError) throw dayError

    const rows = []
    for (const [index, [exerciseName, supersetGroup]] of day.exercises.entries()) {
      rows.push({
        routine_day_id: createdDay.id,
        exercise_id: await findOrCreateExercise(supabase, userId, exerciseName, muscleGroups[0].id),
        series: 3,
        reps: '10',
        rest_seconds: 90,
        sort_order: index + 1,
        is_warmup: false,
        superset_group: supersetGroup,
      })
    }
    const { error: exercisesError } = await supabase.from('routine_exercises').insert(rows)
    if (exercisesError) throw exercisesError
  }

  console.log(`   - Rutina: ${name}`)
}
