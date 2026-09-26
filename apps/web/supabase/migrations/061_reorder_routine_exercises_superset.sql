-- Issue #89: join and leave supersets by dragging exercises. Membership (`superset_group`) has to
-- change in the SAME write as the order: a superset is a run of consecutive rows sharing a group,
-- and setting the group without placing the row next to its run renders the superset split into
-- two cards.
--
-- Same signature as before (CREATE OR REPLACE keeps the OWNER). Each item is
-- `{ id, sort_order, superset_group? }`:
-- - Without the `superset_group` key, the row keeps its group. That ELSE is what stops every
--   reorder from nulling every superset in the database.
-- - With `superset_group: null` (JSON null), `->>` yields SQL NULL: the row leaves its superset.

CREATE OR REPLACE FUNCTION reorder_routine_exercises(exercise_orders JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(exercise_orders) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM routine_exercises re
      JOIN routine_days rd ON rd.id = re.routine_day_id
      JOIN routines r ON r.id = rd.routine_id
      WHERE re.id = (item->>'id')::int
        AND r.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a uno o más ejercicios';
  END IF;

  -- The access check limits the payload to the caller's rows, not to one day: without this, a
  -- crafted payload could mix membership across days. Every caller sends one day. An empty payload
  -- stays a no-op (> 1, not <> 1).
  IF (
    SELECT count(DISTINCT re.routine_day_id)
    FROM jsonb_array_elements(exercise_orders) AS item
    JOIN routine_exercises re ON re.id = (item->>'id')::int
  ) > 1 THEN
    RAISE EXCEPTION 'Exercises to reorder must belong to a single day';
  END IF;

  UPDATE routine_exercises re
  SET sort_order = (item->>'sort_order')::int,
      superset_group = CASE
        WHEN item ? 'superset_group' THEN (item->>'superset_group')::int
        ELSE re.superset_group
      END
  FROM jsonb_array_elements(exercise_orders) AS item
  WHERE re.id = (item->>'id')::int;
END;
$$;

COMMENT ON FUNCTION reorder_routine_exercises IS 'Reorders the exercises of ONE routine day in batch. Takes a JSONB array of {id, sort_order, superset_group?}: superset_group is written only when the key is present (null = leave the superset).';
