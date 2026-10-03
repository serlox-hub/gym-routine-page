-- Issue #139: share a routine by link. A link is `<web origin>/r/<share_token>`; the token is opaque
-- and random, never the routine id. NULL = not shared.
--
-- The tables keep their owner-only RLS: no SELECT policy for shared routines, because RLS cannot see
-- the token in the link and such a policy would let every logged-in user list every shared routine.
-- The link is read through `get_shared_routine` instead, which needs the token.
--
-- The CHECK is what stops a client bug from turning a routine public under a guessable link: the
-- owner can still UPDATE any column of their own row (RLS allows it), so without it a stray '' or
-- '1' would be a valid token. A column-level UPDATE revoke cannot replace it: Postgres does not
-- revoke one column out of a table-level grant.

-- Supabase ships pgcrypto in `extensions`, but no migration says so: this makes the dependency
-- explicit (a no-op where it exists) instead of a first-click failure in `enable_routine_share`.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE routines
  ADD COLUMN share_token TEXT UNIQUE
  CONSTRAINT routines_share_token_format CHECK (share_token ~ '^[A-Za-z0-9_-]{22}$');

-- Every row an export needs, as one JSON. The ONLY list of the columns that make up an exported
-- routine: `exportRoutine` (through `buildRoutineExport`) and the shared link both read it, so a new
-- routine column added here reaches both. SECURITY INVOKER: called by a user, RLS limits it to their
-- own routines (NULL otherwise); called from `get_shared_routine`, it runs with the definer's rights.
CREATE OR REPLACE FUNCTION routine_export_rows(p_routine_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_routine JSONB;
BEGIN
  SELECT jsonb_build_object('name', r.name, 'description', r.description)
  INTO v_routine
  FROM routines r
  WHERE r.id = p_routine_id;

  IF v_routine IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'routine', v_routine,
    'days', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'estimated_duration_min', d.estimated_duration_min,
        'sort_order', d.sort_order
      ) ORDER BY d.sort_order, d.id)
      FROM routine_days d
      WHERE d.routine_id = p_routine_id
    ), '[]'::jsonb),
    'routine_exercises', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'routine_day_id', re.routine_day_id,
        'exercise_id', re.exercise_id,
        'series', re.series,
        'target_field', re.target_field,
        'reps', re.reps,
        'level', re.level,
        'rir', re.rir,
        'rest_seconds', re.rest_seconds,
        'notes', re.notes,
        'sort_order', re.sort_order,
        'is_warmup', COALESCE(re.is_warmup, FALSE),
        'superset_group', re.superset_group
      ) ORDER BY re.routine_day_id, re.sort_order, re.id)
      FROM routine_exercises re
      JOIN routine_days d ON d.id = re.routine_day_id
      WHERE d.routine_id = p_routine_id
    ), '[]'::jsonb),
    'exercises', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id,
        'name_es', e.name_es,
        'name_en', e.name_en,
        'tracked_fields', e.tracked_fields,
        'distance_unit', e.distance_unit,
        'instructions', e.instructions,
        'muscle_group_name_es', mg.name_es
      ) ORDER BY e.id)
      FROM exercises e
      LEFT JOIN muscle_groups mg ON mg.id = e.muscle_group_id
      WHERE e.id IN (
        SELECT re.exercise_id
        FROM routine_exercises re
        JOIN routine_days d ON d.id = re.routine_day_id
        WHERE d.routine_id = p_routine_id
      )
    ), '[]'::jsonb)
  );
END;
$$;

-- Public read by token. SECURITY DEFINER, so `routine_export_rows` runs with the owner's rights and
-- RLS does not hide the routine from a viewer without a session. It reveals only what the export
-- carries (no user_id, no email, no favorites, no personal overrides) and NULL for an unknown or NULL
-- token: without a valid 128-bit token it answers nothing.
CREATE OR REPLACE FUNCTION get_shared_routine(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_routine_id INTEGER;
BEGIN
  IF p_token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_routine_id FROM routines WHERE share_token = p_token;

  IF v_routine_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN routine_export_rows(v_routine_id);
END;
$$;

-- One conditional statement: idempotent and race-free. Two concurrent presses serialize on the row
-- lock, and the second one's COALESCE sees the first one's token, so both return the same link.
-- 16 random bytes in base64 are 24 chars ending in '=='; `translate` maps them to URL-safe ones and
-- drops the padding, leaving 22. Not `encode(..., 'base64url')`: Postgres 17 does not have it.
-- pgcrypto lives in the `extensions` schema in Supabase, hence the qualified name.
CREATE OR REPLACE FUNCTION enable_routine_share(p_routine_id INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  UPDATE routines
  SET share_token = COALESCE(share_token, translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_'))
  WHERE id = p_routine_id AND user_id = auth.uid()
  RETURNING share_token INTO v_token;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  RETURN v_token;
END;
$$;

-- Re-enabling afterwards creates a new token: the old link never comes back.
CREATE OR REPLACE FUNCTION disable_routine_share(p_routine_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE routines
  SET share_token = NULL
  WHERE id = p_routine_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION routine_export_rows(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routine_export_rows(INTEGER) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION enable_routine_share(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION enable_routine_share(INTEGER) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION disable_routine_share(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION disable_routine_share(INTEGER) TO authenticated, service_role;

-- The third kind of anon-executable function (CLAUDE.md "Function EXECUTE"): a public read by an
-- unguessable token, listed in ANON_ALLOWED (apps/web/scripts/functionGrants.js).
GRANT EXECUTE ON FUNCTION get_shared_routine(TEXT) TO anon, authenticated, service_role;

COMMENT ON FUNCTION routine_export_rows IS 'Every row a routine export needs, as JSONB { routine, days, routine_exercises, exercises }. The only list of export columns: exportRoutine and get_shared_routine both read it. SECURITY INVOKER: RLS limits it to the caller''s routines; NULL when the routine is not visible.';
COMMENT ON FUNCTION get_shared_routine IS 'Public read of a shared routine by its share_token: the routine_export_rows shape, or NULL for an unknown or NULL token. SECURITY DEFINER, executable by anon.';
COMMENT ON FUNCTION enable_routine_share IS 'Turns sharing on for one of the caller''s routines and returns its share_token, creating it only if missing (idempotent). Raises 42501 when the caller does not own the routine.';
COMMENT ON FUNCTION disable_routine_share IS 'Turns sharing off for one of the caller''s routines (share_token = NULL); the old link stops working for good. Raises 42501 when the caller does not own the routine.';
