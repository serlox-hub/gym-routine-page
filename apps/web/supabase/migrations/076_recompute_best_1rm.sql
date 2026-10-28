-- convert_user_weights recomputes best_1rm from the converted sets instead of scaling it (issue #194).
--
-- The 1RM of a new set is calculateEpley1RM (packages/shared/src/lib/workoutCalculations.js): a whole
-- number, from the weight already in the new unit. The RPC scaled the stored best_1rm, which then is
-- no whole number and no longer what its sets give: 65 kg × 8 stored 82, kg → lb made it 180.78, and
-- the converted set (143.30 lb × 8) gives 182. Repeating the same set was a 1RM PR, in both
-- directions of the conversion (185 lb × 5: 216 → 97.98 kg, its set 83.91 kg × 5 gives 98).
--
--   1. epley_1rm: calculateEpley1RM in SQL. Same float8 operations in the same order, rounded like
--      Math.round (js_math_round): neither round() of PostgreSQL does it. `npm run
--      db:check-pr-parity -w apps/web` compares them on every weight from 0.01 to 1000 and every rep
--      count from 1 to 60.
--   2. stores_best_1rm: which exercises store best_1rm, like getTrackableMetrics. The rebuild and the
--      conversion both read it: what one leaves unscaled, the other has to rebuild.
--   3. rebuild_best_1rm_for_user: recomputes best_1rm from completed_sets with epley_1rm, writes only
--      the rows that change, and recalculates the PR flags of every (exercise, gym) it changed.
--   4. convert_user_weights no longer scales best_1rm of weight × reps: it calls the rebuild at the
--      end, for the scope it converted.
--   5. Data: the rebuild runs once for every user. It fixes the rows converted so far and the 1-rep
--      rows of 019 (which stored 100 × 1 as 103). Rows that already match are not written.
--
-- The recalculation resets every is_pr_* flag and pr_rep_counts of a changed (exercise, gym), not
-- only is_pr_1rm: flags the current rule would not set (a reps PR on weight × reps marked before
-- #196) go away with it. They were wrong already.

-- ============================================
-- 1. EPLEY_1RM
-- ============================================

-- A function of its own, not a subquery inside epley_1rm, so that both inline into the calling query:
-- with a subquery epley_1rm runs as a function call per row, and the parity grid (6 million values)
-- takes about seven times longer.
CREATE OR REPLACE FUNCTION js_math_round(x FLOAT8)
RETURNS FLOAT8
LANGUAGE sql IMMUTABLE
AS $$
    -- Half up on the double itself. round() is half to even on float8, and on numeric it rounds the
    -- 15-digit decimal the float8 casts to (182.49999999999997 becomes 182.5). floor(x + 0.5) fails
    -- too: for x = 0.49999999999999994 the sum rounds to 1. x - floor(x) is exact in float8.
    SELECT CASE WHEN x - floor(x) >= 0.5 THEN floor(x) + 1 ELSE floor(x) END;
$$;

COMMENT ON FUNCTION js_math_round(FLOAT8) IS 'Math.round of JavaScript on a double: the nearest integer, a half going up. Internal: only epley_1rm calls it.';

REVOKE ALL ON FUNCTION js_math_round(FLOAT8) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION epley_1rm(p_weight NUMERIC, p_reps INTEGER)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$
    -- A NULL argument fails every WHEN and gives NULL in the ELSE.
    SELECT CASE
        WHEN p_weight <= 0 OR p_reps <= 0 THEN NULL
        WHEN p_reps = 1 THEN p_weight
        ELSE js_math_round(p_weight::FLOAT8 * (1 + p_reps::FLOAT8 / 30))::NUMERIC
    END;
$$;

COMMENT ON FUNCTION epley_1rm(NUMERIC, INTEGER) IS 'Estimated 1RM of a set with weight and reps above 0, exactly as calculateEpley1RM in packages/shared/src/lib/workoutCalculations.js; NULL for any other set, which calculateSessionExerciseStats does not count: change both together, `npm run db:check-pr-parity -w apps/web` compares them. Internal: rebuild_best_1rm_for_user calls it.';

REVOKE ALL ON FUNCTION epley_1rm(NUMERIC, INTEGER) FROM PUBLIC, anon, authenticated;

-- ============================================
-- 2. STORES_BEST_1RM
-- ============================================

CREATE OR REPLACE FUNCTION stores_best_1rm(p_fields measurement_field[])
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
    -- Normalised like normalizeTrackedFields where the answer depends on it: NULL elements dropped,
    -- nothing left falls back to weight × reps. Its cut to 3 fields is not mirrored, like pr_metrics:
    -- exercises_tracked_fields_len keeps every stored list within 3.
    SELECT COALESCE(cardinality(array_remove(p_fields, NULL)), 0) = 0
        OR (p_fields @> ARRAY['weight', 'reps']::measurement_field[]
            AND NOT COALESCE('assistance' = ANY (p_fields), false));
$$;

COMMENT ON FUNCTION stores_best_1rm(measurement_field[]) IS 'Whether an exercise tracking these fields stores best_1rm: weight and reps, without assistance. Mirrors getTrackableMetrics(fields).includes(''1rm'') in packages/shared/src/lib/sessionStatsCalculation.js: change both together, `npm run db:check-pr-parity -w apps/web` compares them. Internal: rebuild_best_1rm_for_user and convert_user_weights call it.';

REVOKE ALL ON FUNCTION stores_best_1rm(measurement_field[]) FROM PUBLIC, anon, authenticated;

-- ============================================
-- 3. REBUILD_BEST_1RM_FOR_USER
-- ============================================

-- What calculateSessionExerciseStats (sessionStatsCalculation.js) stores as best_1rm: on exercises
-- tracking weight and reps without assistance (stores_best_1rm), the best 1RM over every set of the
-- session's session_exercises of that exercise, NULL without a set whose 1RM is above 0. That is wider than the
-- PR rule (pr_metrics gives '1rm' only to exactly {weight,reps}): {weight,reps,time} stores it too,
-- and the chart plots it.
-- SECURITY INVOKER, like rebuild_assistance_stats: its runtime caller, convert_user_weights, already
-- runs as the owner. As a DEFINER taking any user, a leaked grant would write another user's stats.
CREATE OR REPLACE FUNCTION rebuild_best_1rm_for_user(
    p_user_id UUID,
    p_exercise_id INT DEFAULT NULL,
    p_gym_id BIGINT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        WITH rebuilt AS (
            SELECT ess.id,
                -- Joined by session_exercises, never by completed_sets.session_id: it is nullable.
                -- A best of 0 (0.4 × 2 rounds to 0) is stored as NULL, like `best || null` in the JS.
                (SELECT NULLIF(MAX(epley_1rm(cs.weight, cs.reps_completed)), 0)
                 FROM completed_sets cs
                 JOIN session_exercises se ON se.id = cs.session_exercise_id
                 WHERE se.session_id = ess.session_id
                   AND se.exercise_id = ess.exercise_id) AS best_1rm
            FROM exercise_session_stats ess
            JOIN exercises e ON e.id = ess.exercise_id
            WHERE ess.user_id = p_user_id
              AND (p_exercise_id IS NULL OR ess.exercise_id = p_exercise_id)
              AND (p_gym_id IS NULL OR ess.gym_id = p_gym_id)
              AND stores_best_1rm(e.tracked_fields)
        ),
        changed AS (
            UPDATE exercise_session_stats ess
            SET best_1rm = rebuilt.best_1rm
            FROM rebuilt
            WHERE ess.id = rebuilt.id
              AND ess.best_1rm IS DISTINCT FROM rebuilt.best_1rm
            RETURNING ess.exercise_id, ess.gym_id
        )
        SELECT DISTINCT exercise_id, gym_id FROM changed
    LOOP
        PERFORM recalculate_exercise_prs_for_user(p_user_id, r.exercise_id, '-infinity'::TIMESTAMPTZ, r.gym_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rebuild_best_1rm_for_user(UUID, INTEGER, BIGINT) IS 'Recomputes best_1rm of one user''s exercise_session_stats (narrowed to one exercise and one gym when given) from completed_sets with epley_1rm, writes only the rows whose value changes, and recalculates the PRs of every (exercise, gym) it wrote. Internal: convert_user_weights calls it after converting; migration 076 ran it for every user; the e2e runs it on a seeded history.';

-- It takes any user: nobody but its owner may call it.
REVOKE ALL ON FUNCTION rebuild_best_1rm_for_user(UUID, INTEGER, BIGINT) FROM PUBLIC, anon, authenticated;

-- ============================================
-- 4. CONVERT_USER_WEIGHTS (074 + best_1rm recomputed)
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
    -- best_1rm of weight × reps is left as is: scaled, it is no whole number and no longer what its
    -- sets give (#194). Section 4 recomputes it from the converted sets.
    -- ============================================
    IF p_scope = 'exercise' THEN
        UPDATE exercise_session_stats ess
        SET
            best_weight     = CASE WHEN best_weight     IS NOT NULL THEN ROUND(best_weight     * p_factor, 2) END,
            best_1rm        = CASE WHEN stores_best_1rm(e.tracked_fields) THEN best_1rm
                                   ELSE ROUND(best_1rm * p_factor, 2) END,
            total_volume    = CASE WHEN total_volume    IS NOT NULL THEN ROUND(total_volume    * p_factor, 2) END,
            best_assistance = CASE WHEN best_assistance IS NOT NULL THEN ROUND(best_assistance * p_factor, 2) END,
            best_per_reps = (
                SELECT jsonb_object_agg(kv.key, ROUND(kv.value::NUMERIC * p_factor, 2))
                FROM jsonb_each_text(ess.best_per_reps) kv
            )
        FROM exercises e
        WHERE e.id = ess.exercise_id
          AND ess.user_id = v_user_id
          AND ess.exercise_id = p_exercise_id
          AND ess.gym_id = p_gym_id;
    ELSE
        UPDATE exercise_session_stats ess
        SET
            best_weight     = CASE WHEN best_weight     IS NOT NULL THEN ROUND(best_weight     * p_factor, 2) END,
            best_1rm        = CASE WHEN stores_best_1rm(e.tracked_fields) THEN best_1rm
                                   ELSE ROUND(best_1rm * p_factor, 2) END,
            total_volume    = CASE WHEN total_volume    IS NOT NULL THEN ROUND(total_volume    * p_factor, 2) END,
            best_assistance = CASE WHEN best_assistance IS NOT NULL THEN ROUND(best_assistance * p_factor, 2) END,
            best_per_reps = (
                SELECT jsonb_object_agg(kv.key, ROUND(kv.value::NUMERIC * p_factor, 2))
                FROM jsonb_each_text(ess.best_per_reps) kv
            )
        FROM exercises e
        WHERE e.id = ess.exercise_id
          AND ess.user_id = v_user_id
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

    -- ============================================
    -- 4. BEST_1RM OF WEIGHT × REPS
    -- Recomputed from the sets section 1 converted, with the formula of a new set, and the PRs of
    -- every (exercise, gym) it changes recalculated. The global scope rebuilds every row of the user:
    -- the pairs it skipped still match their unconverted sets, so nothing is written for them.
    -- ============================================
    IF p_scope = 'exercise' THEN
        PERFORM rebuild_best_1rm_for_user(v_user_id, p_exercise_id, p_gym_id);
    ELSE
        PERFORM rebuild_best_1rm_for_user(v_user_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION convert_user_weights(TEXT, NUMERIC, INTEGER, TEXT, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION convert_user_weights(TEXT, NUMERIC, INTEGER, TEXT, BIGINT) TO authenticated, service_role;

COMMENT ON TABLE exercise_session_stats IS 'Every weight-valued column (best_weight, best_1rm, total_volume, best_assistance, best_per_reps) is converted by convert_user_weights when the user changes a weight unit: a new one must be added there, or it stays in the old unit. best_1rm of weight × reps is not scaled there but recomputed from the converted sets (rebuild_best_1rm_for_user), so it stays equal to the 1RM a new set gives.';

-- ============================================
-- 5. DATA: EVERY USER
-- ============================================

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    FOR v_user_id IN SELECT DISTINCT user_id FROM exercise_session_stats LOOP
        PERFORM rebuild_best_1rm_for_user(v_user_id);
    END LOOP;
END;
$$;
