-- recalculate_exercise_prs judges only the records the app judges (issue #196).
--
-- The end of a session marks the PRs of getPRMetrics (sessionStatsCalculation.js), which depend on
-- what the exercise tracks: weight × reps gets 1RM, heaviest weight and rep PRs (never volume nor
-- most reps), pace gets pace, a single field gets that field, and two or more free dimensions get
-- none. The recalculation that runs after an edit marked every column that improved, so the same
-- workout had a trophy or not depending on whether it was ever edited.
--
--   1. pr_metrics(fields) mirrors getPRMetrics(normalizeTrackedFields(fields)). Both must change
--      together: `npm run db:check-pr-parity -w apps/web` compares them on every field combination.
--   2. recalculate_exercise_prs reads the exercise's tracked_fields as they are today and runs only
--      the blocks of the metrics in that list. The volume block is gone (no rule judges volume).
--      The bodies of the other blocks are those of 070.
--
-- Same signature, so CREATE OR REPLACE keeps the grants of 066 / 070; they are restated anyway.
-- Flags already saved change only when something recalculates them (no backfill).

CREATE OR REPLACE FUNCTION pr_metrics(p_fields measurement_field[])
RETURNS TEXT[]
LANGUAGE sql IMMUTABLE
AS $$
    -- Normalised like normalizeTrackedFields: NULL elements dropped, duplicates collapsed, nothing
    -- left falls back to weight × reps. Its cut to 3 fields is not mirrored: exercises_tracked_fields_len
    -- keeps every stored list within 3.
    WITH given AS (
        SELECT ARRAY(SELECT DISTINCT f FROM unnest(p_fields) AS f WHERE f IS NOT NULL) AS fields
    ),
    normalized AS (
        SELECT CASE WHEN cardinality(fields) = 0
                    THEN ARRAY['weight', 'reps']::measurement_field[]
                    ELSE fields END AS fields
        FROM given
    )
    SELECT CASE
        WHEN cardinality(fields) = 2 AND fields @> ARRAY['weight', 'reps']::measurement_field[]
            THEN ARRAY['1rm', 'weight', 'repPR']
        WHEN 'pace' = ANY (fields)
            THEN ARRAY['pace']
        -- Level and calories have no column in exercise_session_stats, so no record.
        WHEN cardinality(fields) = 1 AND fields[1] IN ('weight', 'reps', 'time', 'distance')
            THEN ARRAY[fields[1]::TEXT]
        ELSE ARRAY[]::TEXT[]
    END
    FROM normalized;
$$;

COMMENT ON FUNCTION pr_metrics(measurement_field[]) IS 'The PR metrics an exercise tracking these fields gets. Mirrors getPRMetrics(normalizeTrackedFields(fields)) in packages/shared/src/lib/sessionStatsCalculation.js: change both together, `npm run db:check-pr-parity -w apps/web` compares them.';

-- Internal: only recalculate_exercise_prs calls it, and that one runs as its owner.
REVOKE EXECUTE ON FUNCTION pr_metrics(measurement_field[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION recalculate_exercise_prs(
    p_exercise_id INT,
    p_after_date TIMESTAMPTZ,
    p_gym_id BIGINT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    -- A missing exercise reads as NULL fields (weight × reps): the callers run this after an edit,
    -- and raising here would abort the edit.
    v_metrics TEXT[] := pr_metrics((SELECT tracked_fields FROM exercises WHERE id = p_exercise_id));
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
    IF 'weight' = ANY (v_metrics) THEN
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
    END IF;

    -- PR de reps
    IF 'reps' = ANY (v_metrics) THEN
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
    END IF;

    -- PR de 1RM. Over every row, like the weight.
    IF '1rm' = ANY (v_metrics) THEN
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
    END IF;

    -- PR de tiempo
    IF 'time' = ANY (v_metrics) THEN
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
    END IF;

    -- PR de distancia
    IF 'distance' = ANY (v_metrics) THEN
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
    END IF;

    -- PR de pace (menor = mejor)
    IF 'pace' = ANY (v_metrics) THEN
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
    END IF;

    -- pr_rep_counts (modelo Strong/Hevy CON dominancia), restringido al gym. Ranked over every
    -- row, so "earlier" is the row's position (rn), never a session_date comparison.
    IF 'repPR' = ANY (v_metrics) THEN
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
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION recalculate_exercise_prs(INTEGER, TIMESTAMPTZ, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION recalculate_exercise_prs(INTEGER, TIMESTAMPTZ, BIGINT) TO authenticated, service_role;
