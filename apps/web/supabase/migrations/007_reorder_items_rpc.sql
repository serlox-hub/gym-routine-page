-- Función genérica para reordenar items en una tabla
-- Recibe el nombre de la tabla y un array de {id, sort_order}
-- Usa una sola query UPDATE con JOIN en lugar de N queries individuales

-- ============================================
-- REORDER ROUTINE EXERCISES
-- ============================================

CREATE OR REPLACE FUNCTION reorder_routine_exercises(exercise_orders JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario tiene acceso a estos ejercicios
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(exercise_orders) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM routine_exercises re
      JOIN routine_blocks rb ON rb.id = re.routine_block_id
      JOIN routine_days rd ON rd.id = rb.routine_day_id
      JOIN routines r ON r.id = rd.routine_id
      WHERE re.id = (item->>'id')::int
        AND r.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a uno o más ejercicios';
  END IF;

  -- Actualizar todos los sort_order en una sola operación
  UPDATE routine_exercises re
  SET sort_order = (item->>'sort_order')::int
  FROM jsonb_array_elements(exercise_orders) AS item
  WHERE re.id = (item->>'id')::int;
END;
$$;

-- ============================================
-- REORDER ROUTINE DAYS
-- ============================================

CREATE OR REPLACE FUNCTION reorder_routine_days(day_orders JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario tiene acceso a estos días
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(day_orders) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM routine_days rd
      JOIN routines r ON r.id = rd.routine_id
      WHERE rd.id = (item->>'id')::int
        AND r.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a uno o más días';
  END IF;

  -- Actualizar todos los sort_order en una sola operación
  UPDATE routine_days rd
  SET sort_order = (item->>'sort_order')::int
  FROM jsonb_array_elements(day_orders) AS item
  WHERE rd.id = (item->>'id')::int;
END;
$$;

COMMENT ON FUNCTION reorder_routine_exercises IS 'Reordena ejercicios de rutina en batch. Recibe JSONB array de {id, sort_order}';
COMMENT ON FUNCTION reorder_routine_days IS 'Reordena días de rutina en batch. Recibe JSONB array de {id, sort_order}';
