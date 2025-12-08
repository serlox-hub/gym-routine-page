-- Añadir columnas para guardar nombres desnormalizados en workout_sessions
-- Esto permite mantener el histórico aunque se elimine la rutina

ALTER TABLE workout_sessions
ADD COLUMN routine_name TEXT,
ADD COLUMN day_name TEXT;

-- Cambiar FK de routine_day_id a SET NULL para permitir eliminar rutinas
ALTER TABLE workout_sessions
DROP CONSTRAINT IF EXISTS workout_sessions_routine_day_id_fkey;

ALTER TABLE workout_sessions
ADD CONSTRAINT workout_sessions_routine_day_id_fkey
FOREIGN KEY (routine_day_id) REFERENCES routine_days(id) ON DELETE SET NULL;

-- Cambiar FK de routine_exercise_id en session_exercises a SET NULL
ALTER TABLE session_exercises
DROP CONSTRAINT IF EXISTS session_exercises_routine_exercise_id_fkey;

ALTER TABLE session_exercises
ADD CONSTRAINT session_exercises_routine_exercise_id_fkey
FOREIGN KEY (routine_exercise_id) REFERENCES routine_exercises(id) ON DELETE SET NULL;

-- Migrar datos existentes: copiar nombres desde las relaciones
UPDATE workout_sessions ws
SET
  day_name = rd.name,
  routine_name = r.name
FROM routine_days rd
JOIN routines r ON r.id = rd.routine_id
WHERE ws.routine_day_id = rd.id
AND ws.day_name IS NULL;

-- Soft delete para ejercicios
ALTER TABLE exercises
ADD COLUMN deleted_at TIMESTAMPTZ;
