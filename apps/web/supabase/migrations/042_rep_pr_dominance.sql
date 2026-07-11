-- ============================================
-- MIGRACIÓN: Regla de dominancia en rep-PR-por-rep-count
-- Objetivo: Un set de W kg × N reps solo es rep-PR a N reps si W supera el mejor
-- peso conseguido a N repeticiones O MÁS (no solo a exactamente N). Hacer más reps
-- al mismo peso es estrictamente mejor, así que un 100×9 "cubre" implícitamente el
-- 100×8: este último ya no debe marcarse como PR.
--
-- Cambios:
--   1. CREATE OR REPLACE recalculate_exercise_prs(): la CTE de pr_rep_counts pasa a
--      usar dominancia (envelope sobre rep_count >= N del histórico + dominador de
--      la misma sesión con rep_count > N).
--
-- NOTA: Puramente correctiva del RPC (recálculo tras editar/borrar sesiones). NO se
-- re-backfillea el historial ya guardado. El resto de recálculos (peso, 1RM,
-- volumen, tiempo, distancia, pace) se mantienen idénticos a la 039.
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

    -- Recalcular: pr_rep_counts (modelo Strong/Hevy CON dominancia)
    -- Un rep count N de una sesión es PR si su peso supera:
    --   a) el mejor peso histórico a N reps O MÁS en sesiones estrictamente
    --      anteriores (prev_envelope), y
    --   b) el mejor peso de la propia sesión a MÁS de N reps (same_session_dom),
    --      porque más reps al mismo peso domina.
    -- El caso "primera vez a nivel N" queda cubierto: si no hay dominador el
    -- umbral es 0 y cualquier peso > 0 lo supera. Primera sesión del ejercicio
    -- nunca es PR (session_rank > 1).
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
    enriched AS (
        SELECT
            u.ess_id,
            u.session_date,
            u.rep_count,
            u.weight,
            -- Mejor peso histórico previo a N reps o más (sesiones anteriores)
            (SELECT MAX(p.weight) FROM unnested p
              WHERE p.session_date < u.session_date
                AND p.rep_count >= u.rep_count) AS prev_envelope,
            -- Dominador dentro de la misma sesión: más reps al mismo/mayor peso
            (SELECT MAX(p.weight) FROM unnested p
              WHERE p.ess_id = u.ess_id
                AND p.rep_count > u.rep_count) AS same_session_dom,
            DENSE_RANK() OVER (ORDER BY u.session_date) AS exercise_session_rank
        FROM unnested u
    ),
    prs AS (
        SELECT ess_id, rep_count
        FROM enriched
        WHERE exercise_session_rank > 1
          AND session_date >= p_after_date
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
