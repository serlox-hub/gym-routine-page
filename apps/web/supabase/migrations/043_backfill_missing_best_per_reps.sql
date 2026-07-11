-- ============================================
-- MIGRACIÓN: Backfill de best_per_reps ausente + recálculo de pr_rep_counts
-- Objetivo: Corregir un hueco de datos. Las sesiones creadas entre el backfill de
-- la migración 039 y el despliegue del cliente que empezó a calcular best_per_reps
-- (ventana ~2026-05-04..05-08) quedaron con best_per_reps = NULL pese a tener sets
-- weight×reps. Al leer la detección de rep-PR esa columna (no los sets crudos),
-- esas sesiones eran "invisibles" y provocaban rep-PRs falsos posteriores
-- (p. ej. un 175×9 marcado como PR cuando ya se había hecho 175×9 en una fila NULL).
--
-- Cambios:
--   1. Captura los (user_id, exercise_id) afectados (filas weight_reps con
--      best_per_reps NULL pero con best_weight/best_reps).
--   2. Rellena best_per_reps de esas filas NULL desde completed_sets.
--   3. Recalcula pr_rep_counts de los ejercicios afectados aplicando la regla de
--      DOMINANCIA (igual que la función 042: peso a N reps o más), para quitar los
--      rep-PRs falsos derivados del hueco.
--
-- Acotado a los ejercicios afectados: no reescribe el histórico de ejercicios que
-- nunca tuvieron filas NULL.
-- ============================================

-- 1. Ejercicios afectados (antes de rellenar)
CREATE TEMP TABLE _affected_ex AS
SELECT DISTINCT ess.user_id, ess.exercise_id
FROM exercise_session_stats ess
JOIN exercises e ON e.id = ess.exercise_id
WHERE ess.best_per_reps IS NULL
  AND ess.best_weight IS NOT NULL
  AND ess.best_reps IS NOT NULL
  AND e.measurement_type = 'weight_reps';

-- 2. Backfill best_per_reps SOLO en las filas NULL, desde completed_sets
WITH per_rep_max AS (
    SELECT
        cs.session_id,
        se.exercise_id,
        cs.reps_completed,
        MAX(cs.weight) AS max_weight
    FROM completed_sets cs
    JOIN session_exercises se ON se.id = cs.session_exercise_id
    JOIN exercises e ON e.id = se.exercise_id
    WHERE cs.weight > 0
      AND cs.reps_completed > 0
      AND e.measurement_type = 'weight_reps'
    GROUP BY cs.session_id, se.exercise_id, cs.reps_completed
),
agg AS (
    SELECT
        session_id,
        exercise_id,
        jsonb_object_agg(reps_completed::text, max_weight) AS bpr
    FROM per_rep_max
    GROUP BY session_id, exercise_id
)
UPDATE exercise_session_stats ess
SET best_per_reps = agg.bpr
FROM agg
WHERE ess.session_id = agg.session_id
  AND ess.exercise_id = agg.exercise_id
  AND ess.best_per_reps IS NULL;

-- 3. Reset de pr_rep_counts de los ejercicios afectados (recálculo completo)
UPDATE exercise_session_stats ess
SET pr_rep_counts = NULL
FROM _affected_ex a
WHERE ess.user_id = a.user_id
  AND ess.exercise_id = a.exercise_id;

-- 4. Recalcular pr_rep_counts con DOMINANCIA para los ejercicios afectados.
--    Un rep count N es PR si su peso supera el mejor a N reps O MÁS, del histórico
--    previo (prev_envelope) y de la propia sesión a más reps (same_session_dom).
WITH unnested AS (
    SELECT
        ess.id AS ess_id,
        ess.user_id,
        ess.exercise_id,
        ess.session_date,
        (kv.key)::SMALLINT AS rep_count,
        (kv.value)::NUMERIC AS weight
    FROM exercise_session_stats ess
    JOIN _affected_ex a
      ON a.user_id = ess.user_id AND a.exercise_id = ess.exercise_id
    CROSS JOIN LATERAL jsonb_each_text(ess.best_per_reps) kv
    WHERE ess.best_per_reps IS NOT NULL
),
enriched AS (
    SELECT
        u.ess_id,
        u.session_date,
        u.rep_count,
        u.weight,
        (SELECT MAX(p.weight) FROM unnested p
          WHERE p.user_id = u.user_id
            AND p.exercise_id = u.exercise_id
            AND p.session_date < u.session_date
            AND p.rep_count >= u.rep_count) AS prev_envelope,
        (SELECT MAX(p.weight) FROM unnested p
          WHERE p.ess_id = u.ess_id
            AND p.rep_count > u.rep_count) AS same_session_dom,
        DENSE_RANK() OVER (
            PARTITION BY u.user_id, u.exercise_id
            ORDER BY u.session_date
        ) AS session_rank
    FROM unnested u
),
prs AS (
    SELECT ess_id, rep_count
    FROM enriched
    WHERE session_rank > 1
      AND weight > GREATEST(COALESCE(prev_envelope, 0), COALESCE(same_session_dom, 0))
),
aggregated AS (
    SELECT ess_id, array_agg(rep_count ORDER BY rep_count) AS pr_rcs
    FROM prs
    GROUP BY ess_id
)
UPDATE exercise_session_stats ess
SET pr_rep_counts = aggregated.pr_rcs
FROM aggregated
WHERE ess.id = aggregated.ess_id;

DROP TABLE _affected_ex;
