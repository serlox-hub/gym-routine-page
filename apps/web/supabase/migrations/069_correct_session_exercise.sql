-- RPC to correct the exercise of a row of a COMPLETED session (logged the wrong one), keeping its
-- sets. Unlike replace_session_exercise (064, active session), it never deletes sets nor touches the
-- routine, and only accepts an exercise that measures the same fields, so the sets fit as they are.
--
-- SECURITY INVOKER on purpose, like 064: RLS protects it.
--
-- Weights are stored raw in the unit resolved for (exercise, gym), so if the two exercises resolve
-- to different units the numbers would change meaning. The client resolves both and passes the
-- factor (same as convert_user_weights); NULL would wipe the weights, hence the check.
--
-- Stats: the per-session stats are computed in JS (recalculateSessionStats), which only looks at
-- exercises currently in the session, so it would never delete the old exercise's row: done here,
-- together with the old exercise's PR flags. The client rebuilds the new exercise's row afterwards.
--
-- The no-op when the row already has the new exercise is what makes a client retry safe after a
-- failed recalculation: the factor is not applied twice.

CREATE OR REPLACE FUNCTION correct_session_exercise(
  p_session_exercise_id INTEGER,
  p_new_exercise_id INTEGER,
  p_weight_factor NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_old_exercise_id INTEGER;
  v_session_id UUID;
  v_status session_status;
  v_started_at TIMESTAMPTZ;
  v_gym_id BIGINT;
  v_old_fields measurement_field[];
  v_new_fields measurement_field[];
BEGIN
  IF p_weight_factor IS NULL OR p_weight_factor <= 0 THEN
    RAISE EXCEPTION 'invalid_weight_factor' USING ERRCODE = '22023';
  END IF;

  SELECT exercise_id, session_id INTO v_old_exercise_id, v_session_id
  FROM session_exercises
  WHERE id = p_session_exercise_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_exercise_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT status, started_at, gym_id INTO v_status, v_started_at, v_gym_id
  FROM workout_sessions
  WHERE id = v_session_id;

  IF v_status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'session_not_completed' USING ERRCODE = 'P0001';
  END IF;

  IF p_new_exercise_id = v_old_exercise_id THEN
    RETURN;
  END IF;

  -- The FK skips RLS: without this check the row could point at another user's private exercise
  -- or a soft-deleted one.
  SELECT tracked_fields INTO v_new_fields
  FROM exercises
  WHERE id = p_new_exercise_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'exercise_not_available' USING ERRCODE = 'P0002';
  END IF;

  SELECT tracked_fields INTO v_old_fields FROM exercises WHERE id = v_old_exercise_id;

  -- Compared as sets: the stored order is irrelevant (see the column comment). NULL = the old
  -- exercise is not visible to the caller (RLS): fail closed, NOT (NULL) would let it through.
  IF v_old_fields IS NULL OR NOT (v_old_fields @> v_new_fields AND v_new_fields @> v_old_fields) THEN
    RAISE EXCEPTION 'tracked_fields_mismatch' USING ERRCODE = 'P0001';
  END IF;

  IF p_weight_factor <> 1 THEN
    UPDATE completed_sets
    SET weight = ROUND(weight * p_weight_factor, 2)
    WHERE session_exercise_id = p_session_exercise_id AND weight IS NOT NULL;
  END IF;

  UPDATE session_exercises SET exercise_id = p_new_exercise_id WHERE id = p_session_exercise_id;

  -- Another row of the same session may still use the old exercise: its row is still valid then,
  -- and recalculateSessionStats rebuilds it.
  IF NOT EXISTS (
    SELECT 1 FROM session_exercises
    WHERE session_id = v_session_id AND exercise_id = v_old_exercise_id
  ) THEN
    DELETE FROM exercise_session_stats
    WHERE session_id = v_session_id AND exercise_id = v_old_exercise_id;
  END IF;

  PERFORM recalculate_exercise_prs(v_old_exercise_id, v_started_at, v_gym_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION correct_session_exercise(INTEGER, INTEGER, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION correct_session_exercise(INTEGER, INTEGER, NUMERIC) TO authenticated, service_role;

COMMENT ON FUNCTION correct_session_exercise IS 'Corrects the exercise of a row of a completed session, keeping its sets (weights times p_weight_factor, rounded to 2 decimals). Only to an exercise with the same tracked_fields; never touches the routine. Deletes the old exercise''s stale stats row and recalculates its PR flags; the client rebuilds the new one (recalculateSessionStats). No-op when the row already has the new exercise. SECURITY INVOKER: RLS protects it.';
