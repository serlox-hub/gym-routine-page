-- ============================================
-- FIX: Jalón neutro mapeado a estrecho (505) en vez de ancho
-- La migración 029 mapeó el ejercicio custom 259 (Jalón ancho neutro)
-- al 505 (estrecho), pero debería apuntar al ancho (778).
-- ============================================

-- Los triggers de routine_exercises referencian routine_block_id (eliminado en 031).
-- Desactivar todos antes de actualizar datos.
ALTER TABLE routine_exercises DISABLE TRIGGER set_routine_exercise_user_id;
ALTER TABLE routine_exercises DISABLE TRIGGER trg_routine_exercises_set_user_id;
ALTER TABLE routine_exercises DISABLE TRIGGER trg_routine_exercises_sync_user_id;

-- Corregir mapeo jalón neutro
UPDATE routine_exercises SET exercise_id = 778 WHERE exercise_id = 505;
UPDATE session_exercises SET exercise_id = 778 WHERE exercise_id = 505;
UPDATE exercise_session_stats SET exercise_id = 778 WHERE exercise_id = 505;

-- ============================================
-- FIX: Triggers rotos en routine_exercises tras eliminar routine_blocks
-- Había 3 triggers (2 duplicados para INSERT + 1 para UPDATE) que derivaban
-- user_id via routine_blocks. Ahora la cadena es:
-- routine_exercises.routine_day_id → routine_days.routine_id → routines.user_id
-- ============================================

-- Dropear los 3 triggers y sus 3 funciones
DROP TRIGGER set_routine_exercise_user_id ON routine_exercises;
DROP TRIGGER trg_routine_exercises_set_user_id ON routine_exercises;
DROP TRIGGER trg_routine_exercises_sync_user_id ON routine_exercises;

DROP FUNCTION fn_set_routine_exercise_user_id();
DROP FUNCTION set_routine_exercise_user_id();
DROP FUNCTION sync_routine_exercise_user_id_on_move();

-- Recrear: una función para INSERT, una para UPDATE de routine_day_id
CREATE OR REPLACE FUNCTION fn_set_routine_exercise_user_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT r.user_id INTO NEW.user_id
    FROM routine_days rd
    JOIN routines r ON r.id = rd.routine_id
    WHERE rd.id = NEW.routine_day_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_sync_routine_exercise_user_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.routine_day_id IS DISTINCT FROM OLD.routine_day_id THEN
    SELECT r.user_id INTO NEW.user_id
    FROM routine_days rd
    JOIN routines r ON r.id = rd.routine_id
    WHERE rd.id = NEW.routine_day_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_routine_exercises_set_user_id
  BEFORE INSERT ON routine_exercises
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_routine_exercise_user_id();

CREATE TRIGGER trg_routine_exercises_sync_user_id
  BEFORE UPDATE ON routine_exercises
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_routine_exercise_user_id();
