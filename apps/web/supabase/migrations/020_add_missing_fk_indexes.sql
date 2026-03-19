-- Indices en FK que faltan para optimizar joins frecuentes.
-- routine_exercises.exercise_id se usa en joins de ejercicio → rutina
-- routine_days.routine_id se usa en fetchRoutineDays(routineId)

CREATE INDEX IF NOT EXISTS idx_routine_exercises_exercise
  ON routine_exercises(exercise_id);

CREATE INDEX IF NOT EXISTS idx_routine_days_routine
  ON routine_days(routine_id);
