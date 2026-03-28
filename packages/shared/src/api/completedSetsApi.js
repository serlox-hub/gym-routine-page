import { getClient } from './_client.js'

// ============================================
// COMPLETED SETS
// ============================================

export async function upsertCompletedSet({ sessionId, sessionExerciseId, setNumber, weight, weightUnit, repsCompleted, timeSeconds, distanceMeters, paceSeconds, rirActual, notes, videoUrl, setType }) {
  const { data, error } = await getClient()
    .from('completed_sets')
    .upsert({
      session_id: sessionId,
      session_exercise_id: sessionExerciseId,
      set_number: setNumber,
      weight,
      weight_unit: weightUnit,
      reps_completed: repsCompleted,
      time_seconds: timeSeconds,
      distance_meters: distanceMeters,
      pace_seconds: paceSeconds,
      rir_actual: rirActual,
      notes,
      video_url: videoUrl,
      set_type: setType ?? 'normal',
      completed: true,
    }, {
      onConflict: 'session_id,session_exercise_id,set_number',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSetVideo({ sessionId, sessionExerciseId, setNumber, videoUrl }) {
  const { data, error } = await getClient()
    .from('completed_sets')
    .update({ video_url: videoUrl })
    .eq('session_id', sessionId)
    .eq('session_exercise_id', sessionExerciseId)
    .eq('set_number', setNumber)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSetDetails({ sessionId, sessionExerciseId, setNumber, rirActual, notes, videoUrl, setType }) {
  const updateData = {
    rir_actual: rirActual,
    notes,
  }
  if (videoUrl !== undefined) {
    updateData.video_url = videoUrl
  }
  if (setType !== undefined) {
    updateData.set_type = setType
  }

  const { error } = await getClient()
    .from('completed_sets')
    .update(updateData)
    .eq('session_id', sessionId)
    .eq('session_exercise_id', sessionExerciseId)
    .eq('set_number', setNumber)

  if (error) throw error
}

export async function deleteCompletedSet({ sessionId, sessionExerciseId, setNumber }) {
  const { error } = await getClient()
    .from('completed_sets')
    .delete()
    .eq('session_id', sessionId)
    .eq('session_exercise_id', sessionExerciseId)
    .eq('set_number', setNumber)

  if (error) throw error
}
