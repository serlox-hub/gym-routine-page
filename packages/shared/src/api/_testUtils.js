import { vi } from 'vitest'

// ============================================
// SHARED SUPABASE MOCK HELPERS
// ============================================

/**
 * Creates a chainable Supabase query mock.
 *
 * Strategy:
 * - All chainable methods return `chain` so they can be chained indefinitely.
 * - The chain object itself is a thenable (has `.then`), so awaiting it directly
 *   resolves with `resolveWith`. This handles functions that end at .eq(), .order(),
 *   .not(), .limit(), .range(), etc. without calling .single().
 * - .single() and .maybeSingle() explicitly resolve with `resolveWith`.
 */
export function makeQueryMock(resolveWith) {
  const resolvedPromise = Promise.resolve(resolveWith)

  const chain = {
    // Chainable methods — all return chain
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    // Explicit terminal methods
    single: vi.fn().mockResolvedValue(resolveWith),
    maybeSingle: vi.fn().mockResolvedValue(resolveWith),
    // Thenable: makes `await chain` resolve without calling .single()
    then: resolvedPromise.then.bind(resolvedPromise),
    catch: resolvedPromise.catch.bind(resolvedPromise),
    finally: resolvedPromise.finally.bind(resolvedPromise),
  }

  return chain
}

/**
 * Creates a Supabase client mock with per-table response discrimination.
 * `tableResponses` is a map of `table -> { data, error }`.
 * Tables not listed default to `{ data: null, error: null }`.
 *
 * Also provides an `rpc` mock that resolves to `{ data: null, error: null }` by
 * default (override after calling this function if needed).
 */
export function makeClientMock(tableResponses = {}) {
  return {
    from: vi.fn((table) => {
      const response = tableResponses[table] ?? { data: null, error: null }
      return makeQueryMock(response)
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}
