-- RPC para sustituir un ejercicio de sesión por otro, y opcionalmente también en su fila de rutina,
-- en una sola transacción. Antes eran tres escrituras sueltas desde el cliente (borrar series,
-- cambiar exercise_id, limpiar campos): si fallaba una, la sesión quedaba a medias.
--
-- SECURITY INVOKER a propósito, como la 063: protege RLS, sin reimplementar aquí el control de acceso.
--
-- El parche de campos NO se aplica aquí: se delega en update_session_exercise_with_routine (063)
-- para que haya una sola lista blanca de campos. Con p_apply_to_routine se cambia antes el
-- exercise_id de la fila de rutina, los ids coinciden y la 063 propaga el parche.
-- Sin él NO basta con que los ids difieran: tras un "solo hoy" (press banca → cinta), volver a
-- press banca "solo hoy" hace que coincidan otra vez y la 063 machacaría la fila de rutina con los
-- defaults del parche (objetivo reseteado, RIR y notas borrados). Por eso en ese caso se suelta el
-- enlace durante la llamada (la 063 sale sin tocar la rutina si no hay routine_exercise_id) y se
-- restaura después, dentro de la misma transacción.

CREATE OR REPLACE FUNCTION replace_session_exercise(
  p_session_exercise_id INTEGER,
  p_new_exercise_id INTEGER,
  p_fields JSONB,
  p_apply_to_routine BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_routine_exercise_id INTEGER;
  v_is_extra BOOLEAN;
BEGIN
  -- La FK no pasa por RLS: sin esta comprobación se podría apuntar la fila a un ejercicio privado
  -- de otro usuario, o a uno borrado (soft delete).
  PERFORM 1 FROM exercises WHERE id = p_new_exercise_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exercise_not_available' USING ERRCODE = 'P0002';
  END IF;

  SELECT routine_exercise_id, is_extra INTO v_routine_exercise_id, v_is_extra
  FROM session_exercises
  WHERE id = p_session_exercise_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_exercise_not_found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM completed_sets WHERE session_exercise_id = p_session_exercise_id;

  -- Una fila sin enlace o añadida en la sesión no tiene rutina a la que propagar: no es error.
  IF p_apply_to_routine AND v_routine_exercise_id IS NOT NULL AND NOT COALESCE(v_is_extra, FALSE) THEN
    UPDATE routine_exercises SET exercise_id = p_new_exercise_id WHERE id = v_routine_exercise_id;
  END IF;

  IF p_apply_to_routine THEN
    UPDATE session_exercises SET exercise_id = p_new_exercise_id WHERE id = p_session_exercise_id;
    PERFORM update_session_exercise_with_routine(p_session_exercise_id, p_fields);
  ELSE
    UPDATE session_exercises SET exercise_id = p_new_exercise_id, routine_exercise_id = NULL
    WHERE id = p_session_exercise_id;
    PERFORM update_session_exercise_with_routine(p_session_exercise_id, p_fields);
    UPDATE session_exercises SET routine_exercise_id = v_routine_exercise_id WHERE id = p_session_exercise_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION replace_session_exercise(INTEGER, INTEGER, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replace_session_exercise(INTEGER, INTEGER, JSONB, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION replace_session_exercise IS 'Sustituye el ejercicio de una fila de sesión (borra sus series) y, con p_apply_to_routine, también en su routine_exercise, en una sola transacción. El parche p_fields lo aplica update_session_exercise_with_routine. SECURITY INVOKER a propósito: la protege RLS.';
