-- Assisted exercises rank LESS assistance as better (issue #202).
--
-- On an assisted machine the weight you set is help, not load: 20 kg of assistance is harder than
-- 40 kg. "Machine Assisted Pull-Ups" tracked {weight,reps}, so going from 30 to 40 kg of help was a
-- weight, 1RM and rep PR, and going down to 20 (real progress) was nothing. The new field
-- `assistance` (073) is stored in completed_sets.weight, in the weight unit, and its better
-- direction is lower (getProgressionDirection in packages/shared/src/lib/progressionUtils.js).
--
--   1. exercises: weight and assistance never together (they would share the column).
--   2. exercise_session_stats: best_assistance (the session's least assistance over sets with
--      reps, 0 included) and is_pr_assistance. best_per_reps keeps its shape: on these exercises
--      it holds the LEAST assistance per rep count.
--   3. pr_metrics mirrors getPRMetrics(normalizeTrackedFields(fields)) again: weight beside
--      assistance is dropped, {assistance,reps} gets ['assistance','repPR'], any other list with
--      assistance gets nothing. `npm run db:check-pr-parity -w apps/web` compares them.
--   4. recalculate_exercise_prs: its body moves to recalculate_exercise_prs_for_user, which takes
--      the user (the data fix below runs for every user, without a session). The public RPC keeps
--      its signature and passes auth.uid(). New assistance block (MIN window, `<`), and the rep PR
--      block inverts its dominance when the exercise tracks assistance: A × N is a rep PR when no
--      earlier set has assistance <= A at N reps or more. 0 is a value there: no COALESCE to 0.
--   5. convert_user_weights also converts best_assistance (both scopes).
--   6. Data: the assisted pull-up moves to {assistance,reps}, its stats are rebuilt from its sets
--      and its PR flags recalculated for every (user, gym), through rebuild_assistance_stats.

-- ============================================
-- 1. EXERCISES
-- ============================================

ALTER TABLE exercises
    ADD CONSTRAINT exercises_weight_or_assistance
    CHECK (NOT (tracked_fields @> ARRAY['weight', 'assistance']::measurement_field[]));

-- ============================================
-- 2. EXERCISE_SESSION_STATS
-- ============================================

ALTER TABLE exercise_session_stats
    ADD COLUMN best_assistance NUMERIC,
    ADD COLUMN is_pr_assistance BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN exercise_session_stats.best_assistance IS 'Least assistance of the session (assisted exercises, tracked_fields with assistance), over sets with reps. 0 is a value: a set without help, the best there is. NULL without any such set.';

COMMENT ON TABLE exercise_session_stats IS 'Every weight-valued column (best_weight, best_1rm, total_volume, best_assistance, best_per_reps) is converted by convert_user_weights when the user changes a weight unit: a new one must be added there, or it stays in the old unit.';

COMMENT ON COLUMN exercise_session_stats.best_per_reps IS 'Best load of this session per exact rep count. Ej: {"1": 120, "5": 100}. The heaviest weight on weight × reps, the LEAST assistance (0 included) on assistance × reps. NULL when it does not apply.';

-- ============================================
-- 3. PR_METRICS
-- ============================================

CREATE OR REPLACE FUNCTION pr_metrics(p_fields measurement_field[])
RETURNS TEXT[]
LANGUAGE sql IMMUTABLE
AS $$
    -- Normalised like normalizeTrackedFields: NULL elements dropped, duplicates collapsed, weight
    -- dropped beside assistance, nothing left falls back to weight × reps. Its cut to 3 fields is
    -- not mirrored: exercises_tracked_fields_len keeps every stored list within 3.
    WITH given AS (
        SELECT ARRAY(SELECT DISTINCT f FROM unnest(p_fields) AS f WHERE f IS NOT NULL) AS fields
    ),
    paired AS (
        SELECT CASE WHEN 'assistance' = ANY (fields)
                    THEN array_remove(fields, 'weight'::measurement_field)
                    ELSE fields END AS fields
        FROM given
    ),
    normalized AS (
        SELECT CASE WHEN cardinality(fields) = 0
                    THEN ARRAY['weight', 'reps']::measurement_field[]
                    ELSE fields END AS fields
        FROM paired
    )
    SELECT CASE
        WHEN cardinality(fields) = 2 AND fields @> ARRAY['weight', 'reps']::measurement_field[]
            THEN ARRAY['1rm', 'weight', 'repPR']
        -- Assistance has a record only with reps, alone with them. Before pace, like the JS.
        WHEN 'assistance' = ANY (fields)
            THEN CASE WHEN cardinality(fields) = 2 AND 'reps' = ANY (fields)
                      THEN ARRAY['assistance', 'repPR']
                      ELSE ARRAY[]::TEXT[] END
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

-- Internal: only recalculate_exercise_prs_for_user calls it, and that one runs as its owner.
REVOKE EXECUTE ON FUNCTION pr_metrics(measurement_field[]) FROM PUBLIC, anon, authenticated;

-- ============================================
-- 4. RECALCULATE_EXERCISE_PRS
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_exercise_prs_for_user(
    p_user_id UUID,
    p_exercise_id INT,
    p_after_date TIMESTAMPTZ,
    p_gym_id BIGINT
)
RETURNS VOID AS $$
DECLARE
    -- A missing exercise reads as NULL fields (weight × reps): the callers run this after an edit,
    -- and raising here would abort the edit.
    v_metrics TEXT[] := pr_metrics((SELECT tracked_fields FROM exercises WHERE id = p_exercise_id));
    -- Rep PRs rank the load field: weight (heavier wins) or assistance (less wins). Only
    -- {weight,reps} and {assistance,reps} get repPR, and only the second gets 'assistance'.
    v_lower_is_better BOOLEAN := 'assistance' = ANY (v_metrics);
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
        is_pr_assistance = FALSE,
        pr_rep_counts = NULL
    WHERE exercise_id = p_exercise_id
      AND user_id = p_user_id
      AND gym_id IS NOT DISTINCT FROM p_gym_id
      AND session_date >= p_after_date;

    -- PR de peso (heaviest ever, cualquier rep count). Over every row: a 0 kg-only history counts.
    IF 'weight' = ANY (v_metrics) THEN
        WITH ranked AS (
            SELECT id, best_weight,
                MAX(best_weight) OVER (ORDER BY session_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
                ROW_NUMBER() OVER (ORDER BY session_date, id) AS rn
            FROM exercise_session_stats
            WHERE exercise_id = p_exercise_id AND user_id = p_user_id
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
            WHERE exercise_id = p_exercise_id AND user_id = p_user_id
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
            WHERE exercise_id = p_exercise_id AND user_id = p_user_id
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
            WHERE exercise_id = p_exercise_id AND user_id = p_user_id
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
            WHERE exercise_id = p_exercise_id AND user_id = p_user_id
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
            WHERE exercise_id = p_exercise_id AND user_id = p_user_id
              AND gym_id IS NOT DISTINCT FROM p_gym_id AND best_pace_seconds IS NOT NULL
        )
        UPDATE exercise_session_stats ess SET is_pr_pace = TRUE
        FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_pace_seconds < r.prev_min
          AND ess.session_date >= p_after_date;
    END IF;

    -- Assistance PR (lower is better, 0 included). Only rows with an assistance: the first one has
    -- nothing to beat, like the end of a session (detectNewPersonalRecords needs a previous one).
    IF 'assistance' = ANY (v_metrics) THEN
        WITH ranked AS (
            SELECT id, best_assistance,
                MIN(best_assistance) OVER (ORDER BY session_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_min,
                ROW_NUMBER() OVER (ORDER BY session_date, id) AS rn
            FROM exercise_session_stats
            WHERE exercise_id = p_exercise_id AND user_id = p_user_id
              AND gym_id IS NOT DISTINCT FROM p_gym_id AND best_assistance IS NOT NULL
        )
        UPDATE exercise_session_stats ess SET is_pr_assistance = TRUE
        FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_assistance < r.prev_min
          AND ess.session_date >= p_after_date;
    END IF;

    -- pr_rep_counts (modelo Strong/Hevy CON dominancia), restringido al gym. Ranked over every
    -- row, so "earlier" is the row's position (rn), never a session_date comparison. The load is
    -- the weight (the heaviest wins, a missing record counts as 0) or the assistance (the least
    -- wins, a missing record is no record: 0 is the best value, so it cannot stand for "none").
    IF 'repPR' = ANY (v_metrics) THEN
        WITH history AS (
            SELECT id, session_date, best_per_reps,
                CASE WHEN v_lower_is_better
                     THEN best_assistance IS NOT NULL
                     ELSE (best_weight > 0 OR best_1rm > 0) END AS has_load,
                ROW_NUMBER() OVER (ORDER BY session_date, id) AS rn
            FROM exercise_session_stats
            WHERE exercise_id = p_exercise_id
              AND user_id = p_user_id
              AND gym_id IS NOT DISTINCT FROM p_gym_id
        ),
        unnested AS (
            SELECT
                h.id AS ess_id,
                h.session_date,
                h.rn,
                (kv.key)::SMALLINT AS rep_count,
                (kv.value)::NUMERIC AS load
            FROM history h,
                 LATERAL jsonb_each_text(h.best_per_reps) kv
            WHERE h.best_per_reps IS NOT NULL
              AND kv.value IS NOT NULL
        ),
        enriched AS (
            SELECT
                u.ess_id,
                u.session_date,
                u.rn,
                u.rep_count,
                u.load,
                CASE WHEN v_lower_is_better
                     THEN (SELECT MIN(p.load) FROM unnested p WHERE p.rn < u.rn AND p.rep_count >= u.rep_count)
                     ELSE (SELECT MAX(p.load) FROM unnested p WHERE p.rn < u.rn AND p.rep_count >= u.rep_count)
                END AS prev_envelope,
                CASE WHEN v_lower_is_better
                     THEN (SELECT MIN(p.load) FROM unnested p WHERE p.ess_id = u.ess_id AND p.rep_count > u.rep_count)
                     ELSE (SELECT MAX(p.load) FROM unnested p WHERE p.ess_id = u.ess_id AND p.rep_count > u.rep_count)
                END AS same_session_dom,
                EXISTS (SELECT 1 FROM unnested p WHERE p.rn < u.rn) AS has_rep_history,
                EXISTS (SELECT 1 FROM history h WHERE h.rn < u.rn AND h.has_load) AS has_load_history
            FROM unnested u
        ),
        prs AS (
            SELECT ess_id, rep_count
            FROM enriched
            WHERE rn > 1
              AND session_date >= p_after_date
              AND (has_rep_history OR NOT has_load_history)
              AND CASE WHEN v_lower_is_better
                       -- LEAST skips a NULL side, and is NULL only when both are: no record.
                       THEN LEAST(prev_envelope, same_session_dom) IS NULL
                            OR load < LEAST(prev_envelope, same_session_dom)
                       ELSE load > GREATEST(COALESCE(prev_envelope, 0), COALESCE(same_session_dom, 0))
                  END
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

COMMENT ON FUNCTION recalculate_exercise_prs_for_user(UUID, INTEGER, TIMESTAMPTZ, BIGINT) IS 'Recalculates the is_pr_* flags and pr_rep_counts of one user''s exercise in one gym from p_after_date, judging only pr_metrics(tracked_fields). Internal: the RPC recalculate_exercise_prs passes auth.uid(); migrations pass any user.';

-- SECURITY DEFINER and it takes the user as an argument: nobody but its owner may call it. Revoked
-- from anon and authenticated by name, not only from PUBLIC: an explicit grant survives that.
REVOKE EXECUTE ON FUNCTION recalculate_exercise_prs_for_user(UUID, INTEGER, TIMESTAMPTZ, BIGINT) FROM PUBLIC, anon, authenticated;

-- The RPC the app calls after an edit. Same signature, so CREATE OR REPLACE keeps its grants; they
-- are restated anyway. SECURITY DEFINER so it can call the internal function.
CREATE OR REPLACE FUNCTION recalculate_exercise_prs(
    p_exercise_id INT,
    p_after_date TIMESTAMPTZ,
    p_gym_id BIGINT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    PERFORM recalculate_exercise_prs_for_user(auth.uid(), p_exercise_id, p_after_date, p_gym_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION recalculate_exercise_prs(INTEGER, TIMESTAMPTZ, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION recalculate_exercise_prs(INTEGER, TIMESTAMPTZ, BIGINT) TO authenticated, service_role;

-- ============================================
-- 5. CONVERT_USER_WEIGHTS (071 + best_assistance)
-- ============================================

CREATE OR REPLACE FUNCTION convert_user_weights(
    p_scope TEXT,                       -- 'global' or 'exercise'
    p_factor NUMERIC,                   -- multiplier (kg→lb = 2.20462262, lb→kg = 0.45359237)
    p_exercise_id INT DEFAULT NULL,     -- required when p_scope = 'exercise'
    p_old_unit TEXT DEFAULT NULL,       -- kept for the signature, ignored (see 038)
    p_gym_id BIGINT DEFAULT NULL        -- required when p_scope = 'exercise'
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_scope NOT IN ('global', 'exercise') THEN
        RAISE EXCEPTION 'Invalid scope: %. Must be ''global'' or ''exercise''.', p_scope;
    END IF;

    IF p_scope = 'exercise' AND p_exercise_id IS NULL THEN
        RAISE EXCEPTION 'p_exercise_id is required for scope=exercise';
    END IF;

    IF p_scope = 'exercise' AND p_gym_id IS NULL THEN
        RAISE EXCEPTION 'p_gym_id is required for scope=exercise';
    END IF;

    -- ============================================
    -- 1. COMPLETED_SETS
    -- ============================================
    IF p_scope = 'exercise' THEN
        UPDATE completed_sets cs
        SET weight = ROUND(weight * p_factor, 2)
        FROM session_exercises se, workout_sessions ws
        WHERE cs.session_exercise_id = se.id
          AND cs.session_id = ws.id
          AND ws.user_id = v_user_id
          AND se.exercise_id = p_exercise_id
          AND ws.gym_id = p_gym_id
          AND cs.weight IS NOT NULL;
    ELSE
        -- scope = global: skips the (exercise, gym) pairs with their own explicit unit
        UPDATE completed_sets cs
        SET weight = ROUND(weight * p_factor, 2)
        FROM session_exercises se, workout_sessions ws
        WHERE cs.session_exercise_id = se.id
          AND cs.session_id = ws.id
          AND ws.user_id = v_user_id
          AND cs.weight IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM user_exercise_gym_units u
              WHERE u.user_id = v_user_id
                AND u.exercise_id = se.exercise_id
                AND u.gym_id = ws.gym_id
          );
    END IF;

    -- ============================================
    -- 2. EXERCISE_SESSION_STATS (best_weight, best_1rm, total_volume, best_assistance, best_per_reps)
    -- Every set of the scope is multiplied by the same constant, so the is_pr_* flags and
    -- pr_rep_counts stay valid (the ranking holds, also the inverted one of assistance); only the
    -- values change.
    -- best_per_reps NULL stays NULL: no keys to aggregate.
    -- best_1rm scaled is no longer a whole number, unlike the 1RM of a new set (#194).
    -- ============================================
    IF p_scope = 'exercise' THEN
        UPDATE exercise_session_stats ess
        SET
            best_weight     = CASE WHEN best_weight     IS NOT NULL THEN ROUND(best_weight     * p_factor, 2) END,
            best_1rm        = CASE WHEN best_1rm        IS NOT NULL THEN ROUND(best_1rm        * p_factor, 2) END,
            total_volume    = CASE WHEN total_volume    IS NOT NULL THEN ROUND(total_volume    * p_factor, 2) END,
            best_assistance = CASE WHEN best_assistance IS NOT NULL THEN ROUND(best_assistance * p_factor, 2) END,
            best_per_reps = (
                SELECT jsonb_object_agg(kv.key, ROUND(kv.value::NUMERIC * p_factor, 2))
                FROM jsonb_each_text(ess.best_per_reps) kv
            )
        WHERE ess.user_id = v_user_id
          AND ess.exercise_id = p_exercise_id
          AND ess.gym_id = p_gym_id;
    ELSE
        UPDATE exercise_session_stats ess
        SET
            best_weight     = CASE WHEN best_weight     IS NOT NULL THEN ROUND(best_weight     * p_factor, 2) END,
            best_1rm        = CASE WHEN best_1rm        IS NOT NULL THEN ROUND(best_1rm        * p_factor, 2) END,
            total_volume    = CASE WHEN total_volume    IS NOT NULL THEN ROUND(total_volume    * p_factor, 2) END,
            best_assistance = CASE WHEN best_assistance IS NOT NULL THEN ROUND(best_assistance * p_factor, 2) END,
            best_per_reps = (
                SELECT jsonb_object_agg(kv.key, ROUND(kv.value::NUMERIC * p_factor, 2))
                FROM jsonb_each_text(ess.best_per_reps) kv
            )
        WHERE ess.user_id = v_user_id
          AND NOT EXISTS (
              SELECT 1 FROM user_exercise_gym_units u
              WHERE u.user_id = v_user_id
                AND u.exercise_id = ess.exercise_id
                AND u.gym_id = ess.gym_id
          );
    END IF;

    -- ============================================
    -- 3. BODY_WEIGHT_RECORDS (scope=global only)
    -- body_weight_records.weight_unit was dropped in 038: only the weight is multiplied
    -- (p_old_unit stays in the signature but is ignored).
    -- ============================================
    IF p_scope = 'global' THEN
        UPDATE body_weight_records
        SET weight = ROUND(weight * p_factor, 2)
        WHERE user_id = v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION convert_user_weights(TEXT, NUMERIC, INTEGER, TEXT, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION convert_user_weights(TEXT, NUMERIC, INTEGER, TEXT, BIGINT) TO authenticated, service_role;

-- ============================================
-- 6. DATA: THE ASSISTED PULL-UP
-- ============================================

-- Rebuilds every stats row of an exercise that tracks assistance from its completed_sets, with the
-- app's rule (calculateSessionExerciseStats: the least assistance over sets with reps > 0, the
-- least per exact rep count, 0 included), clears what the weight model left (best_weight, best_1rm,
-- total_volume and their flags), and recalculates the PR flags of every (user, gym) from the
-- start. A function and not a block of this migration so the e2e can run the same code on a
-- history it seeds (apps/web/e2e/recalculateAssistancePRs.spec.js).
CREATE OR REPLACE FUNCTION rebuild_assistance_stats(p_exercise_id INT)
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    WITH sets AS (
        SELECT se.session_id, cs.reps_completed, cs.weight
        FROM completed_sets cs
        JOIN session_exercises se ON se.id = cs.session_exercise_id
        WHERE se.exercise_id = p_exercise_id
          AND cs.weight IS NOT NULL
          AND cs.reps_completed > 0
    ),
    per_reps AS (
        SELECT session_id, reps_completed, MIN(weight) AS least
        FROM sets
        GROUP BY session_id, reps_completed
    ),
    rebuilt AS (
        SELECT session_id,
            MIN(least) AS best_assistance,
            jsonb_object_agg(reps_completed::TEXT, least) AS best_per_reps
        FROM per_reps
        GROUP BY session_id
    )
    UPDATE exercise_session_stats ess
    SET best_assistance = fixed.best_assistance,
        best_per_reps = fixed.best_per_reps,
        best_weight = NULL,
        best_1rm = NULL,
        total_volume = NULL,
        is_pr_weight = FALSE,
        is_pr_1rm = FALSE,
        is_pr_volume = FALSE
    -- LEFT JOIN: a row whose sets are all gone or without reps keeps no assistance (NULL).
    FROM (
        SELECT s.id, rb.best_assistance, rb.best_per_reps
        FROM exercise_session_stats s
        LEFT JOIN rebuilt rb ON rb.session_id = s.session_id
        WHERE s.exercise_id = p_exercise_id
    ) AS fixed
    WHERE ess.id = fixed.id;

    FOR r IN
        SELECT DISTINCT user_id, gym_id FROM exercise_session_stats WHERE exercise_id = p_exercise_id
    LOOP
        PERFORM recalculate_exercise_prs_for_user(r.user_id, p_exercise_id, '-infinity'::TIMESTAMPTZ, r.gym_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rebuild_assistance_stats(INTEGER) IS 'Rebuilds the exercise_session_stats of an exercise that tracks assistance from its completed_sets and recalculates its PRs for every user and gym. Internal: migration 074 runs it for the assisted pull-up; the e2e runs it on a seeded history.';

-- Across every user: nobody but its owner may call it.
REVOKE EXECUTE ON FUNCTION rebuild_assistance_stats(INTEGER) FROM PUBLIC, anon, authenticated;

-- Its id differs between databases: found by name_en, always with is_system.
DO $$
DECLARE
    v_exercise_id INT;
BEGIN
    SELECT id INTO v_exercise_id
    FROM exercises
    WHERE name_en = 'Machine Assisted Pull-Ups' AND is_system;

    IF v_exercise_id IS NULL THEN
        RETURN;
    END IF;

    UPDATE exercises SET tracked_fields = '{assistance,reps}' WHERE id = v_exercise_id;
    PERFORM rebuild_assistance_stats(v_exercise_id);
END;
$$;
