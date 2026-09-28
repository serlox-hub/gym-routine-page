-- Issue #116: turn a past session (History) into a new routine day, creating the routine too when
-- asked, in one transaction. The rows are built by the client (`buildRoutineDayFromSession`,
-- packages/shared/src/lib/sessionToRoutineDay.js), where every copy rule is unit-tested: the repo has
-- no SQL tests. This function only validates and inserts, so a failure leaves neither a routine nor
-- a day behind (the orphan empty day that 059 fixed came from a two-step client write).
--
-- It still checks the row invariants instead of trusting the builder: its generic name invites
-- other callers, and a superset rule held only by one client function is not held. Every check runs
-- before the first INSERT.
--
-- SECURITY INVOKER on purpose, as 063-065: RLS does access control. The exercise FK bypasses RLS,
-- so each exercise's availability is checked with a SELECT, as 065 does.
--
-- The source session is neither read nor modified here: history records what happened.

CREATE OR REPLACE FUNCTION create_routine_day_with_exercises(
  p_routine_id INTEGER,
  p_new_routine_name TEXT,
  p_day_name TEXT,
  p_exercises JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_new_routine_name TEXT := btrim(p_new_routine_name);
  v_day_name TEXT := btrim(p_day_name);
  v_unknown TEXT;
  v_rows_ok BOOLEAN;
  v_routine_id INTEGER;
  v_day_sort_order INTEGER;
  v_day_id INTEGER;
BEGIN
  IF (p_routine_id IS NULL) = (p_new_routine_name IS NULL) THEN
    RAISE EXCEPTION 'invalid_arguments: pass either p_routine_id or p_new_routine_name' USING ERRCODE = '22023';
  END IF;

  IF v_new_routine_name = '' THEN
    RAISE EXCEPTION 'invalid_arguments: the routine name is empty' USING ERRCODE = '22023';
  END IF;

  IF v_day_name IS NULL OR v_day_name = '' THEN
    RAISE EXCEPTION 'invalid_arguments: the day name is empty' USING ERRCODE = '22023';
  END IF;

  IF p_exercises IS NULL OR jsonb_typeof(p_exercises) <> 'array' THEN
    RAISE EXCEPTION 'invalid_arguments: p_exercises must be an array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_exercises) = 0 THEN
    RAISE EXCEPTION 'nothing_to_copy' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_exercises) AS item WHERE jsonb_typeof(item) <> 'object') THEN
    RAISE EXCEPTION 'invalid_arguments: every row must be an object' USING ERRCODE = '22023';
  END IF;

  SELECT k INTO v_unknown
  FROM jsonb_array_elements(p_exercises) AS item, jsonb_object_keys(item) AS k
  WHERE k NOT IN (
    'exercise_id', 'sort_order', 'series', 'reps', 'target_field', 'level', 'rir',
    'rest_seconds', 'notes', 'superset_group', 'is_warmup'
  )
  LIMIT 1;

  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'unknown_field: %', v_unknown USING ERRCODE = '22023';
  END IF;

  -- A JSON null counts as missing: `->>` yields SQL NULL for both.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_exercises) AS item
    WHERE item->>'exercise_id' IS NULL OR item->>'sort_order' IS NULL
      OR item->>'series' IS NULL OR item->>'reps' IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid_arguments: exercise_id, sort_order, series and reps are required' USING ERRCODE = '22023';
  END IF;

  -- sort_order is exactly 1..n (so, with no repeats), every row has at least one series, and every
  -- warm-up row comes before every main row: the day is one sort_order sequence across both blocks.
  SELECT
    count(*) = count(DISTINCT x.sort_order) AND min(x.sort_order) = 1 AND max(x.sort_order) = count(*)
      AND bool_and(x.series >= 1)
      AND COALESCE(
        max(x.sort_order) FILTER (WHERE COALESCE(x.is_warmup, FALSE))
          < min(x.sort_order) FILTER (WHERE NOT COALESCE(x.is_warmup, FALSE)),
        TRUE
      )
  INTO v_rows_ok
  FROM jsonb_to_recordset(p_exercises) AS x(sort_order INTEGER, series INTEGER, is_warmup BOOLEAN);

  IF NOT v_rows_ok THEN
    RAISE EXCEPTION 'invalid_arguments: sort_order must be 1..n, series at least 1, and warm-up rows first' USING ERRCODE = '22023';
  END IF;

  -- A superset is a run of consecutive rows (the app groups only those), so each group has at least
  -- two rows (065 never creates a one-member superset), is contiguous and sits in one block. With
  -- sort_order unique, "contiguous" is max - min + 1 = count.
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_exercises) AS x(sort_order INTEGER, is_warmup BOOLEAN, superset_group INTEGER)
    WHERE x.superset_group IS NOT NULL
    GROUP BY x.superset_group
    HAVING count(*) < 2
      OR max(x.sort_order) - min(x.sort_order) + 1 <> count(*)
      OR count(DISTINCT COALESCE(x.is_warmup, FALSE)) > 1
  ) THEN
    RAISE EXCEPTION 'invalid_arguments: a superset needs two or more contiguous rows in one block' USING ERRCODE = '22023';
  END IF;

  -- Not visible to the caller under RLS (another user's custom exercise) or soft-deleted.
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_exercises) AS x(exercise_id INTEGER)
    WHERE NOT EXISTS (SELECT 1 FROM exercises e WHERE e.id = x.exercise_id AND e.deleted_at IS NULL)
  ) THEN
    RAISE EXCEPTION 'exercise_not_available' USING ERRCODE = 'P0002';
  END IF;

  IF p_routine_id IS NOT NULL THEN
    -- The lock serialises two conversions into the same routine: without it both read the same
    -- max day sort_order and the two days get the same position.
    SELECT id INTO v_routine_id
    FROM routines
    WHERE id = p_routine_id
    FOR NO KEY UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'routine_not_found' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    -- The routines insert policy requires user_id = auth.uid().
    INSERT INTO routines (name, user_id)
    VALUES (v_new_routine_name, auth.uid())
    RETURNING id INTO v_routine_id;
  END IF;

  -- The new day goes last; days can be reordered afterwards.
  SELECT COALESCE(max(sort_order), 0) + 1 INTO v_day_sort_order
  FROM routine_days
  WHERE routine_id = v_routine_id;

  INSERT INTO routine_days (routine_id, name, estimated_duration_min, sort_order)
  VALUES (v_routine_id, v_day_name, NULL, v_day_sort_order)
  RETURNING id INTO v_day_id;

  -- user_id is filled by the trg_routine_exercises_set_user_id trigger from the day's routine.
  -- Checklist "cuando se modifique el modelo de datos" in docs/routine-io.md includes this list.
  INSERT INTO routine_exercises (
    routine_day_id, exercise_id, sort_order,
    series, target_field, reps, level, rir, rest_seconds, notes,
    superset_group, is_warmup
  )
  SELECT
    v_day_id, x.exercise_id, x.sort_order,
    x.series, x.target_field, x.reps, x.level, x.rir, x.rest_seconds, x.notes,
    x.superset_group, COALESCE(x.is_warmup, FALSE)
  FROM jsonb_to_recordset(p_exercises) AS x(
    exercise_id INTEGER, sort_order SMALLINT, series SMALLINT, target_field measurement_field,
    reps TEXT, level SMALLINT, rir SMALLINT, rest_seconds INTEGER, notes TEXT,
    superset_group INTEGER, is_warmup BOOLEAN
  );

  RETURN jsonb_build_object('routine_id', v_routine_id, 'day_id', v_day_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION create_routine_day_with_exercises(INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_routine_day_with_exercises(INTEGER, TEXT, TEXT, JSONB) TO authenticated, service_role;

COMMENT ON FUNCTION create_routine_day_with_exercises IS 'Creates a routine day with its exercises, and the routine first when p_routine_id is NULL (p_new_routine_name is then required), in one transaction. Validates the rows (whitelisted keys, sort_order 1..n, warm-up first, supersets of two or more contiguous rows in one block, exercises available) before inserting. Returns { routine_id, day_id }. SECURITY INVOKER on purpose: RLS protects it.';
