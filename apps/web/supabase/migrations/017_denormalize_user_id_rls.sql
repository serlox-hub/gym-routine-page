-- ============================================
-- MIGRACIÓN: Desnormalizar user_id en routine_blocks y routine_exercises
-- Objetivo: Simplificar políticas RLS eliminando JOINs encadenados
-- ============================================

-- 1. Añadir columnas user_id
ALTER TABLE routine_blocks ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE routine_exercises ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 2. Poblar datos existentes
UPDATE routine_blocks rb SET user_id = (
  SELECT r.user_id FROM routine_days rd
  JOIN routines r ON r.id = rd.routine_id
  WHERE rd.id = rb.routine_day_id
);

UPDATE routine_exercises re SET user_id = (
  SELECT r.user_id FROM routine_blocks rb
  JOIN routine_days rd ON rd.id = rb.routine_day_id
  JOIN routines r ON r.id = rd.routine_id
  WHERE rb.id = re.routine_block_id
);

-- 3. Hacer NOT NULL después de poblar
ALTER TABLE routine_blocks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE routine_exercises ALTER COLUMN user_id SET NOT NULL;

-- 4. Crear índices
CREATE INDEX idx_routine_blocks_user ON routine_blocks(user_id);
CREATE INDEX idx_routine_exercises_user ON routine_exercises(user_id);

-- ============================================
-- 5. Triggers para propagar user_id automáticamente
-- BEFORE triggers se ejecutan antes de RLS, así que el frontend
-- no necesita enviar user_id — el trigger lo rellena.
-- ============================================

-- routine_blocks: propagar user_id desde routine_days → routines al insertar
CREATE OR REPLACE FUNCTION set_routine_block_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT r.user_id INTO NEW.user_id
    FROM routine_days rd
    JOIN routines r ON r.id = rd.routine_id
    WHERE rd.id = NEW.routine_day_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_routine_blocks_set_user_id
  BEFORE INSERT ON routine_blocks
  FOR EACH ROW
  EXECUTE FUNCTION set_routine_block_user_id();

-- routine_exercises: propagar user_id desde routine_blocks al insertar
CREATE OR REPLACE FUNCTION set_routine_exercise_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT rb.user_id INTO NEW.user_id
    FROM routine_blocks rb
    WHERE rb.id = NEW.routine_block_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_routine_exercises_set_user_id
  BEFORE INSERT ON routine_exercises
  FOR EACH ROW
  EXECUTE FUNCTION set_routine_exercise_user_id();

-- routine_exercises: sincronizar user_id al mover entre bloques (UPDATE)
CREATE OR REPLACE FUNCTION sync_routine_exercise_user_id_on_move()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.routine_block_id IS DISTINCT FROM OLD.routine_block_id THEN
    SELECT rb.user_id INTO NEW.user_id
    FROM routine_blocks rb
    WHERE rb.id = NEW.routine_block_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_routine_exercises_sync_user_id
  BEFORE UPDATE ON routine_exercises
  FOR EACH ROW
  EXECUTE FUNCTION sync_routine_exercise_user_id_on_move();

-- ============================================
-- 6. Reemplazar políticas RLS de routine_blocks (eliminar JOINs)
-- ============================================

DROP POLICY IF EXISTS "Users can view routine blocks for own routines" ON routine_blocks;
DROP POLICY IF EXISTS "Users can manage routine blocks for own routines" ON routine_blocks;
DROP POLICY IF EXISTS "Users can update routine blocks for own routines" ON routine_blocks;
DROP POLICY IF EXISTS "Users can delete routine blocks for own routines" ON routine_blocks;

CREATE POLICY "routine_blocks_select" ON routine_blocks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "routine_blocks_insert" ON routine_blocks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "routine_blocks_update" ON routine_blocks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "routine_blocks_delete" ON routine_blocks FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 7. Reemplazar políticas RLS de routine_exercises (eliminar JOINs)
-- ============================================

DROP POLICY IF EXISTS "Users can view exercises for own routines" ON routine_exercises;
DROP POLICY IF EXISTS "Users can add exercises to own routines" ON routine_exercises;
DROP POLICY IF EXISTS "Users can update exercises in own routines" ON routine_exercises;
DROP POLICY IF EXISTS "Users can delete exercises from own routines" ON routine_exercises;

CREATE POLICY "routine_exercises_select" ON routine_exercises FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "routine_exercises_insert" ON routine_exercises FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "routine_exercises_update" ON routine_exercises FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "routine_exercises_delete" ON routine_exercises FOR DELETE
  USING (user_id = auth.uid());
