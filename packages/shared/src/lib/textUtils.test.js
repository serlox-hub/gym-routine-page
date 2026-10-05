import { describe, it, expect } from 'vitest'
import {
  sanitizeFilename,
  normalizeSearchText,
  tokenizeSearchText,
  tokenizeSearchQuery,
  getAllowedTypos,
  matchWordPrefix,
  getSearchRank,
  compareSearchRanks,
} from './textUtils.js'

describe('sanitizeFilename', () => {
  it('reemplaza espacios por guiones bajos', () => {
    expect(sanitizeFilename('mi rutina')).toBe('mi_rutina')
  })

  it('reemplaza caracteres especiales', () => {
    expect(sanitizeFilename('Rutina #1 (nueva)')).toBe('rutina__1__nueva_')
  })

  it('convierte a minúsculas', () => {
    expect(sanitizeFilename('MAYUSCULAS')).toBe('mayusculas')
  })

  it('mantiene números', () => {
    expect(sanitizeFilename('rutina123')).toBe('rutina123')
  })

  it('maneja acentos y ñ', () => {
    expect(sanitizeFilename('Día señal')).toBe('d_a_se_al')
  })

  it('devuelve "file" para valores vacíos', () => {
    expect(sanitizeFilename('')).toBe('file')
    expect(sanitizeFilename(null)).toBe('file')
    expect(sanitizeFilename(undefined)).toBe('file')
  })
})

describe('normalizeSearchText', () => {
  it('convierte a minúsculas', () => {
    expect(normalizeSearchText('PRESS BANCA')).toBe('press banca')
  })

  it('elimina tildes', () => {
    expect(normalizeSearchText('Extensión')).toBe('extension')
    expect(normalizeSearchText('Glúteo')).toBe('gluteo')
    expect(normalizeSearchText('Bíceps')).toBe('biceps')
  })

  it('maneja combinación de mayúsculas y tildes', () => {
    expect(normalizeSearchText('EXTENSIÓN DE TRÍCEPS')).toBe('extension de triceps')
  })

  it('normaliza ñ a n', () => {
    expect(normalizeSearchText('Señal')).toBe('senal')
    expect(normalizeSearchText('Niño')).toBe('nino')
  })

  it('devuelve string vacío para valores nulos', () => {
    expect(normalizeSearchText('')).toBe('')
    expect(normalizeSearchText(null)).toBe('')
    expect(normalizeSearchText(undefined)).toBe('')
  })
})

describe('tokenizeSearchText', () => {
  it('normalizes and splits on anything that is not a letter or digit', () => {
    expect(tokenizeSearchText('Curl de Bíceps (barra) 90/90')).toEqual(['curl', 'de', 'biceps', 'barra', '90', '90'])
  })

  it('adds the joined form of a hyphenated word after its parts', () => {
    expect(tokenizeSearchText('Push-Ups')).toEqual(['push', 'ups', 'pushups'])
    expect(tokenizeSearchText('T-Bar Row')).toEqual(['t', 'bar', 'tbar', 'row'])
    expect(tokenizeSearchText('step-by-step')).toEqual(['step', 'by', 'step', 'stepbystep'])
  })

  it('does not join words separated by other punctuation', () => {
    expect(tokenizeSearchText('press/banca')).toEqual(['press', 'banca'])
  })

  it('keeps letters outside a-z, so a name in another script has words', () => {
    expect(tokenizeSearchText('Жим гантелей')).toEqual(['жим', 'гантелеи'])
    expect(tokenizeSearchText('Łydki')).toEqual(['łydki'])
    expect(tokenizeSearchText('व्यायाम')).toEqual(['व्यायाम'])
  })

  it('ignores stray hyphens', () => {
    expect(tokenizeSearchText('- remo --')).toEqual(['remo'])
  })

  it('returns no words for empty or punctuation-only text', () => {
    expect(tokenizeSearchText('')).toEqual([])
    expect(tokenizeSearchText(null)).toEqual([])
    expect(tokenizeSearchText(undefined)).toEqual([])
    expect(tokenizeSearchText(' -/() ')).toEqual([])
  })
})

describe('tokenizeSearchQuery', () => {
  it('drops Spanish and English stopwords', () => {
    expect(tokenizeSearchQuery('press de la banca')).toEqual(['press', 'banca'])
    expect(tokenizeSearchQuery('curl with the bar')).toEqual(['curl', 'bar'])
  })

  it('keeps the stopwords when they are the only words', () => {
    expect(tokenizeSearchQuery('de')).toEqual(['de'])
    expect(tokenizeSearchQuery('De la')).toEqual(['de', 'la'])
  })

  it('takes the parts of a hyphenated word, not its joined form', () => {
    expect(tokenizeSearchQuery('step-up')).toEqual(['step', 'up'])
    expect(tokenizeSearchQuery('push-ups')).toEqual(['push', 'ups'])
  })

  it('keeps letters outside a-z, like the texts it is matched against', () => {
    expect(tokenizeSearchQuery('Жим Łydki')).toEqual(['жим', 'łydki'])
  })

  it('returns no words for an empty query', () => {
    expect(tokenizeSearchQuery('')).toEqual([])
    expect(tokenizeSearchQuery('   ')).toEqual([])
    expect(tokenizeSearchQuery(null)).toEqual([])
  })
})

describe('getAllowedTypos', () => {
  it('allows none below 4 letters, one from 4 to 7, two from 8', () => {
    expect(getAllowedTypos(0)).toBe(0)
    expect(getAllowedTypos(3)).toBe(0)
    expect(getAllowedTypos(4)).toBe(1)
    expect(getAllowedTypos(7)).toBe(1)
    expect(getAllowedTypos(8)).toBe(2)
    expect(getAllowedTypos(15)).toBe(2)
  })
})

describe('matchWordPrefix', () => {
  it('returns 0 typos for an exact prefix or the whole word', () => {
    expect(matchWordPrefix('pres', 'press')).toMatchObject({ typos: 0 })
    expect(matchWordPrefix('press', 'press')).toMatchObject({ typos: 0 })
    expect(matchWordPrefix('p', 'press')).toMatchObject({ typos: 0 })
  })

  it('allows no typo in a 3-letter word', () => {
    expect(matchWordPrefix('prs', 'press')).toBeNull()
    expect(matchWordPrefix('bac', 'banca')).toBeNull()
  })

  it('allows one typo from 4 letters, matching a prefix of the text word', () => {
    expect(matchWordPrefix('pres', 'prensa')).toMatchObject({ typos: 1 })
    expect(matchWordPrefix('peho', 'pecho')).toMatchObject({ typos: 1 })
    expect(matchWordPrefix('bisep', 'biceps')).toMatchObject({ typos: 1 })
  })

  it('allows one typo but not two up to 7 letters', () => {
    expect(matchWordPrefix('pulover', 'pullover')).toMatchObject({ typos: 1 })
    expect(matchWordPrefix('pulobar', 'pullover')).toBeNull()
    expect(matchWordPrefix('prxx', 'press')).toBeNull()
  })

  it('allows two typos from 8 letters, but not three', () => {
    expect(matchWordPrefix('mancurna', 'mancuerna')).toMatchObject({ typos: 1 })
    expect(matchWordPrefix('mancurma', 'mancuerna')).toMatchObject({ typos: 2 })
    expect(matchWordPrefix('mamcurma', 'mancuerna')).toBeNull()
  })

  it('counts a swap of two adjacent letters as one typo', () => {
    expect(matchWordPrefix('bicpes', 'biceps')).toMatchObject({ typos: 1 })
    expect(matchWordPrefix('rmeo', 'remo')).toMatchObject({ typos: 1 })
  })

  it('matches a query word longer than the text word', () => {
    expect(matchWordPrefix('presss', 'press')).toMatchObject({ typos: 1 })
    expect(matchWordPrefix('presssss', 'press')).toBeNull()
  })

  it('returns null when the text word is empty and the query is not', () => {
    expect(matchWordPrefix('press', '')).toBeNull()
  })

  it('says whether the match takes the whole text word', () => {
    expect(matchWordPrefix('press', 'press')).toEqual({ typos: 0, whole: true })
    expect(matchWordPrefix('pres', 'press')).toEqual({ typos: 0, whole: false })
    expect(matchWordPrefix('biseps', 'biceps')).toEqual({ typos: 1, whole: true })
    expect(matchWordPrefix('bisep', 'biceps')).toEqual({ typos: 1, whole: false })
    expect(matchWordPrefix('mancurna', 'mancuernas')).toEqual({ typos: 1, whole: false })
  })

  it('takes only exact prefixes when typos are not allowed', () => {
    expect(matchWordPrefix('pres', 'press', false)).toEqual({ typos: 0, whole: false })
    expect(matchWordPrefix('biseps', 'biceps', false)).toBeNull()
  })
})

describe('getSearchRank', () => {
  const rank = (name, query, { muscleGroup = '', secondary = [] } = {}) =>
    getSearchRank({ name, muscleGroup, secondary }, tokenizeSearchQuery(query))

  it('returns null when some query word matches nothing', () => {
    expect(rank('Press de banca', 'press xyz')).toBeNull()
    expect(rank('Press de banca', 'xyz')).toBeNull()
  })

  it('matches the query words in any order', () => {
    expect(rank('Remo con mancuerna', 'mancuerna remo')).not.toBeNull()
    expect(rank('Press de banca', 'banca press')).not.toBeNull()
  })

  it('searches the muscle group and the secondary texts too', () => {
    const texts = { muscleGroup: 'Pecho', secondary: ['Polea'] }
    expect(rank('Aperturas', 'pecho', texts)).toMatchObject({ typos: 0, nameWords: 0 })
    expect(rank('Aperturas', 'polea', texts)).toMatchObject({ typos: 0, nameWords: 0 })
  })

  it('takes the best match of each word across fields: no typo through equipment beats one in the name', () => {
    const result = rank('Remo con mancuerna a una mano', 'remo mancuernas', {
      muscleGroup: 'Espalda',
      secondary: ['Mancuernas'],
    })
    expect(result).toMatchObject({ typos: 0, nameWords: 1 })
  })

  it('prefers the name over the other texts at equal typos', () => {
    const result = rank('Remo con mancuernas', 'mancuernas', { secondary: ['Mancuernas'] })
    expect(result).toMatchObject({ nameWords: 1, startsWithFirst: false, phrase: true })
  })

  it('adds up the typos of all words', () => {
    expect(rank('Curl de bíceps con barra', 'curl biseps')).toMatchObject({ typos: 1 })
    expect(rank('Curl de bíceps con barra', 'curll biseps')).toMatchObject({ typos: 2 })
  })

  it('counts the query words that are the whole muscle group, typos included', () => {
    expect(rank('Press de banca', 'pecho', { muscleGroup: 'Pecho' }).muscleGroupWords).toBe(1)
    expect(rank('Press de banca', 'peho', { muscleGroup: 'Pecho' }).muscleGroupWords).toBe(1)
    expect(rank('Press de banca', 'pech', { muscleGroup: 'Pecho' }).muscleGroupWords).toBe(0)
    expect(rank('Jalón al pecho', 'pecho', { muscleGroup: 'Espalda' }).muscleGroupWords).toBe(0)
  })

  it('counts the whole muscle group even when the word matched better in the name', () => {
    expect(rank('Cruce de pecho', 'pecho', { muscleGroup: 'Pecho' }).muscleGroupWords).toBe(1)
  })

  it('does not count a muscle group word matched with more typos than the best match', () => {
    // "pesa" is "peso" with one typo, but the name has it with none.
    expect(rank('Peso muerto', 'peso', { muscleGroup: 'Pesa' }).muscleGroupWords).toBe(0)
  })

  it('never counts a multi-word muscle group as equal to one query word', () => {
    expect(rank('Burpee', 'cuerpo', { muscleGroup: 'Cuerpo Completo' }).muscleGroupWords).toBe(0)
  })

  it('counts whole words apart from prefixes, typos included', () => {
    expect(rank('Press de banca', 'press banca').wholeWords).toBe(2)
    expect(rank('Press de banca', 'pres banc').wholeWords).toBe(0)
    expect(rank('Curl de bíceps', 'biseps').wholeWords).toBe(1)
  })

  it('tells whether the name starts with the first query word', () => {
    expect(rank('Press de banca', 'press banca').startsWithFirst).toBe(true)
    expect(rank('Press de banca', 'banca press').startsWithFirst).toBe(false)
    expect(rank('Aperturas', 'pecho', { muscleGroup: 'Pecho' }).startsWithFirst).toBe(false)
  })

  it('treats name words in query order with only stopwords between them as a phrase', () => {
    expect(rank('Press de banca', 'press banca').phrase).toBe(true)
    expect(rank('Press de banca', 'banca press').phrase).toBe(false)
    expect(rank('Press inclinado banca', 'press banca').phrase).toBe(false)
    expect(rank('Push-Ups con banda', 'pushups banda').phrase).toBe(true)
  })

  it('is not a phrase when no word matched in the name', () => {
    expect(rank('Aperturas', 'pecho', { muscleGroup: 'Pecho' }).phrase).toBe(false)
  })

  it('counts the plain words of the name, not the joined forms', () => {
    expect(rank('Push-Ups', 'push').nameLength).toBe(2)
    expect(rank('Press de banca', 'press').nameLength).toBe(3)
  })

  it('with allowTypos false only takes exact prefixes, and ranks those the same', () => {
    const texts = { name: 'Curl de bíceps con barra', muscleGroup: 'Bíceps', secondary: ['Barra'] }
    expect(getSearchRank(texts, ['biseps'], { allowTypos: false })).toBeNull()
    expect(getSearchRank(texts, ['biceps', 'barra'], { allowTypos: false }))
      .toEqual(getSearchRank(texts, ['biceps', 'barra']))
  })

  it('works without the optional texts', () => {
    expect(getSearchRank({ name: 'Press de banca' }, ['press'])).toMatchObject({ typos: 0, nameWords: 1 })
    expect(getSearchRank({ name: null }, ['press'])).toBeNull()
  })

  it('treats missing muscle group and secondary texts as empty, not as a crash', () => {
    const texts = { name: 'Press', muscleGroup: null, secondary: [null, undefined] }
    expect(getSearchRank(texts, ['press'])).toMatchObject({ typos: 0, nameWords: 1, muscleGroupWords: 0 })
    expect(getSearchRank(texts, ['remo'])).toBeNull()
  })

  it('ranks the same after the tokenized-text cache has been overflowed', () => {
    const texts = { name: 'Press de banca', muscleGroup: 'Pecho', secondary: ['Barra'] }
    const before = getSearchRank(texts, ['pecho', 'banca'])
    // Many more distinct texts than the cache holds: it is emptied when full.
    for (let i = 0; i < 12000; i++) getSearchRank({ name: `Ejercicio ${i}` }, ['ejercicio'])
    expect(getSearchRank(texts, ['pecho', 'banca'])).toEqual(before)
    expect(getSearchRank({ name: 'Ejercicio 7' }, ['7'])).toMatchObject({ typos: 0, nameWords: 1 })
  })
})

describe('compareSearchRanks', () => {
  const best = {
    typos: 0, muscleGroupWords: 1, nameWords: 2, wholeWords: 2,
    startsWithFirst: true, phrase: true, nameLength: 2,
  }
  const worst = {
    typos: 2, muscleGroupWords: 0, nameWords: 0, wholeWords: 0,
    startsWithFirst: false, phrase: false, nameLength: 6,
  }
  const criteria = Object.keys(best)

  it('returns 0 on a full tie', () => {
    expect(compareSearchRanks(best, { ...best })).toBe(0)
  })

  it.each(criteria)('%s decides over every criterion after it', (key) => {
    // Better on this criterion, tied before it, worse on everything after it.
    const after = criteria.slice(criteria.indexOf(key) + 1)
    const before = criteria.slice(0, criteria.indexOf(key))
    const tied = Object.fromEntries(before.map(k => [k, best[k]]))
    const better = { ...tied, [key]: best[key], ...Object.fromEntries(after.map(k => [k, worst[k]])) }
    const worse = { ...tied, [key]: worst[key], ...Object.fromEntries(after.map(k => [k, best[k]])) }
    expect(compareSearchRanks(better, worse)).toBeLessThan(0)
    expect(compareSearchRanks(worse, better)).toBeGreaterThan(0)
  })
})
