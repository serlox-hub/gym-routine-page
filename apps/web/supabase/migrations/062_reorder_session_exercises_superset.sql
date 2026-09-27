-- Issue #95: join and leave supersets by dragging exercises in the active session. Same change as
-- 061 made for routines: membership (`superset_group`) changes in the SAME write as the order,
-- because a superset is a run of consecutive rows sharing a group and a group written without
-- placing the row renders the superset split into two cards.
--
-- Same signature as before (CREATE OR REPLACE keeps the OWNER). Each item is
-- `{ id, sort_order, superset_group? }`:
-- - Without the `superset_group` key, the row keeps its group. That ELSE is what stops every
--   reorder from nulling every superset of the session.
-- - With `superset_group: null` (JSON null), `->>` yields SQL NULL: the row leaves its superset.

CREATE OR REPLACE FUNCTION reorder_session_exercises(exercise_orders JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(exercise_orders) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM session_exercises se
      JOIN workout_sessions ws ON ws.id = se.session_id
      WHERE se.id = (item->>'id')::int
        AND ws.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a uno o más ejercicios de sesión';
  END IF;

  -- The access check limits the payload to the caller's rows, not to one session: without this, a
  -- crafted payload could mix membership across sessions. Every caller sends one session. An empty
  -- payload stays a no-op (> 1, not <> 1).
  IF (
    SELECT count(DISTINCT se.session_id)
    FROM jsonb_array_elements(exercise_orders) AS item
    JOIN session_exercises se ON se.id = (item->>'id')::int
  ) > 1 THEN
    RAISE EXCEPTION 'Exercises to reorder must belong to a single session';
  END IF;

  -- Two steps because of UNIQUE (session_id, sort_order): negative values first free every slot.
  UPDATE session_exercises se
  SET sort_order = -(item->>'sort_order')::int
  FROM jsonb_array_elements(exercise_orders) AS item
  WHERE se.id = (item->>'id')::int;

  UPDATE session_exercises se
  SET sort_order = (item->>'sort_order')::int,
      superset_group = CASE
        WHEN item ? 'superset_group' THEN (item->>'superset_group')::int
        ELSE se.superset_group
      END
  FROM jsonb_array_elements(exercise_orders) AS item
  WHERE se.id = (item->>'id')::int;
END;
$$;

COMMENT ON FUNCTION reorder_session_exercises IS 'Reorders the exercises of ONE workout session in batch. Takes a JSONB array of {id, sort_order, superset_group?}: superset_group is written only when the key is present (null = leave the superset).';
