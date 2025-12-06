-- ============================================
-- MIGRACIÓN: Renombrar columnas a inglés
-- Hacer la base de datos homogénea
-- ============================================

-- ============================================
-- muscle_groups
-- ============================================
ALTER TABLE muscle_groups RENAME COLUMN nombre TO name;
ALTER TABLE muscle_groups RENAME COLUMN categoria TO category;

-- ============================================
-- exercises
-- ============================================
ALTER TABLE exercises RENAME COLUMN nombre TO name;
ALTER TABLE exercises RENAME COLUMN instrucciones TO instructions;

-- ============================================
-- routines
-- ============================================
ALTER TABLE routines RENAME COLUMN nombre TO name;
ALTER TABLE routines RENAME COLUMN descripcion TO description;
ALTER TABLE routines RENAME COLUMN objetivo TO goal;

-- ============================================
-- routine_days
-- ============================================
ALTER TABLE routine_days RENAME COLUMN nombre TO name;
ALTER TABLE routine_days RENAME COLUMN duracion_estimada_min TO estimated_duration_min;
ALTER TABLE routine_days RENAME COLUMN orden TO sort_order;

-- ============================================
-- routine_blocks
-- ============================================
ALTER TABLE routine_blocks RENAME COLUMN nombre TO name;
ALTER TABLE routine_blocks RENAME COLUMN orden TO sort_order;
ALTER TABLE routine_blocks RENAME COLUMN duracion_min TO duration_min;

-- ============================================
-- routine_exercises
-- ============================================
ALTER TABLE routine_exercises RENAME COLUMN orden TO sort_order;
ALTER TABLE routine_exercises RENAME COLUMN descanso_seg TO rest_seconds;
ALTER TABLE routine_exercises RENAME COLUMN notas TO notes;

-- ============================================
-- workout_sessions
-- ============================================
ALTER TABLE workout_sessions RENAME COLUMN notas TO notes;
ALTER TABLE workout_sessions RENAME COLUMN sensacion_general TO overall_feeling;

-- ============================================
-- completed_sets
-- ============================================
ALTER TABLE completed_sets RENAME COLUMN notas TO notes;
