-- ============================================
-- MIGRACIÓN: Eliminar columnas de tempo
-- Los usuarios que necesiten tempo lo añaden en las notas del ejercicio
-- ============================================

ALTER TABLE routine_exercises DROP COLUMN IF EXISTS tempo;
ALTER TABLE routine_exercises DROP COLUMN IF EXISTS tempo_razon;
ALTER TABLE session_exercises DROP COLUMN IF EXISTS tempo;

-- Actualizar la RPC start_workout_session para no insertar tempo
CREATE OR REPLACE FUNCTION start_workout_session(
  p_routine_day_id INT DEFAULT NULL,
  p_routine_name TEXT DEFAULT NULL,
  p_day_name TEXT DEFAULT NULL,
  p_exercises JSONB DEFAULT '[]'::JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session workout_sessions%ROWTYPE;
BEGIN
  INSERT INTO workout_sessions (routine_day_id, routine_name, day_name, status, user_id)
  VALUES (p_routine_day_id, p_routine_name, p_day_name, 'in_progress', auth.uid())
  RETURNING * INTO v_session;

  IF jsonb_array_length(p_exercises) > 0 THEN
    INSERT INTO session_exercises (
      session_id, exercise_id, routine_exercise_id, sort_order,
      series, reps, rir, rest_seconds, notes,
      superset_group, is_extra, block_name
    )
    SELECT
      v_session.id,
      (item->>'exercise_id')::INT,
      (item->>'routine_exercise_id')::INT,
      (item->>'sort_order')::INT,
      (item->>'series')::INT,
      (item->>'reps')::TEXT,
      (item->>'rir')::INT,
      (item->>'rest_seconds')::INT,
      item->>'notes',
      (item->>'superset_group')::INT,
      COALESCE((item->>'is_extra')::BOOLEAN, false),
      item->>'block_name'
    FROM jsonb_array_elements(p_exercises) AS item;
  END IF;

  RETURN json_build_object(
    'id', v_session.id,
    'routine_day_id', v_session.routine_day_id,
    'status', v_session.status,
    'started_at', v_session.started_at,
    'session_exercises', (
      SELECT COALESCE(json_agg(
        json_build_object('id', se.id, 'exercise_id', se.exercise_id, 'sort_order', se.sort_order)
        ORDER BY se.sort_order
      ), '[]'::JSON)
      FROM session_exercises se
      WHERE se.session_id = v_session.id
    )
  );
END;
$$;
