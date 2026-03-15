import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

/**
 * Setup que crea datos de prueba para los tests e2e.
 * Crea una rutina con días, bloques y ejercicios para que los tests
 * que dependen de datos existentes puedan ejecutarse.
 *
 * Los datos se limpian en global.teardown.js
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
      return
    }

    // Obtener un ejercicio existente (o crear uno si no hay)
    let { data: exercises } = await supabase
      .from('exercises')
      .select('id, name')
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
          name: 'Press Banca E2E Test',
          measurement_type: 'weight_reps',
          weight_unit: 'kg',
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
        goal: 'Testing',
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

    // Crear bloque
    const { data: block, error: blockError } = await supabase
      .from('routine_blocks')
      .insert({
        routine_day_id: day.id,
        name: 'Principal',
        sort_order: 1,
        duration_min: 45,
      })
      .select()
      .single()

    if (blockError) throw blockError

    // Crear ejercicio en el bloque
    const { error: routineExerciseError } = await supabase
      .from('routine_exercises')
      .insert({
        routine_block_id: block.id,
        exercise_id: exerciseId,
        series: 3,
        reps: '10',
        rir: 2,
        rest_seconds: 90,
        sort_order: 1,
      })

    if (routineExerciseError) throw routineExerciseError

    console.log('✅ Datos de prueba creados correctamente')
    console.log(`   - Rutina: ${routine.name} (id: ${routine.id})`)
    console.log(`   - Día: ${day.name}`)
    console.log(`   - Bloque: ${block.name}`)

  } catch (error) {
    console.error('❌ Error creando datos de test:', error.message)
    throw error
  } finally {
    await supabase.auth.signOut()
  }
})
