-- Nobody without a session (the `anon` role, anyone holding the public key) executes the app's RPCs.
--
-- Two gaps, one outcome:
-- - 8 functions had no grant statements, so PUBLIC (anon included) could execute them everywhere.
-- - 6 functions ended with `REVOKE ... FROM PUBLIC` + `GRANT ... TO authenticated`, which works
--   locally but presumably not in production: that project was presumably created with an older
--   image whose default privileges grant EXECUTE on every new function straight to `anon`, and a
--   direct grant survives a revoke from PUBLIC (reproduced locally, not verified in production, see
--   #115). Hence the explicit `anon` in every REVOKE below, which is right whatever the cause.
-- Each function already rejects a NULL `auth.uid()` or hits RLS, so the leak was small. The point
-- is that the rule now holds in both databases, and for every function created from here on.

-- 1. Existing API functions: callable by logged-in users (and the service role) only.
REVOKE EXECUTE ON FUNCTION add_session_exercise(UUID, INTEGER, JSONB, INTEGER, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION add_session_exercise(UUID, INTEGER, JSONB, INTEGER, BOOLEAN) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION change_session_gym(UUID, BIGINT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION change_session_gym(UUID, BIGINT, JSONB) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION convert_user_measurements(NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION convert_user_measurements(NUMERIC) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION convert_user_weights(TEXT, NUMERIC, INTEGER, TEXT, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION convert_user_weights(TEXT, NUMERIC, INTEGER, TEXT, BIGINT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION replace_session_exercise(INTEGER, INTEGER, JSONB, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION replace_session_exercise(INTEGER, INTEGER, JSONB, BOOLEAN) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION update_session_exercise_with_routine(INTEGER, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_session_exercise_with_routine(INTEGER, JSONB) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION duplicate_routine_day(INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION duplicate_routine_day(INTEGER, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION get_all_feedback() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_all_feedback() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION get_all_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION recalculate_exercise_prs(INTEGER, TIMESTAMPTZ, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION recalculate_exercise_prs(INTEGER, TIMESTAMPTZ, BIGINT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION reorder_routine_days(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reorder_routine_days(JSONB) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION reorder_routine_exercises(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reorder_routine_exercises(JSONB) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION reorder_session_exercises(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reorder_session_exercises(JSONB) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION start_workout_session(INTEGER, TEXT, TEXT, JSONB, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION start_workout_session(INTEGER, TEXT, TEXT, JSONB, BIGINT) TO authenticated, service_role;

-- 2. `is_admin` keeps its grants: the RLS policies of `user_settings` and `user_feedback` call it
-- with no `TO` clause, so they also run for anon, and without EXECUTE those queries would answer
-- 42501 instead of an empty result. What changes is that it answers only for the caller. It used to
-- answer for any uuid, so anyone could ask whether a given user id is an admin. Every caller passes
-- `auth.uid()`, so none of them changes behaviour.
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_settings
        WHERE user_id = check_user_id
        AND user_id = auth.uid()
        AND key = 'is_admin'
        AND value = 'true'
    );
$$;

COMMENT ON FUNCTION is_admin(UUID) IS 'TRUE only when check_user_id is the caller and the caller is an admin. Any other uuid answers FALSE, never NULL: this runs for anon too (inside RLS policies), so it must not tell who is an admin. Callers pass auth.uid().';

-- 3. Functions created from now on: executable by their owner and by explicit grants only.
-- Global form: removes PostgreSQL's built-in EXECUTE for PUBLIC on functions `postgres` creates, in
-- every schema, plus any global grant production may have to the API roles. A per-schema form
-- cannot do this: it only undoes a per-schema grant. No migration creates functions outside
-- `public`, nor schemas or extensions, so the global scope is safe.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
-- Per-schema form: removes production's presumed grant in `public`. No-op locally.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, service_role;
-- On purpose: a migration that creates a function and forgets its GRANT now fails with 42501 for
-- every logged-in user, in production too (the old default used to hide it). `db:dump` only dumps
-- `public`, so neither schema.sql nor the drift check sees the global default above:
-- `npm run db:check-grants -w apps/web` (run in CI) is what catches both.
