-- RPC para duplicar un día de rutina completo (nombre + todos sus ejercicios) en una única
-- transacción. Antes se hacía en dos escrituras independientes desde el cliente (insertar el día,
-- luego los ejercicios); si la segunda fallaba, el día ya insertado quedaba huérfano y vacío, sin
-- aviso al usuario. Al ser una función plpgsql, una excepción revierte TODO lo que la función
-- haya escrito hasta ese punto. El nombre (con el sufijo "(copia)"/"(copy)" localizado) lo calcula
-- el cliente y se pasa ya resuelto: la función no conoce el idioma de la UI.

CREATE OR REPLACE FUNCTION duplicate_routine_day(p_day_id INTEGER, p_new_name TEXT)
RETURNS routine_days
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_routine_id INTEGER;
  v_next_sort_order INTEGER;
  v_new_day routine_days%ROWTYPE;
BEGIN
  -- Mismo criterio de acceso que reorder_routine_days: el día debe pertenecer a una rutina del usuario.
  SELECT rd.routine_id INTO v_routine_id
  FROM routine_days rd
  JOIN routines r ON r.id = rd.routine_id
  WHERE rd.id = p_day_id AND r.user_id = auth.uid();

  IF v_routine_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado al día';
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_next_sort_order
  FROM routine_days
  WHERE routine_id = v_routine_id;

  INSERT INTO routine_days (routine_id, name, estimated_duration_min, sort_order)
  SELECT routine_id, p_new_name, estimated_duration_min, v_next_sort_order
  FROM routine_days
  WHERE id = p_day_id
  RETURNING * INTO v_new_day;

  -- Lista explícita a propósito (no SELECT *): id/user_id/routine_day_id no son copiables (id y
  -- routine_day_id son de la fila nueva, user_id lo rellena el trigger fn_set_routine_exercise_user_id).
  -- superset_group SÍ se preserva (a diferencia de duplicateRoutineExercise, que lo anula): aquí
  -- copia a un routine_day_id nuevo, así que no puede colisionar con un grupo del día origen.
  -- Checklist "cuando cambie el modelo de datos" en docs/routine-io.md incluye esta función.
  INSERT INTO routine_exercises (
    exercise_id, sort_order, series, reps, rir, rest_seconds, notes,
    superset_group, routine_day_id, is_warmup, target_field, level
  )
  SELECT
    exercise_id, sort_order, series, reps, rir, rest_seconds, notes,
    superset_group, v_new_day.id, is_warmup, target_field, level
  FROM routine_exercises
  WHERE routine_day_id = p_day_id;

  RETURN v_new_day;
END;
$$;

COMMENT ON FUNCTION duplicate_routine_day IS 'Duplica un día de rutina y todos sus ejercicios en una sola transacción atómica. p_new_name lo calcula el cliente (sufijo localizado).';
