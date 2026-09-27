-- RPC para editar un ejercicio de sesión y propagar el cambio a su ejercicio de rutina en una
-- sola transacción. Antes eran dos UPDATE independientes desde el cliente: si fallaba el segundo,
-- la sesión quedaba editada y la rutina no, y el reintento del usuario ya no veía diferencia.
--
-- SECURITY INVOKER a propósito (a diferencia de los otros RPC): así protege RLS, igual que cuando
-- el cliente escribía directo, sin reimplementar aquí el control de acceso. Una fila que RLS
-- oculta no se actualiza y cuenta como "no encontrada".
--
-- p_fields es un parche: solo se tocan las claves PRESENTES (una clave con null pone NULL; una
-- clave ausente deja el valor). Una clave desconocida revienta en vez de ignorarse en silencio.
-- Solo se propaga si la fila viene de la rutina (routine_exercise_id), no se añadió en la sesión y
-- sigue siendo el MISMO ejercicio: tras sustituirlo solo en la sesión (press banca → cinta) el enlace
-- se conserva, y sin esta condición editar el objetivo a "20min" lo escribiría en la fila de press banca.

CREATE OR REPLACE FUNCTION update_session_exercise_with_routine(p_session_exercise_id INTEGER, p_fields JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_routine_exercise_id INTEGER;
  v_is_extra BOOLEAN;
  v_exercise_id INTEGER;
  v_unknown TEXT;
BEGIN
  SELECT k INTO v_unknown
  FROM jsonb_object_keys(p_fields) AS k
  WHERE k NOT IN ('series', 'target_field', 'reps', 'level', 'rir', 'rest_seconds', 'notes', 'superset_group')
  LIMIT 1;

  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'unknown_field: %', v_unknown USING ERRCODE = '22023';
  END IF;

  UPDATE session_exercises SET
    series         = CASE WHEN p_fields ? 'series'         THEN (p_fields->>'series')::SMALLINT               ELSE series END,
    target_field   = CASE WHEN p_fields ? 'target_field'   THEN (p_fields->>'target_field')::measurement_field ELSE target_field END,
    reps           = CASE WHEN p_fields ? 'reps'           THEN p_fields->>'reps'                             ELSE reps END,
    level          = CASE WHEN p_fields ? 'level'          THEN (p_fields->>'level')::SMALLINT                ELSE level END,
    rir            = CASE WHEN p_fields ? 'rir'            THEN (p_fields->>'rir')::SMALLINT                  ELSE rir END,
    rest_seconds   = CASE WHEN p_fields ? 'rest_seconds'   THEN (p_fields->>'rest_seconds')::INTEGER          ELSE rest_seconds END,
    notes          = CASE WHEN p_fields ? 'notes'          THEN p_fields->>'notes'                            ELSE notes END,
    superset_group = CASE WHEN p_fields ? 'superset_group' THEN (p_fields->>'superset_group')::INTEGER        ELSE superset_group END
  WHERE id = p_session_exercise_id
  RETURNING routine_exercise_id, is_extra, exercise_id INTO v_routine_exercise_id, v_is_extra, v_exercise_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_exercise_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_routine_exercise_id IS NULL OR COALESCE(v_is_extra, FALSE) THEN
    RETURN;
  END IF;

  -- Borrar el routine_exercise pone routine_exercise_id a NULL (FK ON DELETE SET NULL) y ya se sale
  -- arriba. 0 filas aquí pasa si el ejercicio se sustituyó solo en la sesión, por un borrado
  -- concurrente o porque RLS la oculta, y no es error: la edición de la sesión sigue siendo válida.
  UPDATE routine_exercises SET
    series         = CASE WHEN p_fields ? 'series'         THEN (p_fields->>'series')::SMALLINT               ELSE series END,
    target_field   = CASE WHEN p_fields ? 'target_field'   THEN (p_fields->>'target_field')::measurement_field ELSE target_field END,
    reps           = CASE WHEN p_fields ? 'reps'           THEN p_fields->>'reps'                             ELSE reps END,
    level          = CASE WHEN p_fields ? 'level'          THEN (p_fields->>'level')::SMALLINT                ELSE level END,
    rir            = CASE WHEN p_fields ? 'rir'            THEN (p_fields->>'rir')::SMALLINT                  ELSE rir END,
    rest_seconds   = CASE WHEN p_fields ? 'rest_seconds'   THEN (p_fields->>'rest_seconds')::INTEGER          ELSE rest_seconds END,
    notes          = CASE WHEN p_fields ? 'notes'          THEN p_fields->>'notes'                            ELSE notes END,
    superset_group = CASE WHEN p_fields ? 'superset_group' THEN (p_fields->>'superset_group')::INTEGER        ELSE superset_group END
  WHERE id = v_routine_exercise_id
    AND exercise_id = v_exercise_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_session_exercise_with_routine(INTEGER, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_session_exercise_with_routine(INTEGER, JSONB) TO authenticated;

COMMENT ON FUNCTION update_session_exercise_with_routine IS 'Edita un ejercicio de sesión y propaga los mismos campos a su routine_exercise en una sola transacción. p_fields es un parche: solo cambian las claves presentes. SECURITY INVOKER a propósito: la protege RLS. Pasarla a DEFINER sin comprobar auth.uid() en las dos tablas dejaría editar ejercicios de otro usuario.';
