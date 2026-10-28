import { describe, it, expect, beforeAll } from 'vitest'
import path from 'node:path'
import { SetField, MAX_TRACKED_FIELDS, normalizeTrackedFields } from '../../../packages/shared/src/lib/measurementFields.js'
import { getPRMetrics, getTrackableMetrics } from '../../../packages/shared/src/lib/sessionStatsCalculation.js'
import { calculateEpley1RM } from '../../../packages/shared/src/lib/workoutCalculations.js'
import { queryLocalDatabase } from './localDatabase.js'

// `npm run db:check-pr-parity`: the SQL twins of the PR rule must answer like the JS.
//   - `pr_metrics` (issue #196), which decides what recalculate_exercise_prs judges after an edit,
//     like `getPRMetrics`, which decides what the end of a session judges.
//   - `epley_1rm` (issue #194), which rebuilds best_1rm after a weight unit conversion, like
//     `calculateEpley1RM`, which gives the 1RM of a new set. One unit apart and a repeated set is a
//     1RM PR. And `stores_best_1rm`, which exercises it rebuilds, like getTrackableMetrics: one it
//     skips keeps its best_1rm in the old unit.
// Vitest and not plain node because sessionStatsCalculation.js pulls the i18n JSON, which bare Node
// refuses to import without import attributes. Its own config keeps it out of the unit run: it needs
// the local database.
const appDir = path.resolve(import.meta.dirname, '..')

function combinations(items, maxSize) {
  const result = []
  const pick = (start, picked) => {
    if (picked.length > 0) result.push(picked)
    if (picked.length === maxSize) return
    for (let i = start; i < items.length; i++) pick(i + 1, [...picked, items[i]])
  }
  pick(0, [])
  return result
}

// Every list an exercise can store, plus the dirty inputs normalizeTrackedFields cleans up.
const INPUTS = [
  ...combinations(Object.values(SetField), MAX_TRACKED_FIELDS),
  null,
  [],
  [null],
  [SetField.WEIGHT, null],
  [SetField.TIME, SetField.TIME],
]

// The input as SQL, also the test name: '{weight,reps}', '{weight,NULL}', NULL.
const toSql = (fields) => fields == null
  ? 'NULL'
  : `'{${fields.map(field => field ?? 'NULL').join(',')}}'`

const CASES = INPUTS.map((fields, index) => ({
  index,
  sql: toSql(fields),
  jsMetrics: [...getPRMetrics(normalizeTrackedFields(fields))].sort(),
}))

const QUERY = `
SELECT json_agg(pr_metrics(input) ORDER BY n) AS metrics
FROM (VALUES ${CASES.map(({ index, sql }) => `(${index}, ${sql}::measurement_field[])`).join(', ')}) AS inputs(n, input)
`

describe('pr_metrics (SQL) answers like getPRMetrics (JS)', () => {
  let sqlMetrics

  beforeAll(() => {
    const [row] = queryLocalDatabase(appDir, QUERY)
    sqlMetrics = row.metrics
  })

  for (const { index, sql, jsMetrics } of CASES) {
    it(`pr_metrics(${sql})`, () => {
      expect(
        [...sqlMetrics[index]].sort(),
        'Received is SQL pr_metrics, expected is JS getPRMetrics(normalizeTrackedFields(fields)). Change both together.'
      ).toEqual(jsMetrics)
    })
  }
})

const STORES_BEST_1RM_QUERY = `
SELECT json_agg(stores_best_1rm(input) ORDER BY n) AS stores
FROM (VALUES ${CASES.map(({ index, sql }) => `(${index}, ${sql}::measurement_field[])`).join(', ')}) AS inputs(n, input)
`

describe('stores_best_1rm (SQL) answers like getTrackableMetrics (JS)', () => {
  let sqlStores

  beforeAll(() => {
    const [row] = queryLocalDatabase(appDir, STORES_BEST_1RM_QUERY)
    sqlStores = row.stores
  })

  INPUTS.forEach((fields, index) => {
    it(`stores_best_1rm(${CASES[index].sql})`, () => {
      expect(
        sqlStores[index],
        'Received is SQL stores_best_1rm, expected is JS getTrackableMetrics(fields).includes(\'1rm\'). Change both together.'
      ).toBe(getTrackableMetrics(fields).includes('1rm'))
    })
  })
})

// Every weight from 0.01 to 1000.00 in steps of 0.01, times every rep count from 1 to 60: 6 million
// sets, all of them, no sampling. Both sides run the same float8 operations, so they can only differ
// where they round, and rounding does not depend on the magnitude: heavier sets take the same path.
const MAX_CENTS = 100_000
const MAX_REPS = 60

// Only the sets whose 1RM differs from the same rep count one cent lighter (weight 0 gives NULL, so
// the first cent always does): the run starts, about 2.5 MB of output instead of 6 million values.
// '1:0,94:1,...' reads "from 0.01 the 1RM is 0, from 0.94 it is 1".
const EPLEY_QUERY = `
SELECT reps, string_agg(cents || ':' || e1rm, ',' ORDER BY cents) AS runs
FROM (
    SELECT reps, cents,
        epley_1rm(cents * 0.01, reps) AS e1rm,
        epley_1rm((cents - 1) * 0.01, reps) AS lighter
    FROM generate_series(1, ${MAX_REPS}) AS reps, generate_series(1, ${MAX_CENTS}) AS cents
) AS grid
WHERE e1rm IS DISTINCT FROM lighter
GROUP BY reps
ORDER BY reps
`

// The grid as one SQL value per cent, from the run starts.
function expandRuns(runs) {
  const values = new Array(MAX_CENTS + 1)
  const starts = runs.split(',').map(run => run.split(':').map(Number))
  starts.forEach(([cents, value], index) => {
    const end = index + 1 < starts.length ? starts[index + 1][0] : MAX_CENTS + 1
    values.fill(value, cents, end)
  })
  return values
}

const MISMATCHES_SHOWN = 5

// The sets whose product lands within 1e-9 of a half, where a wrong rounding answers otherwise:
// round() of float8 on an exact half (half to even), round() of numeric just below one (its float8
// cast keeps 15 digits, 182.49999999999997 becomes 182.5). Found in the grid, so the grid holds them;
// listed apart so a change to the grid that loses them fails here. The product is the one
// calculateEpley1RM rounds. Reps 1 is left out: its weight is not rounded.
function findNearHalves() {
  const nearHalves = []
  for (let reps = 2; reps <= MAX_REPS; reps++) {
    for (let cents = 1; cents <= MAX_CENTS; cents++) {
      const product = (cents / 100) * (1 + reps / 30)
      const offset = product - Math.floor(product) - 0.5
      if (Math.abs(offset) <= 1e-9) nearHalves.push({ cents, reps, offset })
    }
  }
  return nearHalves
}

describe('epley_1rm (SQL) answers like calculateEpley1RM (JS)', () => {
  const sqlByReps = {}

  beforeAll(() => {
    for (const { reps, runs } of queryLocalDatabase(appDir, EPLEY_QUERY)) {
      sqlByReps[reps] = expandRuns(runs)
    }
  }, 120_000)

  const mismatch = (cents, reps) => {
    const sql = sqlByReps[reps]?.[cents]
    const js = calculateEpley1RM(cents / 100, reps)
    return sql === js ? null : { weight: cents / 100, reps, sql, js }
  }

  for (let reps = 1; reps <= MAX_REPS; reps++) {
    it(`every weight from 0.01 to 1000.00 at ${reps} reps`, () => {
      const mismatches = []
      for (let cents = 1; cents <= MAX_CENTS; cents++) {
        const found = mismatch(cents, reps)
        if (found) mismatches.push(found)
      }
      expect(
        mismatches.slice(0, MISMATCHES_SHOWN),
        `${mismatches.length} sets where SQL epley_1rm differs from JS calculateEpley1RM. Change both together.`
      ).toEqual([])
    })
  }

  it('the sets within 1e-9 of a half, exact halves and just below one among them', () => {
    const nearHalves = findNearHalves()
    expect(nearHalves.some(({ offset }) => offset === 0), 'the grid holds no exact half').toBe(true)
    expect(nearHalves.some(({ offset }) => offset < 0), 'the grid holds no product just below a half').toBe(true)

    const mismatches = nearHalves.map(({ cents, reps }) => mismatch(cents, reps)).filter(Boolean)
    expect(
      mismatches.slice(0, MISMATCHES_SHOWN),
      `${mismatches.length} of ${nearHalves.length} near halves where SQL epley_1rm rounds unlike Math.round.`
    ).toEqual([])
  })
})
