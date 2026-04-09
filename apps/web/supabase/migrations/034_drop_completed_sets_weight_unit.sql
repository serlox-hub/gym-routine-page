-- ============================================
-- MIGRACIÓN: Eliminar weight_unit de completed_sets
-- La unidad de peso se resuelve en runtime:
-- user_exercise_overrides.weight_unit > user_preferences.weight_unit > 'kg'
-- No necesita almacenarse por serie.
-- ============================================

ALTER TABLE completed_sets DROP COLUMN IF EXISTS weight_unit;
