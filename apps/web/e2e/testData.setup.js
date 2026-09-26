import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../scripts/loadEnv.js'
import { SUPERSET_ROUTINES } from './supersetRoutines.js'

/**
 * Setup que crea datos de prueba para los tests e2e.
 * Crea una rutina con día y ejercicio para que los tests que dependen de datos existentes
 * puedan ejecutarse.
 *
 * Nadie limpia estos datos: `npm run test:e2e` resetea la BD antes de cada ejecución, así que
 * siempre parte de cero. La comprobación de "ya existe" solo cubre relanzar Playwright a mano
 * sobre una BD ya sembrada.
 */
setup('create test data', async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  const testEmail = process.env.E2E_TEST_EMAIL
  const testPassword = process.env.E2E_TEST_PASSWORD

  if (!supabaseUrl || !supabaseKey || !testEmail || !testPassword) {
    console.log('⚠️  Faltan variables de entorno para crear datos de test')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Autenticar como usuario de test
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (authError || !authData.user) {
    throw new Error(`No se pudo autenticar para crear datos de test: ${authError?.message}`)
  }

  const userId = authData.user.id
  console.log(`📦 Creando datos de prueba para ${testEmail}...`)

  try {
    // Verificar si ya existe una rutina de test
    const { data: existingRoutines } = await supabase
      .from('routines')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'Rutina E2E Test')
      .limit(1)

    if (existingRoutines && existingRoutines.length > 0) {
      console.log('✅ Datos de test ya existen, saltando creación')
      await seedSupersetRoutines(supabase, userId)
      return
    }

    // Obtener un ejercicio existente (o crear uno si no hay)
    let { data: exercises } = await supabase
      .from('exercises')
      .select('id, name:name_es')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .limit(1)

    let exerciseId

    if (!exercises || exercises.length === 0) {
      // Obtener grupo muscular
      const { data: muscleGroups } = await supabase
        .from('muscle_groups')
        .select('id')
        .limit(1)

      if (!muscleGroups || muscleGroups.length === 0) {
        throw new Error('No hay grupos musculares en la BD')
      }

      // Crear ejercicio de test
      const { data: newExercise, error: exerciseError } = await supabase
        .from('exercises')
        .insert({
          name_es: 'Press Banca E2E Test',
          tracked_fields: ['weight', 'reps'],
          muscle_group_id: muscleGroups[0].id,
          user_id: userId,
        })
        .select()
        .single()

      if (exerciseError) throw exerciseError
      exerciseId = newExercise.id
    } else {
      exerciseId = exercises[0].id
    }

    // Crear rutina de test
    const { data: routine, error: routineError } = await supabase
      .from('routines')
      .insert({
        name: 'Rutina E2E Test',
        description: 'Rutina creada automáticamente para tests e2e',
        user_id: userId,
      })
      .select()
      .single()

    if (routineError) throw routineError

    // Crear día
    const { data: day, error: dayError } = await supabase
      .from('routine_days')
      .insert({
        routine_id: routine.id,
        name: 'Día Test',
        estimated_duration_min: 45,
        sort_order: 1,
      })
      .select()
      .single()

    if (dayError) throw dayError

    // Crear ejercicio en el día
    const { error: routineExerciseError } = await supabase
      .from('routine_exercises')
      .insert({
        routine_day_id: day.id,
        exercise_id: exerciseId,
        series: 3,
        reps: '10',
        rir: 2,
        rest_seconds: 90,
        sort_order: 1,
        is_warmup: false,
      })

    if (routineExerciseError) throw routineExerciseError

    await seedSupersetRoutines(supabase, userId)

    console.log('✅ Datos de prueba creados correctamente')
    console.log(`   - Rutina: ${routine.name} (id: ${routine.id})`)
    console.log(`   - Día: ${day.name}`)

  } catch (error) {
    console.error('❌ Error creando datos de test:', error.message)
    throw error
  } finally {
    await supabase.auth.signOut()
  }
})

async function seedSupersetRoutines(supabase, userId) {
  for (const routine of SUPERSET_ROUTINES) await seedRoutine(supabase, userId, routine)
}

/** Id of the user's exercise with that name, creating it if it does not exist. */
async function findOrCreateExercise(supabase, userId, name, muscleGroupId) {
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
async function seedRoutine(supabase, userId, { name, description, days }) {
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
