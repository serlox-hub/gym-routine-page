-- convert_user_weights converts best_per_reps too (issue #192), and repairs the rows it skipped.
--
-- The RPC scaled completed_sets.weight and, in exercise_session_stats, best_weight, best_1rm and
-- total_volume, but never best_per_reps (best weight per rep count). Rep-PR detection compares
-- against it, so after kg → lb the next sets beat the stale kg numbers (false rep PRs), and after
-- lb → kg they almost never beat the stale lb numbers (rep PRs stop).
--
--   1. The RPC scales best_per_reps with the same factor, rounding and scope as the other stats.
--      Every value of the scope moves by the same factor, so pr_rep_counts stays valid, like the
--      is_pr_* flags.
--   2. Backfill. Scaling cannot tell which rows were converted already, so best_per_reps is rebuilt
--      from completed_sets (already converted) with the app's rule (calculateSessionExerciseStats in
--      sessionStatsCalculation.js): exercises tracking weight and reps, sets with weight > 0 and
--      reps > 0, the heaviest weight per exact rep count. Only rows whose value differs are written.
--      Rows with NULL are left alone: that is the gap of 043, not this bug.
--   3. Each (user, exercise, gym) repaired gets its pr_rep_counts recalculated from its first
--      session: the rep PRs judged against the stale numbers are saved there. Only pr_rep_counts:
--      recalculate_exercise_prs also resets the 7 is_pr_* flags, which were judged against
--      best_weight, best_1rm and total_volume (converted all along), so they are put back as they
--      were. Recalculating them would mark reps and volume PRs the app never marks on weight × reps
--      (docs/DECISIONS.md, `tracked_fields` entry, «Divergencia conocida»).
--
-- Same signature, so CREATE OR REPLACE keeps the grants of 066; they are restated anyway.

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
    -- 2. EXERCISE_SESSION_STATS (best_weight, best_1rm, total_volume, best_per_reps)
    -- Every set of the scope is multiplied by the same constant, so the is_pr_* flags and
    -- pr_rep_counts stay valid (the ranking holds); only the values change.
    -- best_per_reps NULL stays NULL: no keys to aggregate.
    -- best_1rm scaled is no longer a whole number, unlike the 1RM of a new set (#194).
    -- ============================================
    IF p_scope = 'exercise' THEN
        UPDATE exercise_session_stats ess
        SET
            best_weight   = CASE WHEN best_weight  IS NOT NULL THEN ROUND(best_weight  * p_factor, 2) END,
            best_1rm      = CASE WHEN best_1rm     IS NOT NULL THEN ROUND(best_1rm     * p_factor, 2) END,
            total_volume  = CASE WHEN total_volume IS NOT NULL THEN ROUND(total_volume * p_factor, 2) END,
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
            best_weight   = CASE WHEN best_weight  IS NOT NULL THEN ROUND(best_weight  * p_factor, 2) END,
            best_1rm      = CASE WHEN best_1rm     IS NOT NULL THEN ROUND(best_1rm     * p_factor, 2) END,
            total_volume  = CASE WHEN total_volume IS NOT NULL THEN ROUND(total_volume * p_factor, 2) END,
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

-- 039 added best_per_reps without touching the RPC, and 053 redefined the RPC without it.
COMMENT ON TABLE exercise_session_stats IS 'Every weight-valued column (best_weight, best_1rm, total_volume, best_per_reps) is converted by convert_user_weights when the user changes a weight unit: a new one must be added there, or it stays in the old unit.';

-- ============================================
-- BACKFILL: rows a conversion left in the old unit
-- ============================================
-- `<>` is NULL when the stored value is NULL, so those rows drop out here.
CREATE TEMP TABLE _stale_best_per_reps AS
WITH per_rep_max AS (
    SELECT cs.session_id, se.exercise_id, cs.reps_completed, MAX(cs.weight) AS max_weight
    FROM completed_sets cs
    JOIN session_exercises se ON se.id = cs.session_exercise_id
    JOIN exercises e ON e.id = se.exercise_id
    WHERE cs.weight > 0
      AND cs.reps_completed > 0
      AND e.tracked_fields @> ARRAY['weight', 'reps']::measurement_field[]
    GROUP BY cs.session_id, se.exercise_id, cs.reps_completed
),
rebuilt AS (
    SELECT session_id, exercise_id, jsonb_object_agg(reps_completed::TEXT, max_weight) AS best_per_reps
    FROM per_rep_max
    GROUP BY session_id, exercise_id
)
SELECT ess.id, ess.user_id, ess.exercise_id, ess.gym_id, r.best_per_reps
FROM exercise_session_stats ess
JOIN rebuilt r ON r.session_id = ess.session_id AND r.exercise_id = ess.exercise_id
WHERE ess.best_per_reps <> r.best_per_reps;

UPDATE exercise_session_stats ess
SET best_per_reps = s.best_per_reps
FROM _stale_best_per_reps s
WHERE ess.id = s.id;

CREATE TEMP TABLE _kept_pr_flags AS
SELECT ess.id, ess.is_pr_weight, ess.is_pr_reps, ess.is_pr_1rm, ess.is_pr_volume,
       ess.is_pr_time, ess.is_pr_distance, ess.is_pr_pace
FROM exercise_session_stats ess
JOIN (SELECT DISTINCT user_id, exercise_id, gym_id FROM _stale_best_per_reps) g
  ON g.user_id = ess.user_id
 AND g.exercise_id = ess.exercise_id
 AND g.gym_id IS NOT DISTINCT FROM ess.gym_id;

DO $$
DECLARE
    v_group RECORD;
BEGIN
    FOR v_group IN SELECT DISTINCT user_id, exercise_id, gym_id FROM _stale_best_per_reps LOOP
        -- recalculate_exercise_prs only touches auth.uid()'s rows, and auth.uid() reads this
        -- setting: it runs as the owner of the rows, as if they had called it.
        PERFORM set_config('request.jwt.claim.sub', v_group.user_id::TEXT, true);
        PERFORM recalculate_exercise_prs(v_group.exercise_id, '-infinity', v_group.gym_id);
    END LOOP;
    PERFORM set_config('request.jwt.claim.sub', '', true);
END;
$$;

UPDATE exercise_session_stats ess
SET is_pr_weight = k.is_pr_weight,
    is_pr_reps = k.is_pr_reps,
    is_pr_1rm = k.is_pr_1rm,
    is_pr_volume = k.is_pr_volume,
    is_pr_time = k.is_pr_time,
    is_pr_distance = k.is_pr_distance,
    is_pr_pace = k.is_pr_pace
FROM _kept_pr_flags k
WHERE ess.id = k.id;

DROP TABLE _kept_pr_flags;

DROP TABLE _stale_best_per_reps;
