-- ============================================
-- MIGRACIÓN: Eliminar routine_blocks — estructura plana con is_warmup
-- ============================================
-- NOTA: Esta migración se ejecuta de forma idempotente para manejar
-- ejecuciones parciales previas.

-- 1. Añadir columnas nuevas a routine_exercises (si no existen)
ALTER TABLE routine_exercises ADD COLUMN IF NOT EXISTS routine_day_id INT;
ALTER TABLE routine_exercises ADD COLUMN IF NOT EXISTS is_warmup BOOLEAN DEFAULT FALSE;

-- 2. Migrar datos desde routine_blocks (si la tabla aún existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'routine_blocks') THEN
    UPDATE routine_exercises re
    SET
      routine_day_id = rb.routine_day_id,
      is_warmup = (rb.name = 'Calentamiento')
    FROM routine_blocks rb
    WHERE rb.id = re.routine_block_id;
  END IF;
END $$;

-- 3. Hacer routine_day_id NOT NULL y añadir FK con CASCADE
DO $$
BEGIN
  ALTER TABLE routine_exercises ALTER COLUMN routine_day_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_routine_exercises_day'
  ) THEN
    ALTER TABLE routine_exercises
      ADD CONSTRAINT fk_routine_exercises_day
      FOREIGN KEY (routine_day_id) REFERENCES routine_days(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Eliminar políticas RLS antiguas que referencian routine_block_id
DROP POLICY IF EXISTS "Users can view routine exercises for own routines" ON routine_exercises;
DROP POLICY IF EXISTS "Users can manage routine exercises for own routines" ON routine_exercises;
DROP POLICY IF EXISTS "Users can update routine exercises for own routines" ON routine_exercises;
DROP POLICY IF EXISTS "Users can delete routine exercises for own routines" ON routine_exercises;

-- 5. Eliminar columna routine_block_id (si existe) y tabla routine_blocks
ALTER TABLE routine_exercises DROP COLUMN IF EXISTS routine_block_id;
DROP TABLE IF EXISTS routine_blocks CASCADE;

-- 6. Actualizar indexes
DROP INDEX IF EXISTS idx_routine_exercises_block;
DROP INDEX IF EXISTS idx_routine_exercises_superset;
DROP INDEX IF EXISTS idx_routine_blocks_day;
DROP INDEX IF EXISTS idx_routine_blocks_user;
CREATE INDEX IF NOT EXISTS idx_routine_exercises_day ON routine_exercises(routine_day_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_day_superset ON routine_exercises(routine_day_id, superset_group);

-- 7. Migrar session_exercises: añadir is_warmup, poblar desde block_name
ALTER TABLE session_exercises ADD COLUMN IF NOT EXISTS is_warmup BOOLEAN DEFAULT FALSE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_exercises' AND column_name = 'block_name'
  ) THEN
    UPDATE session_exercises SET is_warmup = (block_name = 'Calentamiento');
    ALTER TABLE session_exercises DROP COLUMN block_name;
  END IF;
END $$;

-- 8. Eliminar triggers y funciones de routine_blocks (017)
DROP TRIGGER IF EXISTS set_routine_exercise_user_id ON routine_exercises;
DROP FUNCTION IF EXISTS fn_set_routine_exercise_user_id();
DROP TRIGGER IF EXISTS sync_routine_exercise_user_id_on_move ON routine_exercises;
DROP FUNCTION IF EXISTS fn_sync_routine_exercise_user_id_on_move();
DROP FUNCTION IF EXISTS fn_set_routine_block_user_id();

-- 9. Crear trigger nuevo: routine_exercises.user_id desde routine_days
CREATE OR REPLACE FUNCTION fn_set_routine_exercise_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := (SELECT r.user_id FROM routine_days rd
    JOIN routines r ON r.id = rd.routine_id
    WHERE rd.id = NEW.routine_day_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_routine_exercise_user_id
  BEFORE INSERT ON routine_exercises
  FOR EACH ROW EXECUTE FUNCTION fn_set_routine_exercise_user_id();

-- 10. Actualizar RPC reorder_routine_exercises
CREATE OR REPLACE FUNCTION reorder_routine_exercises(exercise_orders JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(exercise_orders) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM routine_exercises re
      JOIN routine_days rd ON rd.id = re.routine_day_id
      JOIN routines r ON r.id = rd.routine_id
      WHERE re.id = (item->>'id')::int
        AND r.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a uno o más ejercicios';
  END IF;

  UPDATE routine_exercises re
  SET sort_order = (item->>'sort_order')::int
  FROM jsonb_array_elements(exercise_orders) AS item
  WHERE re.id = (item->>'id')::int;
END;
$$;

-- 11. Actualizar RPC start_workout_session
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
      superset_group, is_extra, is_warmup
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
      COALESCE((item->>'is_warmup')::BOOLEAN, false)
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
