/**
 * Sanitiza un string para usarlo como nombre de archivo
 * Reemplaza caracteres no alfanuméricos por guiones bajos
 */
export function sanitizeFilename(name) {
  if (!name) return 'file'
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
}

/**
 * Normaliza texto para búsquedas: minúsculas y sin tildes
 */
export function normalizeSearchText(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}


// ============================================
// EXERCISE SEARCH
// ============================================

// Dropped from the query (unless nothing else is left) but kept in the searched
// texts, so a query of just "de" still finds the names with a word starting with "de".
const SEARCH_STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'con', 'en', 'a', 'al', 'y',
  'the', 'of', 'with', 'on', 'an', 'and', 'in',
])

// Algolia's defaults: one typo from 4 letters, two from 8.
const ONE_TYPO_MIN_LENGTH = 4
const TWO_TYPOS_MIN_LENGTH = 8

// The picker searches the same catalog texts on every keystroke, so each text is
// tokenized once. The cap only bounds memory: the catalog in both languages is
// well under it.
const TOKENIZED_TEXTS_CAP = 5000
const tokenizedTexts = new Map()

function tokenizeCached(text) {
  const key = text ?? ''
  let tokenized = tokenizedTexts.get(key)
  if (!tokenized) {
    if (tokenizedTexts.size >= TOKENIZED_TEXTS_CAP) tokenizedTexts.clear()
    tokenized = tokenizeWithPositions(key)
    tokenizedTexts.set(key, tokenized)
  }
  return tokenized
}

/**
 * Words of a text with their place in it. `start`/`end` index the plain words
 * (`stopAt` has one entry per plain word), so the joined form of a hyphenated
 * word spans all its parts.
 */
function tokenizeWithPositions(text) {
  const tokens = []
  const stopAt = []
  // Letters of any script, not just a-z: custom exercise names are free text.
  // Marks (\p{M}) too, or a Hindi or Thai word splits at each vowel sign.
  for (const chunk of normalizeSearchText(text).split(/[^\p{L}\p{M}\p{N}-]+/u)) {
    const parts = chunk.split('-').filter(Boolean)
    const start = stopAt.length
    for (const part of parts) {
      tokens.push({ word: part, start: stopAt.length, end: stopAt.length })
      stopAt.push(SEARCH_STOPWORDS.has(part))
    }
    if (parts.length > 1) tokens.push({ word: parts.join(''), start, end: stopAt.length - 1 })
  }
  return { tokens, stopAt }
}

/**
 * Normalized words of a text: normalizeSearchText, split on anything that is not
 * a letter or digit, plus the joined form of each hyphenated word, so
 * "Push-Ups" gives push, ups and pushups ("pushup" and "push up" both find it).
 */
export function tokenizeSearchText(text) {
  return tokenizeWithPositions(text).tokens.map(token => token.word)
}

/**
 * Query words: the plain words of tokenizeSearchText minus stopwords (es + en),
 * unless that leaves none. Never the joined form of a hyphenated word: every
 * query word is required, and "step-up" must still find "Step up con barra",
 * which has no "stepup".
 */
export function tokenizeSearchQuery(query) {
  const words = tokenizeWithPositions(query).tokens
    .filter(token => token.start === token.end)
    .map(token => token.word)
  const meaningful = words.filter(word => !SEARCH_STOPWORDS.has(word))
  return meaningful.length > 0 ? meaningful : words
}

/** Max edits allowed for a query word of this length: 0 (<4), 1 (4-7), 2 (>=8). */
export function getAllowedTypos(wordLength) {
  if (wordLength >= TWO_TYPOS_MIN_LENGTH) return 2
  if (wordLength >= ONE_TYPO_MIN_LENGTH) return 1
  return 0
}

/**
 * How `queryWord` matches the start of `textWord`, or null if it needs more than
 * getAllowedTypos(queryWord.length) typos. `typos` is 0 for an exact prefix;
 * `whole` says whether the match takes the whole text word ("biseps" takes all
 * of "biceps", "pres" only the start of "press"). Matching a prefix with typos,
 * not the whole word, is what lets it work while the user is still typing
 * ("bisep" matches "biceps" with one). Both already normalized.
 *
 * @param {boolean} [allowTypos] - false only takes exact prefixes
 * @returns {{ typos: number, whole: boolean } | null}
 */
export function matchWordPrefix(queryWord, textWord, allowTypos = true) {
  if (textWord.startsWith(queryWord)) {
    return { typos: 0, whole: textWord.length === queryWord.length }
  }
  const budget = allowTypos ? getAllowedTypos(queryWord.length) : 0
  if (budget === 0) return null
  // Only prefixes within ±budget letters of the query word can be within budget.
  const shortestPrefix = queryWord.length - budget
  const longestPrefix = Math.min(textWord.length, queryWord.length + budget)
  if (longestPrefix < shortestPrefix) return null

  // Edit distance (optimal string alignment: an adjacent swap is one edit) from
  // the query word to every prefix of the text word at once. Row i holds the
  // distances for the query word's first i letters, column j for the first j
  // letters of the text word.
  let rowBeforePrevious = null
  let previousRow = Array.from({ length: longestPrefix + 1 }, (_, j) => j)
  for (let i = 1; i <= queryWord.length; i++) {
    const row = [i]
    let rowMin = i
    for (let j = 1; j <= longestPrefix; j++) {
      const substitution = queryWord[i - 1] === textWord[j - 1] ? 0 : 1
      let distance = Math.min(previousRow[j] + 1, row[j - 1] + 1, previousRow[j - 1] + substitution)
      const swapped = i > 1 && j > 1
        && queryWord[i - 1] === textWord[j - 2] && queryWord[i - 2] === textWord[j - 1]
      if (swapped) distance = Math.min(distance, rowBeforePrevious[j - 2] + 1)
      row.push(distance)
      if (distance < rowMin) rowMin = distance
    }
    // A row's minimum never goes down in the rows below it: the budget is already spent.
    if (rowMin > budget) return null
    rowBeforePrevious = previousRow
    previousRow = row
  }

  const typos = Math.min(...previousRow.slice(shortestPrefix))
  if (typos > budget) return null
  return { typos, whole: longestPrefix === textWord.length && previousRow[longestPrefix] === typos }
}

// Which of two matches of the same query word counts: fewest typos, then the
// name over the other texts, then a whole word over a prefix, then the earliest.
function isBetterMatch(candidate, best) {
  if (!best) return true
  if (candidate.typos !== best.typos) return candidate.typos < best.typos
  if (candidate.inName !== best.inName) return candidate.inName
  if (candidate.whole !== best.whole) return candidate.whole
  return candidate.start < best.start
}

function findBestMatch(queryWord, fields, allowTypos) {
  let best = null
  for (const { tokens, inName } of fields) {
    for (const { word, start, end } of tokens) {
      const match = matchWordPrefix(queryWord, word, allowTypos)
      if (!match) continue
      const candidate = { ...match, inName, start, end }
      if (isBetterMatch(candidate, best)) best = candidate
    }
  }
  return best
}

// The name matches follow the query order with nothing but stopwords between
// them: in "Press de banca", `press banca` is a phrase and `banca press` is not.
function isNamePhrase(nameMatches, stopAt) {
  if (nameMatches.length === 0) return false
  for (let k = 1; k < nameMatches.length; k++) {
    const { end } = nameMatches[k - 1]
    const { start } = nameMatches[k]
    if (start <= end) return false
    for (let index = end + 1; index < start; index++) {
      if (!stopAt[index]) return false
    }
  }
  return true
}

/**
 * Rank of one item against the query, or null if some query word matches no
 * word of any text. Each query word, in any order, takes its best match across
 * all the texts (see isBetterMatch): with `remo mancuernas`, "Remo con
 * mancuerna" matches `mancuernas` with no typo through its equipment.
 *
 * @param {{ name: string, muscleGroup?: string, secondary?: string[] }} texts -
 *        name, muscle group and other lower-weight texts (equipment)
 * @param {string[]} queryWords - from tokenizeSearchQuery, at least one
 * @param {{ allowTypos?: boolean }} [options] - allowTypos false only takes exact
 *        prefixes: cheaper, and the same rank for every item that matches with no typo
 * @returns {{ typos: number, muscleGroupWords: number, nameWords: number,
 *   wholeWords: number, startsWithFirst: boolean, phrase: boolean, nameLength: number } | null}
 *   `muscleGroupWords` counts the query words that are the whole muscle group
 *   name, with no more typos than their best match (`peho` is Pecho).
 */
export function getSearchRank(texts, queryWords, { allowTypos = true } = {}) {
  const name = tokenizeCached(texts.name)
  const muscleGroup = tokenizeCached(texts.muscleGroup)
  const fields = [
    { tokens: name.tokens, inName: true },
    { tokens: muscleGroup.tokens, inName: false },
    ...(texts.secondary ?? []).map(text => ({ tokens: tokenizeCached(text).tokens, inName: false })),
  ]

  const matches = []
  for (const queryWord of queryWords) {
    const match = findBestMatch(queryWord, fields, allowTypos)
    if (!match) return null
    matches.push(match)
  }

  const muscleGroupWord = muscleGroup.stopAt.length === 1 ? muscleGroup.tokens[0].word : null
  const isWholeMuscleGroup = (queryWord, index) => {
    const match = muscleGroupWord && matchWordPrefix(queryWord, muscleGroupWord, allowTypos)
    return Boolean(match?.whole) && match.typos === matches[index].typos
  }
  const nameMatches = matches.filter(match => match.inName)

  return {
    typos: matches.reduce((total, match) => total + match.typos, 0),
    muscleGroupWords: queryWords.filter(isWholeMuscleGroup).length,
    nameWords: nameMatches.length,
    wholeWords: matches.filter(match => match.whole).length,
    startsWithFirst: matches[0].inName && matches[0].start === 0,
    phrase: isNamePhrase(nameMatches, name.stopAt),
    nameLength: name.stopAt.length,
  }
}

/**
 * Comparator for two non-null ranks of getSearchRank: negative if `a` ranks
 * before `b`, 0 on a full tie. First difference wins: fewer typos, more whole
 * muscle group words, more name words, more whole words, name starting with the
 * first query word, name phrase, shorter name.
 */
export function compareSearchRanks(a, b) {
  return (a.typos - b.typos)
    || (b.muscleGroupWords - a.muscleGroupWords)
    || (b.nameWords - a.nameWords)
    || (b.wholeWords - a.wholeWords)
    || (Number(b.startsWithFirst) - Number(a.startsWithFirst))
    || (Number(b.phrase) - Number(a.phrase))
    || (a.nameLength - b.nameLength)
}
