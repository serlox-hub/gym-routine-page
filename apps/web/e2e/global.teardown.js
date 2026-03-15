import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

/**
 * Teardown global que limpia los datos creados durante los tests e2e.
 * Se ejecuta después de todos los tests, hayan pasado o fallado.
 */
async function globalTeardown() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  const testEmail = process.env.E2E_TEST_EMAIL

  if (!supabaseUrl || !supabaseKey || !testEmail) {
    console.log('⚠️  No se encontraron credenciales para limpiar datos de test')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Hacer login como usuario de test para obtener su ID
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: process.env.E2E_TEST_PASSWORD,
  })

  if (authError || !authData.user) {
    console.log('⚠️  No se pudo autenticar para limpiar datos:', authError?.message)
    return
  }

  const userId = authData.user.id
  console.log(`🧹 Limpiando datos del usuario de test (${testEmail})...`)

  try {
    // Eliminar sets completados de las sesiones del usuario
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id)

      const { error: setsError } = await supabase
        .from('completed_sets')
        .delete()
        .in('session_id', sessionIds)

      if (setsError) {
        console.log('⚠️  Error eliminando completed_sets:', setsError.message)
      }
    }

    // Eliminar sesiones de workout del usuario
    const { error: sessionsError } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('user_id', userId)

    if (sessionsError) {
      console.log('⚠️  Error eliminando workout_sessions:', sessionsError.message)
    }

    // Eliminar rutinas de test (y sus días/bloques/ejercicios en cascada)
    // Primero obtenemos las rutinas del usuario
    const { data: routines } = await supabase
      .from('routines')
      .select('id')
      .eq('user_id', userId)

    if (routines && routines.length > 0) {
      const routineIds = routines.map(r => r.id)

      // Obtener días de las rutinas
      const { data: days } = await supabase
        .from('routine_days')
        .select('id')
        .in('routine_id', routineIds)

      if (days && days.length > 0) {
        const dayIds = days.map(d => d.id)

        // Obtener bloques de los días
        const { data: blocks } = await supabase
          .from('routine_blocks')
          .select('id')
          .in('routine_day_id', dayIds)

        if (blocks && blocks.length > 0) {
          const blockIds = blocks.map(b => b.id)

          // Eliminar ejercicios de rutina
          await supabase
            .from('routine_exercises')
            .delete()
            .in('routine_block_id', blockIds)
        }

        // Eliminar bloques
        await supabase
          .from('routine_blocks')
          .delete()
          .in('routine_day_id', dayIds)
      }

      // Eliminar días
      await supabase
        .from('routine_days')
        .delete()
        .in('routine_id', routineIds)

      // Eliminar rutinas
      const { error: routinesError } = await supabase
        .from('routines')
        .delete()
        .eq('user_id', userId)

      if (routinesError) {
        console.log('⚠️  Error eliminando routines:', routinesError.message)
      }
    }

    // Eliminar ejercicios creados por el usuario de test
    const { error: exercisesError } = await supabase
      .from('exercises')
      .delete()
      .eq('user_id', userId)

    if (exercisesError) {
      console.log('⚠️  Error eliminando exercises:', exercisesError.message)
    }

    // Eliminar registros de peso corporal
    const { error: bodyWeightError } = await supabase
      .from('body_weight_records')
      .delete()
      .eq('user_id', userId)

    if (bodyWeightError) {
      console.log('⚠️  Error eliminando body_weight_records:', bodyWeightError.message)
    }

    console.log('✅ Datos de test limpiados correctamente')
  } catch (error) {
    console.log('⚠️  Error durante la limpieza:', error.message)
  } finally {
    await supabase.auth.signOut()
  }
}

export default globalTeardown
