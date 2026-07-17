-- ============================================
-- CATÁLOGO: Dominadas (498) pasa a reps_only
-- ============================================
-- "Dominadas / Pull-Ups" (498) es a peso corporal: solo repeticiones, sin campo
-- de peso al registrar. El lastre tiene su propio ejercicio, "Dominadas con peso /
-- Weighted Pull-Ups" (499, weight_reps). Es coherente con el resto del catálogo,
-- donde 500/501 (chin-ups / neutro) ya son reps_only.
--
-- Nota: la reasignación del historial de un usuario que había registrado dominadas
-- lastradas bajo el 498 (session_exercises/exercise_session_stats/routine_exercises
-- 498 → 499) se hizo como corrección puntual de datos directamente sobre prod, NO
-- como migración versionada, por tratarse de datos personales y no de estructura.

UPDATE exercises
SET measurement_type = 'reps_only'
WHERE id = 498 AND is_system = true;
