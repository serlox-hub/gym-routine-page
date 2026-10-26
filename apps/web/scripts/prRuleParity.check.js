import { describe, it, expect, beforeAll } from 'vitest'
import path from 'node:path'
import { SetField, MAX_TRACKED_FIELDS, normalizeTrackedFields } from '../../../packages/shared/src/lib/measurementFields.js'
import { getPRMetrics } from '../../../packages/shared/src/lib/sessionStatsCalculation.js'
import { queryLocalDatabase } from './localDatabase.js'

// `npm run db:check-pr-parity` (issue #196): the SQL `pr_metrics`, which decides what
// recalculate_exercise_prs judges after an edit, must answer like `getPRMetrics`, which decides what
// the end of a session judges. Vitest and not plain node because sessionStatsCalculation.js pulls the
// i18n JSON, which bare Node refuses to import without import attributes. Its own config keeps it out
// of the unit run: it needs the local database.
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
