-- Issue #113: add an exercise to the active session and, with p_add_to_routine, also to the routine
-- day the session comes from, in one transaction. Before this the client computed the position,
-- shifted the later rows with parallel UPDATEs against UNIQUE (session_id, sort_order) and inserted
-- in a separate call, dropping target_field and level on the way.
--
-- SECURITY INVOKER on purpose, as 063 and 064: RLS does access control. The exercise FK bypasses
-- RLS, so its availability is checked explicitly.
--
-- Session position (unchanged from the client version): joining a superset that has members puts
-- the row right after its last member, inheriting is_warmup from its first member; anything else
-- (standalone, or a new group number with no members yet) goes to the end with is_warmup = FALSE.
--
-- Routine superset mapping (strict): the session superset "exists in the routine" only if at
-- least one of its other members is linked to a routine row of this day AND every linked member's
-- routine row has the same non-null superset_group R. Unlinked members (extras added "only today")
-- are ignored. A session-only superset (joined in the session after #96, or created there) or a mix
-- of groups does not map: its other members are not in the routine, so creating a routine superset
-- for it would leave a one-member superset there. The routine row goes in standalone instead, at
-- the end of the day, keeping the session row's is_warmup (a warm-up superset stays in warm-up).
--
-- A session whose day was deleted (routine_day_id NULL, FK ON DELETE SET NULL) adds to the session
-- only and returns routine_exercise_id NULL: not an error, the client tells the user.

CREATE OR REPLACE FUNCTION add_session_exercise(
  p_session_id UUID,
  p_exercise_id INTEGER,
  p_fields JSONB,
  p_superset_group INTEGER,
  p_add_to_routine BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_unknown TEXT;
  v_routine_day_id INTEGER;
  v_member_last_sort INTEGER;
  v_sort_order INTEGER;
  v_is_warmup BOOLEAN := FALSE;
  v_session_exercise_id INTEGER;
  v_routine_group INTEGER;
  v_routine_last_sort INTEGER;
  v_routine_sort_order INTEGER;
  v_routine_is_warmup BOOLEAN;
  v_routine_exercise_id INTEGER;
BEGIN
  SELECT k INTO v_unknown
  FROM jsonb_object_keys(p_fields) AS k
  WHERE k NOT IN ('series', 'target_field', 'reps', 'level', 'rir', 'rest_seconds', 'notes')
  LIMIT 1;

  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'unknown_field: %', v_unknown USING ERRCODE = '22023';
  END IF;

  IF p_fields->>'series' IS NULL OR p_fields->>'reps' IS NULL THEN
    RAISE EXCEPTION 'missing_field: series and reps are required' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM exercises WHERE id = p_exercise_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exercise_not_available' USING ERRCODE = 'P0002';
  END IF;

  -- The lock serialises two quick adds to the same session: without it both read the same max
  -- sort_order and the second one hits the UNIQUE constraint.
  SELECT routine_day_id INTO v_routine_day_id
  FROM workout_sessions
  WHERE id = p_session_id
  FOR NO KEY UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF p_superset_group IS NOT NULL THEN
    SELECT max(sort_order) INTO v_member_last_sort
    FROM session_exercises
    WHERE session_id = p_session_id AND superset_group = p_superset_group;
  END IF;

  IF v_member_last_sort IS NOT NULL THEN
    SELECT COALESCE(is_warmup, FALSE) INTO v_is_warmup
    FROM session_exercises
    WHERE session_id = p_session_id AND superset_group = p_superset_group
    ORDER BY sort_order
    LIMIT 1;

    -- Two steps because UNIQUE (session_id, sort_order) is not deferrable, as in 062: a plain +1
    -- collides row by row. Negative values first free every slot.
    UPDATE session_exercises SET sort_order = -sort_order
    WHERE session_id = p_session_id AND sort_order > v_member_last_sort;

    UPDATE session_exercises SET sort_order = -sort_order + 1
    WHERE session_id = p_session_id AND sort_order < 0;

    v_sort_order := v_member_last_sort + 1;
  ELSE
    SELECT COALESCE(max(sort_order), 0) + 1 INTO v_sort_order
    FROM session_exercises
    WHERE session_id = p_session_id;
  END IF;

  INSERT INTO session_exercises (
    session_id, exercise_id, routine_exercise_id, sort_order,
    series, target_field, reps, level, rir, rest_seconds, notes,
    superset_group, is_extra, is_warmup
  ) VALUES (
    p_session_id, p_exercise_id, NULL, v_sort_order,
    (p_fields->>'series')::SMALLINT,
    (p_fields->>'target_field')::measurement_field,
    p_fields->>'reps',
    (p_fields->>'level')::SMALLINT,
    (p_fields->>'rir')::SMALLINT,
    (p_fields->>'rest_seconds')::INTEGER,
    p_fields->>'notes',
    p_superset_group, TRUE, v_is_warmup
  )
  RETURNING id INTO v_session_exercise_id;

  IF NOT COALESCE(p_add_to_routine, FALSE) OR v_routine_day_id IS NULL THEN
    RETURN jsonb_build_object('session_exercise_id', v_session_exercise_id, 'routine_exercise_id', NULL);
  END IF;

  -- NULL unless the superset maps (see the header). The new row is not linked yet, so it never
  -- counts as a member here.
  IF p_superset_group IS NOT NULL THEN
    SELECT CASE
      WHEN count(*) > 0
        AND count(re.superset_group) = count(*)
        AND min(re.superset_group) = max(re.superset_group)
      THEN min(re.superset_group)
    END INTO v_routine_group
    FROM session_exercises se
    JOIN routine_exercises re ON re.id = se.routine_exercise_id
    WHERE se.session_id = p_session_id
      AND se.superset_group = p_superset_group
      AND NOT COALESCE(se.is_extra, FALSE)
      AND re.routine_day_id = v_routine_day_id;
  END IF;

  IF v_routine_group IS NOT NULL THEN
    SELECT sort_order, COALESCE(is_warmup, FALSE) INTO v_routine_last_sort, v_routine_is_warmup
    FROM routine_exercises
    WHERE routine_day_id = v_routine_day_id AND superset_group = v_routine_group
    ORDER BY sort_order DESC
    LIMIT 1;

    -- routine_exercises has no UNIQUE on sort_order, so a plain +1 is safe here.
    UPDATE routine_exercises SET sort_order = sort_order + 1
    WHERE routine_day_id = v_routine_day_id AND sort_order > v_routine_last_sort;

    v_routine_sort_order := v_routine_last_sort + 1;
  ELSE
    v_routine_is_warmup := v_is_warmup;

    -- sort_order is per day across both blocks: the block comes from is_warmup.
    SELECT COALESCE(max(sort_order), 0) + 1 INTO v_routine_sort_order
    FROM routine_exercises
    WHERE routine_day_id = v_routine_day_id;
  END IF;

  -- Copied from the session row just inserted, so both rows get exactly the same values.
  -- user_id is filled by the trg_routine_exercises_set_user_id trigger from the day's routine.
  INSERT INTO routine_exercises (
    routine_day_id, exercise_id, sort_order,
    series, target_field, reps, level, rir, rest_seconds, notes,
    superset_group, is_warmup
  )
  SELECT
    v_routine_day_id, exercise_id, v_routine_sort_order,
    series, target_field, reps, level, rir, rest_seconds, notes,
    v_routine_group, v_routine_is_warmup
  FROM session_exercises
  WHERE id = v_session_exercise_id
  RETURNING id INTO v_routine_exercise_id;

  -- Linked, the row behaves like any routine-origin row: edits propagate through 063 and a later
  -- replace offers the routine option.
  UPDATE session_exercises SET routine_exercise_id = v_routine_exercise_id, is_extra = FALSE
  WHERE id = v_session_exercise_id;

  RETURN jsonb_build_object('session_exercise_id', v_session_exercise_id, 'routine_exercise_id', v_routine_exercise_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION add_session_exercise(UUID, INTEGER, JSONB, INTEGER, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_session_exercise(UUID, INTEGER, JSONB, INTEGER, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION add_session_exercise IS 'Adds an exercise to a workout session and, with p_add_to_routine, also to the session''s routine day, linking both rows, in one transaction. Returns { session_exercise_id, routine_exercise_id } (NULL when added to the session only). A session superset maps to a routine superset only when every linked member shares one routine group; otherwise the routine row goes in standalone. SECURITY INVOKER on purpose: RLS protects it.';

-- These comments described every row with routine_exercise_id NULL as an extra. An exercise added
-- mid-session to the routine too is now stored as a routine-origin row.
COMMENT ON COLUMN session_exercises.routine_exercise_id IS 'Routine row this session row comes from: copied when the session started, or created when an exercise added mid-session was also added to the routine (add_session_exercise). NULL when added to this session only, in a repeated or free session, or when the routine row was deleted.';

COMMENT ON COLUMN session_exercises.is_extra IS 'TRUE if added mid-session to that session only (a repeated session copies it from its source). An exercise added mid-session and also to the routine is stored as a routine-origin row (FALSE, with routine_exercise_id).';
