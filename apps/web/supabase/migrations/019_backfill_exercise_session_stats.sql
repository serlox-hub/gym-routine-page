-- ============================================
-- MIGRACIÓN: Backfill exercise_session_stats + función de recalculación
-- Ejecutar DESPUÉS de 018_exercise_session_stats.sql
-- ============================================

-- ============================================
-- 1. BACKFILL: Poblar tabla con datos históricos
-- ============================================

-- Paso 1a: Insertar stats agregados por ejercicio/sesión
INSERT INTO exercise_session_stats (
    user_id, exercise_id, session_id, session_date,
    best_weight, best_reps, best_1rm, total_volume, total_sets,
    best_time_seconds, best_distance_meters, best_pace_seconds
)
SELECT
    ws.user_id,
    se.exercise_id,
    ws.id AS session_id,
    ws.started_at AS session_date,
    MAX(cs.weight) AS best_weight,
    MAX(cs.reps_completed) AS best_reps,
    MAX(
        CASE
            WHEN cs.weight > 0 AND cs.reps_completed > 0 THEN
                ROUND(cs.weight * (1 + cs.reps_completed::NUMERIC / 30))
            ELSE NULL
        END
    ) AS best_1rm,
    SUM(
        CASE
            WHEN cs.weight > 0 AND cs.reps_completed > 0 THEN cs.weight * cs.reps_completed
            ELSE 0
        END
    ) AS total_volume,
    COUNT(cs.id)::SMALLINT AS total_sets,
    MAX(cs.time_seconds) AS best_time_seconds,
    MAX(cs.distance_meters) AS best_distance_meters,
    MIN(CASE WHEN cs.pace_seconds > 0 THEN cs.pace_seconds ELSE NULL END) AS best_pace_seconds
FROM workout_sessions ws
JOIN session_exercises se ON se.session_id = ws.id
JOIN completed_sets cs ON cs.session_exercise_id = se.id AND cs.session_id = ws.id
WHERE ws.status = 'completed'
GROUP BY ws.user_id, se.exercise_id, ws.id, ws.started_at;

-- Paso 1b: Limpiar valores 0 → NULL para consistencia
UPDATE exercise_session_stats SET best_weight = NULL WHERE best_weight = 0;
UPDATE exercise_session_stats SET best_reps = NULL WHERE best_reps = 0;
UPDATE exercise_session_stats SET best_1rm = NULL WHERE best_1rm = 0;
UPDATE exercise_session_stats SET total_volume = NULL WHERE total_volume = 0;
UPDATE exercise_session_stats SET best_time_seconds = NULL WHERE best_time_seconds = 0;
UPDATE exercise_session_stats SET best_distance_meters = NULL WHERE best_distance_meters = 0;
UPDATE exercise_session_stats SET best_pace_seconds = NULL WHERE best_pace_seconds = 0;

-- Paso 1c: Calcular flags de PR cronológicamente
-- Para cada ejercicio/usuario, marcar como PR si supera el máximo previo.
-- Primera sesión de cada ejercicio nunca es PR.

-- PR de peso
WITH ranked AS (
    SELECT id, exercise_id, user_id, session_date, best_weight,
        MAX(best_weight) OVER (
            PARTITION BY user_id, exercise_id
            ORDER BY session_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS prev_max_weight,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, exercise_id ORDER BY session_date
        ) AS rn
    FROM exercise_session_stats
    WHERE best_weight IS NOT NULL
)
UPDATE exercise_session_stats ess
SET is_pr_weight = TRUE
FROM ranked r
WHERE ess.id = r.id AND r.rn > 1 AND r.best_weight > r.prev_max_weight;

-- PR de reps
WITH ranked AS (
    SELECT id, exercise_id, user_id, session_date, best_reps,
        MAX(best_reps) OVER (
            PARTITION BY user_id, exercise_id
            ORDER BY session_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS prev_max,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, exercise_id ORDER BY session_date
        ) AS rn
    FROM exercise_session_stats
    WHERE best_reps IS NOT NULL
)
UPDATE exercise_session_stats ess
SET is_pr_reps = TRUE
FROM ranked r
WHERE ess.id = r.id AND r.rn > 1 AND r.best_reps > r.prev_max;

-- PR de 1RM
WITH ranked AS (
    SELECT id, exercise_id, user_id, session_date, best_1rm,
        MAX(best_1rm) OVER (
            PARTITION BY user_id, exercise_id
            ORDER BY session_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS prev_max,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, exercise_id ORDER BY session_date
        ) AS rn
    FROM exercise_session_stats
    WHERE best_1rm IS NOT NULL
)
UPDATE exercise_session_stats ess
SET is_pr_1rm = TRUE
FROM ranked r
WHERE ess.id = r.id AND r.rn > 1 AND r.best_1rm > r.prev_max;

-- PR de volumen
WITH ranked AS (
    SELECT id, exercise_id, user_id, session_date, total_volume,
        MAX(total_volume) OVER (
            PARTITION BY user_id, exercise_id
            ORDER BY session_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS prev_max,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, exercise_id ORDER BY session_date
        ) AS rn
    FROM exercise_session_stats
    WHERE total_volume IS NOT NULL
)
UPDATE exercise_session_stats ess
SET is_pr_volume = TRUE
FROM ranked r
WHERE ess.id = r.id AND r.rn > 1 AND r.total_volume > r.prev_max;

-- PR de tiempo
WITH ranked AS (
    SELECT id, exercise_id, user_id, session_date, best_time_seconds,
        MAX(best_time_seconds) OVER (
            PARTITION BY user_id, exercise_id
            ORDER BY session_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS prev_max,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, exercise_id ORDER BY session_date
        ) AS rn
    FROM exercise_session_stats
    WHERE best_time_seconds IS NOT NULL
)
UPDATE exercise_session_stats ess
SET is_pr_time = TRUE
FROM ranked r
WHERE ess.id = r.id AND r.rn > 1 AND r.best_time_seconds > r.prev_max;

-- PR de distancia
WITH ranked AS (
    SELECT id, exercise_id, user_id, session_date, best_distance_meters,
        MAX(best_distance_meters) OVER (
            PARTITION BY user_id, exercise_id
            ORDER BY session_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS prev_max,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, exercise_id ORDER BY session_date
        ) AS rn
    FROM exercise_session_stats
    WHERE best_distance_meters IS NOT NULL
)
UPDATE exercise_session_stats ess
SET is_pr_distance = TRUE
FROM ranked r
WHERE ess.id = r.id AND r.rn > 1 AND r.best_distance_meters > r.prev_max;

-- PR de pace (menor = mejor)
WITH ranked AS (
    SELECT id, exercise_id, user_id, session_date, best_pace_seconds,
        MIN(best_pace_seconds) OVER (
            PARTITION BY user_id, exercise_id
            ORDER BY session_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS prev_min,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, exercise_id ORDER BY session_date
        ) AS rn
    FROM exercise_session_stats
    WHERE best_pace_seconds IS NOT NULL
)
UPDATE exercise_session_stats ess
SET is_pr_pace = TRUE
FROM ranked r
WHERE ess.id = r.id AND r.rn > 1 AND r.best_pace_seconds < r.prev_min;

-- ============================================
-- 2. FUNCIÓN: Recalcular PRs de un ejercicio desde una fecha
-- Uso: SELECT recalculate_exercise_prs('exercise-id', 'after-date');
-- Se llama después de borrar una sesión.
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_exercise_prs(
    p_exercise_id INT,
    p_after_date TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
    -- Reset todos los flags desde la fecha indicada
    UPDATE exercise_session_stats
    SET is_pr_weight = FALSE,
        is_pr_reps = FALSE,
        is_pr_1rm = FALSE,
        is_pr_volume = FALSE,
        is_pr_time = FALSE,
        is_pr_distance = FALSE,
        is_pr_pace = FALSE
    WHERE exercise_id = p_exercise_id
      AND user_id = auth.uid()
      AND session_date >= p_after_date;

    -- Recalcular: PR de peso
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

    -- Recalcular: PR de reps
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
