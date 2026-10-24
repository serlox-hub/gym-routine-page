-- recalculate_exercise_prs: PRs after a history of only 0 kg sets (issue #189), and a stable
-- order for sessions with the same session_date.
--
-- A 0 kg set is stored as "no value" (best_weight / best_1rm NULL, no best_per_reps entry), so the
-- old windows, built only over rows WITH a value, treated the first weighted row as the exercise's
-- first session and never marked it. Now, for the three weight-based PR kinds only:
--   - is_pr_weight / is_pr_1rm: ranked over ALL rows of (user, exercise, gym). A row is a PR when
--     it is not the first one and beats the earlier maximum, a missing maximum counting as 0.
--   - pr_rep_counts: ranked over all rows too. With no earlier best_per_reps entry, rep PRs apply
--     against 0 only when no earlier row has a weight (best_weight or best_1rm > 0). Earlier rows
--     with a weight but no best_per_reps are the inconsistent data of 043: still no rep PR.
-- Reps, volume, time, distance and pace keep their rule (a missing earlier value is no PR). The
-- JS paths (detectNewPersonalRecords, evaluateSetForPR in sessionStatsCalculation.js) apply the
-- same rules.
--
-- Every window now orders by (session_date, id): two sessions at the same instant used to come in
-- whatever order the planner picked, so which one was the PR could change between identical
-- recalculations.
--
-- Same signature, so CREATE OR REPLACE keeps the grants of 066; they are restated anyway.
-- Flags already saved change only when something recalculates them (no backfill).

CREATE OR REPLACE FUNCTION recalculate_exercise_prs(
    p_exercise_id INT,
    p_after_date TIMESTAMPTZ,
    p_gym_id BIGINT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Reset flags y pr_rep_counts desde la fecha indicada (solo ese gym).
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
      AND gym_id IS NOT DISTINCT FROM p_gym_id
      AND session_date >= p_after_date;

    -- PR de peso (heaviest ever, cualquier rep count). Over every row: a 0 kg-only history counts.
    WITH ranked AS (
        SELECT id, best_weight,
            MAX(best_weight) OVER (ORDER BY session_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date, id) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id
    )
    UPDATE exercise_session_stats ess SET is_pr_weight = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_weight > COALESCE(r.prev_max, 0)
      AND ess.session_date >= p_after_date;

    -- PR de reps
    WITH ranked AS (
        SELECT id, best_reps,
            MAX(best_reps) OVER (ORDER BY session_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date, id) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id AND best_reps IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_reps = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_reps > r.prev_max
      AND ess.session_date >= p_after_date;

    -- PR de 1RM. Over every row, like the weight.
    WITH ranked AS (
        SELECT id, best_1rm,
            MAX(best_1rm) OVER (ORDER BY session_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date, id) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id
    )
    UPDATE exercise_session_stats ess SET is_pr_1rm = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_1rm > COALESCE(r.prev_max, 0)
      AND ess.session_date >= p_after_date;

    -- PR de volumen
    WITH ranked AS (
        SELECT id, total_volume,
            MAX(total_volume) OVER (ORDER BY session_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date, id) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id AND total_volume IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_volume = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.total_volume > r.prev_max
      AND ess.session_date >= p_after_date;

    -- PR de tiempo
    WITH ranked AS (
        SELECT id, best_time_seconds,
            MAX(best_time_seconds) OVER (ORDER BY session_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date, id) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id AND best_time_seconds IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_time = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_time_seconds > r.prev_max
      AND ess.session_date >= p_after_date;

    -- PR de distancia
    WITH ranked AS (
        SELECT id, best_distance_meters,
            MAX(best_distance_meters) OVER (ORDER BY session_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date, id) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id AND best_distance_meters IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_distance = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_distance_meters > r.prev_max
      AND ess.session_date >= p_after_date;

    -- PR de pace (menor = mejor)
    WITH ranked AS (
        SELECT id, best_pace_seconds,
            MIN(best_pace_seconds) OVER (ORDER BY session_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_min,
            ROW_NUMBER() OVER (ORDER BY session_date, id) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id AND best_pace_seconds IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_pace = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_pace_seconds < r.prev_min
      AND ess.session_date >= p_after_date;

    -- pr_rep_counts (modelo Strong/Hevy CON dominancia), restringido al gym. Ranked over every
    -- row, so "earlier" is the row's position (rn), never a session_date comparison.
    WITH history AS (
        SELECT id, session_date, best_per_reps,
            (best_weight > 0 OR best_1rm > 0) AS has_weight,
            ROW_NUMBER() OVER (ORDER BY session_date, id) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id
          AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id
    ),
    unnested AS (
        SELECT
            h.id AS ess_id,
            h.session_date,
            h.rn,
            (kv.key)::SMALLINT AS rep_count,
            (kv.value)::NUMERIC AS weight
        FROM history h,
             LATERAL jsonb_each_text(h.best_per_reps) kv
        WHERE h.best_per_reps IS NOT NULL
    ),
    enriched AS (
        SELECT
            u.ess_id,
            u.session_date,
            u.rn,
            u.rep_count,
            u.weight,
            (SELECT MAX(p.weight) FROM unnested p
              WHERE p.rn < u.rn
                AND p.rep_count >= u.rep_count) AS prev_envelope,
            (SELECT MAX(p.weight) FROM unnested p
              WHERE p.ess_id = u.ess_id
                AND p.rep_count > u.rep_count) AS same_session_dom,
            EXISTS (SELECT 1 FROM unnested p WHERE p.rn < u.rn) AS has_rep_history,
            EXISTS (SELECT 1 FROM history h WHERE h.rn < u.rn AND h.has_weight) AS has_weight_history
        FROM unnested u
    ),
    prs AS (
        SELECT ess_id, rep_count
        FROM enriched
        WHERE rn > 1
          AND session_date >= p_after_date
          AND (has_rep_history OR NOT has_weight_history)
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

REVOKE EXECUTE ON FUNCTION recalculate_exercise_prs(INTEGER, TIMESTAMPTZ, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION recalculate_exercise_prs(INTEGER, TIMESTAMPTZ, BIGINT) TO authenticated, service_role;
