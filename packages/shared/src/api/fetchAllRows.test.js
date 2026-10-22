import { describe, it, expect, vi } from 'vitest'
import { fetchAllRows } from './fetchAllRows.js'

const rowsOf = (count, offset = 0) => Array.from({ length: count }, (_, i) => ({ id: offset + i }))

/**
 * A query over `table` that answers `.range(from, to)` like PostgREST: the slice, cut at
 * `serverCap` rows. `pages` (optional) replaces the table with fixed answers per call.
 */
function makeQuery(table, { serverCap = Infinity, pages = null } = {}) {
  const range = vi.fn((from, to) => {
    if (pages) return Promise.resolve(pages[range.mock.calls.length - 1] ?? { data: [], error: null })
    const size = Math.min(to - from + 1, serverCap)
    return Promise.resolve({ data: table.slice(from, from + size), error: null })
  })
  return { buildQuery: vi.fn(() => ({ range })), range }
}

describe('fetchAllRows', () => {
  it('returns an empty list after one empty page', async () => {
    const { buildQuery, range } = makeQuery([])

    await expect(fetchAllRows(buildQuery, 100)).resolves.toEqual([])
    expect(range).toHaveBeenCalledTimes(1)
    expect(range).toHaveBeenCalledWith(0, 99)
  })

  it('a short page is not taken as the last one: it asks again from where it stopped', async () => {
    const { buildQuery, range } = makeQuery(rowsOf(40))

    await expect(fetchAllRows(buildQuery, 100)).resolves.toEqual(rowsOf(40))
    expect(range.mock.calls).toEqual([[0, 99], [40, 139]])
  })

  it('a page of exactly pageSize asks for another one', async () => {
    const { buildQuery, range } = makeQuery(rowsOf(100))

    await expect(fetchAllRows(buildQuery, 100)).resolves.toEqual(rowsOf(100))
    expect(range.mock.calls).toEqual([[0, 99], [100, 199]])
  })

  it('returns 2500 rows across pages of the default size, in order', async () => {
    const { buildQuery, range } = makeQuery(rowsOf(2500))

    const rows = await fetchAllRows(buildQuery)
    expect(rows).toEqual(rowsOf(2500))
    expect(range.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999], [2500, 3499]])
  })

  it('a server cap below pageSize still returns every row', async () => {
    const { buildQuery, range } = makeQuery(rowsOf(1200), { serverCap: 500 })

    const rows = await fetchAllRows(buildQuery, 1000)
    expect(rows).toEqual(rowsOf(1200))
    expect(range.mock.calls.map(([from]) => from)).toEqual([0, 500, 1000, 1200])
  })

  it('builds a fresh query for every page', async () => {
    const { buildQuery } = makeQuery(rowsOf(3))

    await fetchAllRows(buildQuery, 2)
    expect(buildQuery).toHaveBeenCalledTimes(3)
  })

  it('keeps one copy of a row repeated across pages (a row saved mid-fetch shifts them)', async () => {
    const { buildQuery } = makeQuery(null, {
      pages: [
        { data: [{ id: 'a' }, { id: 'b' }], error: null },
        { data: [{ id: 'b' }, { id: 'c' }], error: null },
      ],
    })

    await expect(fetchAllRows(buildQuery, 2)).resolves.toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
  })

  it('throws the error of page 2 instead of returning page 1', async () => {
    const error = new Error('page 2 failed')
    const { buildQuery } = makeQuery(null, {
      pages: [
        { data: rowsOf(2), error: null },
        { data: null, error },
      ],
    })

    await expect(fetchAllRows(buildQuery, 2)).rejects.toBe(error)
  })

  it('treats a null data page as the end', async () => {
    const { buildQuery } = makeQuery(null, { pages: [{ data: rowsOf(1), error: null }, { data: null, error: null }] })

    await expect(fetchAllRows(buildQuery, 1)).resolves.toEqual(rowsOf(1))
  })

  describe('rows without id', () => {
    it.each([
      ['missing', { name: 'no id' }],
      ['null', { id: null, name: 'null id' }],
    ])('throws when a row has its id %s, instead of dropping it as a repeat', async (_label, badRow) => {
      const { buildQuery } = makeQuery(null, {
        pages: [{ data: [{ id: 'a' }, badRow], error: null }],
      })

      await expect(fetchAllRows(buildQuery, 2)).rejects.toThrow(/id/)
    })

    it('throws when the row without id arrives on a later page', async () => {
      const { buildQuery } = makeQuery(null, {
        pages: [
          { data: [{ id: 'a' }, { id: 'b' }], error: null },
          { data: [{ id: 'c' }, { name: 'no id' }], error: null },
        ],
      })

      await expect(fetchAllRows(buildQuery, 2)).rejects.toThrow(/id/)
    })

    it('accepts an id of 0 and an empty string: only null and undefined are absent', async () => {
      const rows = [{ id: 0 }, { id: '' }, { id: 1 }]
      const { buildQuery } = makeQuery(rows)

      await expect(fetchAllRows(buildQuery, 10)).resolves.toEqual(rows)
    })
  })

  describe('a server that keeps answering with rows already seen', () => {
    // A range that ignores its arguments. It fails after `maxCalls` so that a loop that never
    // ends shows up as a failed test, not as a hung run.
    function makeStuckQuery(answers, maxCalls = 10) {
      let calls = 0
      const range = vi.fn(() => {
        calls += 1
        if (calls > maxCalls) throw new Error('fetchAllRows kept asking for pages without end')
        return Promise.resolve({ data: answers[Math.min(calls - 1, answers.length - 1)], error: null })
      })
      return { buildQuery: vi.fn(() => ({ range })), range }
    }

    it('ends when the server ignores .range() and returns the same page every time', async () => {
      const { buildQuery, range } = makeStuckQuery([rowsOf(3)])

      await expect(fetchAllRows(buildQuery, 3)).resolves.toEqual(rowsOf(3))
      expect(range).toHaveBeenCalledTimes(2)
    })

    it('ends on the first page made only of repeats, keeping what earlier pages added', async () => {
      const { buildQuery, range } = makeStuckQuery([rowsOf(2), rowsOf(2, 2), rowsOf(2, 2)])

      await expect(fetchAllRows(buildQuery, 2)).resolves.toEqual(rowsOf(4))
      expect(range).toHaveBeenCalledTimes(3)
    })

    it('does not end on a page that mixes repeats with a new row', async () => {
      const { buildQuery, range } = makeStuckQuery([
        [{ id: 'a' }, { id: 'b' }],
        [{ id: 'b' }, { id: 'c' }],
        [],
      ])

      await expect(fetchAllRows(buildQuery, 2)).resolves.toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
      expect(range).toHaveBeenCalledTimes(3)
    })
  })
})
