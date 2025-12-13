-- Función para reordenar ejercicios de sesión en batch
-- Usa valores negativos temporales para evitar conflictos con UNIQUE constraint

CREATE OR REPLACE FUNCTION reorder_session_exercises(exercise_orders JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario tiene acceso a estos ejercicios de sesión
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(exercise_orders) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM session_exercises se
      JOIN workout_sessions ws ON ws.id = se.session_id
      WHERE se.id = (item->>'id')::int
        AND ws.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a uno o más ejercicios de sesión';
  END IF;

  -- Paso 1: Poner valores negativos temporales para liberar los slots
  UPDATE session_exercises se
  SET sort_order = -(item->>'sort_order')::int
  FROM jsonb_array_elements(exercise_orders) AS item
  WHERE se.id = (item->>'id')::int;

  -- Paso 2: Asignar los valores finales positivos
  UPDATE session_exercises se
  SET sort_order = (item->>'sort_order')::int
  FROM jsonb_array_elements(exercise_orders) AS item
  WHERE se.id = (item->>'id')::int;
END;
$$;

COMMENT ON FUNCTION reorder_session_exercises IS 'Reordena ejercicios de sesión en batch. Recibe JSONB array de {id, sort_order}';
