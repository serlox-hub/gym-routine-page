-- ============================================
-- MIGRACIÓN: Añadir rep-PR-por-rep-count (modelo Strong/Hevy)
-- Objetivo: Trackear el mejor peso por cada número exacto de repeticiones,
-- además del 1RM y el peso máximo absoluto que ya existían.
--
-- Cambios:
--   1. Añade columnas best_per_reps (JSONB) y pr_rep_counts (SMALLINT[])
--   2. Backfill best_per_reps desde completed_sets (solo weight_reps)
--   3. Backfill pr_rep_counts cronológicamente
--   4. Extiende recalculate_exercise_prs() para mantener pr_rep_counts
--
-- NOTA: is_pr_reps y best_reps NO se tocan aquí. Se mantienen vivos:
--   - is_pr_reps sigue siendo el mecanismo de PR para measurement_type='reps_only'
--     (dominadas, fondos, etc.) — no se puede limpiar hasta migrar reps_only.
--   - best_reps lo usan los charts como info de "máximo de reps por sesión".
-- Esta migración es puramente aditiva.
-- ============================================

-- ============================================
-- 1. SCHEMA: Nuevas columnas
-- ============================================

ALTER TABLE exercise_session_stats
    ADD COLUMN best_per_reps JSONB,
    ADD COLUMN pr_rep_counts SMALLINT[];

COMMENT ON COLUMN exercise_session_stats.best_per_reps IS
    'Mejor peso de esta sesión por número exacto de reps. Ej: {"1": 120, "5": 100}. NULL si no aplica (no weight_reps o sesión sin sets válidos).';
COMMENT ON COLUMN exercise_session_stats.pr_rep_counts IS
    'Rep counts de esta sesión que superaron el récord histórico previo. NULL si no hubo rep-PRs.';

-- Índice GIN para localizar sesiones con rep-PR (badge en historial)
CREATE INDEX idx_ess_pr_rep_counts ON exercise_session_stats
    USING GIN (pr_rep_counts) WHERE pr_rep_counts IS NOT NULL;

-- ============================================
-- 2. BACKFILL: best_per_reps desde completed_sets
-- Solo para ejercicios con measurement_type='weight_reps'.
-- Para cada sesión × ejercicio, agrupa por reps_completed y guarda
-- el peso máximo de cada grupo en un JSONB.
-- ============================================

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
  AND ess.exercise_id = agg.exercise_id;

-- ============================================
-- 3. BACKFILL: pr_rep_counts cronológicamente
-- Para cada (user, exercise, rep_count), una sesión es rep-PR si:
--   - El ejercicio tiene historial previo a esta sesión, Y
--   - El peso supera el máximo previo en ese rep count
--     (o no había historial en ese rep count).
-- Primera sesión del ejercicio nunca es PR (convención existente).
-- ============================================

WITH unnested AS (
    -- Explotar el JSONB a (rep_count, weight) por fila
    SELECT
        ess.id AS ess_id,
        ess.user_id,
        ess.exercise_id,
        ess.session_date,
        (kv.key)::SMALLINT AS rep_count,
        (kv.value)::NUMERIC AS weight
    FROM exercise_session_stats ess,
         LATERAL jsonb_each_text(ess.best_per_reps) kv
    WHERE ess.best_per_reps IS NOT NULL
),
ranked AS (
    SELECT
        u.ess_id,
        u.user_id,
        u.exercise_id,
        u.session_date,
        u.rep_count,
        u.weight,
        -- Mejor peso histórico previo en este rep count (NULL si primera vez)
        MAX(u.weight) OVER (
            PARTITION BY u.user_id, u.exercise_id, u.rep_count
            ORDER BY u.session_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS prev_max_at_repcount,
        -- ¿Es la primera sesión del ejercicio? Cuenta cuántas sesiones distintas
        -- (no rows) hubo antes para este (user, exercise).
        DENSE_RANK() OVER (
            PARTITION BY u.user_id, u.exercise_id
            ORDER BY u.session_date
        ) AS exercise_session_rank
    FROM unnested u
),
prs AS (
    SELECT ess_id, rep_count
    FROM ranked
    WHERE exercise_session_rank > 1
      AND (
          prev_max_at_repcount IS NULL  -- primera vez a este rep count, con historial
          OR weight > prev_max_at_repcount
      )
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

-- ============================================
-- 4. RPC: Extender recalculate_exercise_prs
-- Mantiene comportamiento existente y añade recálculo de pr_rep_counts
-- desde la fecha indicada.
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_exercise_prs(
    p_exercise_id INT,
    p_after_date TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
    -- Reset flags y pr_rep_counts desde la fecha indicada.
    UPDATE exercise_session_stats
    SET is_pr_weight = FALSE,
        is_pr_reps = FALSE,
        is_pr_1rm = FALSE,
        is_pr_volume = FALSE,
        is_pr_time = FALSE,
        is_pr_distance = FALSE,
        is_pr_pace = FALSE,
        pr_rep_counts = NULL
    WHERE exercise_id = p_exercise_id
      AND user_id = auth.uid()
      AND session_date >= p_after_date;

    -- Recalcular: PR de peso (heaviest ever, cualquier rep count)
    WITH ranked AS (
        SELECT id, best_weight,
            MAX(best_weight) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid() AND best_weight IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_weight = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_weight > r.prev_max
      AND ess.session_date >= p_after_date;

    -- Recalcular: PR de reps (mantiene reps_only; weight_reps lo ignora vía PR_METRIC_MAP)
    WITH ranked AS (
        SELECT id, best_reps,
            MAX(best_reps) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid() AND best_reps IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_reps = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_reps > r.prev_max
      AND ess.session_date >= p_after_date;

    -- Recalcular: PR de 1RM
    WITH ranked AS (
        SELECT id, best_1rm,
            MAX(best_1rm) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid() AND best_1rm IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_1rm = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_1rm > r.prev_max
      AND ess.session_date >= p_after_date;

    -- Recalcular: PR de volumen
    WITH ranked AS (
        SELECT id, total_volume,
            MAX(total_volume) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid() AND total_volume IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_volume = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.total_volume > r.prev_max
      AND ess.session_date >= p_after_date;

    -- Recalcular: PR de tiempo
    WITH ranked AS (
        SELECT id, best_time_seconds,
            MAX(best_time_seconds) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid() AND best_time_seconds IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_time = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_time_seconds > r.prev_max
      AND ess.session_date >= p_after_date;

    -- Recalcular: PR de distancia
    WITH ranked AS (
        SELECT id, best_distance_meters,
            MAX(best_distance_meters) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid() AND best_distance_meters IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_distance = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_distance_meters > r.prev_max
      AND ess.session_date >= p_after_date;

    -- Recalcular: PR de pace (menor = mejor)
    WITH ranked AS (
        SELECT id, best_pace_seconds,
            MIN(best_pace_seconds) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_min,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid() AND best_pace_seconds IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_pace = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_pace_seconds < r.prev_min
      AND ess.session_date >= p_after_date;

    -- Recalcular: pr_rep_counts (nuevo, modelo Strong/Hevy)
    -- Para cada (rep_count) en best_per_reps de cada sesión, comprobar
    -- si supera el récord histórico de ese rep count o es la primera vez.
    WITH unnested AS (
        SELECT
            ess.id AS ess_id,
            ess.session_date,
            (kv.key)::SMALLINT AS rep_count,
            (kv.value)::NUMERIC AS weight
        FROM exercise_session_stats ess,
             LATERAL jsonb_each_text(ess.best_per_reps) kv
        WHERE ess.exercise_id = p_exercise_id
          AND ess.user_id = auth.uid()
          AND ess.best_per_reps IS NOT NULL
    ),
    ranked AS (
        SELECT
            u.ess_id,
            u.session_date,
            u.rep_count,
            u.weight,
            MAX(u.weight) OVER (
                PARTITION BY u.rep_count
                ORDER BY u.session_date
                ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
            ) AS prev_max_at_repcount,
            DENSE_RANK() OVER (ORDER BY u.session_date) AS exercise_session_rank
        FROM unnested u
    ),
    prs AS (
        SELECT ess_id, rep_count
        FROM ranked
        WHERE exercise_session_rank > 1
          AND session_date >= p_after_date
          AND (
              prev_max_at_repcount IS NULL
              OR weight > prev_max_at_repcount
          )
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
