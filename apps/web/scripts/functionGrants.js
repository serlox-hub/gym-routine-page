// Rules of `npm run db:check-grants`. Pure, so they are tested without a database; the query that
// feeds them lives in checkFunctionGrants.js.

// Functions `anon` may execute. Add one only if it is a helper called inside RLS policies: a policy
// without a `TO` clause also runs for anon, and without EXECUTE its query answers 42501 instead of
// an empty result. Such a helper must answer nothing useful to someone without a session.
const ANON_ALLOWED = new Set(['is_admin'])

// Functions `authenticated` may NOT execute. Add one only if no API role should call it (an
// internal helper called from other functions).
const INTERNAL_ONLY = new Set()

/**
 * @param {object} state
 * @param {{ name: string, signature: string, anon: boolean, authenticated: boolean }[] | null} state.functions
 *   Non-trigger functions in `public`.
 * @param {string[] | null} state.defaultGrantees Grantees of the global default privileges for
 *   functions created by `postgres` ('PUBLIC' for PUBLIC), or null when that row does not exist.
 * @returns {string[]} One message per violation; empty when everything holds.
 */
export function findGrantViolations({ functions, defaultGrantees }) {
  const violations = []

  for (const fn of functions ?? []) {
    if (fn.anon && !ANON_ALLOWED.has(fn.name)) {
      violations.push(
        `anon can execute ${fn.signature}. End its migration with ` +
        '`REVOKE EXECUTE ... FROM PUBLIC, anon`, or add it to ANON_ALLOWED if it is a helper used inside RLS policies.'
      )
    }
    if (!fn.authenticated && !INTERNAL_ONLY.has(fn.name)) {
      violations.push(
        `authenticated cannot execute ${fn.signature}: every logged-in call answers 42501. End its migration with ` +
        '`GRANT EXECUTE ... TO authenticated, service_role`, or add it to INTERNAL_ONLY if no API role should call it.'
      )
    }
  }

  if (defaultGrantees == null) {
    violations.push(
      'Missing the global default privileges for functions created by postgres, so every new function is ' +
      'executable by PUBLIC (anon included). Migration 066 creates it: ' +
      '`ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, ...`.'
    )
  } else {
    const others = defaultGrantees.filter((grantee) => grantee !== 'postgres')
    if (others.length > 0) {
      violations.push(
        `The global default privileges for functions created by postgres grant EXECUTE to ${others.join(', ')}: ` +
        'every new function would be executable by them without an explicit GRANT.'
      )
    }
  }

  return violations
}
