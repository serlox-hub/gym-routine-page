// PostgREST cuts every response at its `max_rows` (1000 in the local config.toml; production's
// value is not in the repo) without saying so. A query that must see every row pages until the
// server has nothing left, whatever that cap is.
const DEFAULT_PAGE_SIZE = 1000

/**
 * Every row of a query, requested page by page.
 *
 * `from` advances by the rows actually received, not by `pageSize`: with a server cap below
 * `pageSize` a short page is not the last one. An empty page ends the loop, and so does a page
 * of only repeats (a server that ignores the range would otherwise be asked forever). Rows are
 * deduped by `id`, because a row saved mid-fetch shifts the later pages by one and repeats a row.
 *
 * @param {() => object} buildQuery - Returns a fresh, ordered Supabase query (no `.range()`)
 *   that selects `id`. The order must be total (end on a unique key), or pages can skip or
 *   repeat rows.
 * @param {number} [pageSize]
 * @returns {Promise<Array<{ id: unknown }>>} Throws the Supabase error of any page, and throws
 *   if a row has no `id`.
 */
export async function fetchAllRows(buildQuery, pageSize = DEFAULT_PAGE_SIZE) {
  const rows = []
  const seenIds = new Set()
  let from = 0

  for (;;) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) return rows

    const rowsBefore = rows.length
    for (const row of data) {
      // Without `id` every row would look like a repeat of the first one and be dropped silently.
      if (row.id == null) throw new Error('fetchAllRows: the select must include `id`, pages are deduped by it')
      if (seenIds.has(row.id)) continue
      seenIds.add(row.id)
      rows.push(row)
    }
    if (rows.length === rowsBefore) return rows
    from += data.length
  }
}
