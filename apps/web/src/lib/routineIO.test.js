import { describe, it, expect } from 'vitest'
import { readJsonFile } from './routineIO.js'

const jsonFile = (text, name = 'routine.json') => new File([text], name, { type: 'application/json' })

describe('readJsonFile', () => {
  it('resolves the parsed routine from a valid export file', async () => {
    const data = { version: 10, routine: { name: 'Pierna A', days: [] } }

    await expect(readJsonFile(jsonFile(JSON.stringify(data)))).resolves.toEqual(data)
  })

  it('accepts a file whose structural quotes are curly', async () => {
    // The quotes iOS Smart Punctuation produces (issue 162).
    const text = '{ “version”: 10, “routine”: { “name”: “Pierna A”, “days”: [] } }'

    const data = await readJsonFile(jsonFile(text))

    expect(data.routine.name).toBe('Pierna A')
  })

  // ImportFileView no longer checks routine.name itself: this is the only place that rejects it.
  it('rejects a JSON file without routine.name', async () => {
    await expect(readJsonFile(jsonFile('{"version": 10}'))).rejects.toThrow('Error al leer el archivo JSON')
    await expect(readJsonFile(jsonFile('{"routine": {"days": []}}'))).rejects.toThrow('Error al leer el archivo JSON')
  })

  it('rejects a file that is not JSON', async () => {
    await expect(readJsonFile(jsonFile('Pierna A: sentadilla 3x8', 'notes.txt'))).rejects.toThrow('Error al leer el archivo JSON')
  })

  it('rejects an empty file', async () => {
    await expect(readJsonFile(jsonFile(''))).rejects.toThrow('Error al leer el archivo JSON')
  })
})
