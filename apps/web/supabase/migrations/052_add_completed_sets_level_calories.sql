-- issue #11: completed_sets no persistía `level` ni las calorías → pérdida de datos
-- silenciosa en cardio (tipos CALORIES, LEVEL_TIME, LEVEL_DISTANCE, LEVEL_CALORIES).
-- buildCompletedSetData ya calculaba level/caloriesBurned pero se caían en la capa de
-- API/hooks al no existir columnas. Nullable → no rompe filas existentes; los tipos que
-- no las usan las dejan NULL. Idempotente (IF NOT EXISTS) para re-ejecución segura.
ALTER TABLE completed_sets ADD COLUMN IF NOT EXISTS level INT;
ALTER TABLE completed_sets ADD COLUMN IF NOT EXISTS calories_burned INT;

COMMENT ON COLUMN completed_sets.level IS 'Nivel/resistencia de la máquina (tipos LEVEL_*)';
COMMENT ON COLUMN completed_sets.calories_burned IS 'Calorías quemadas (tipos CALORIES / LEVEL_CALORIES)';
