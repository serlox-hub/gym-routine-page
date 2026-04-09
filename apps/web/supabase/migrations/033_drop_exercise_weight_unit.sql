-- ============================================
-- MIGRACIÓN: Eliminar weight_unit de exercises
-- La unidad de peso es decisión del usuario, no del ejercicio.
-- Fuente de verdad: user_exercise_overrides.weight_unit > user_preferences.weight_unit > 'kg'
-- ============================================

ALTER TABLE exercises DROP COLUMN IF EXISTS weight_unit;
