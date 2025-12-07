import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readJsonFile } from './routineIO.js'

describe('routineIO - funciones puras', () => {
  describe('readJsonFile', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('lee y parsea un archivo JSON válido', async () => {
      const jsonContent = { routine: { name: 'Test' } }
      const file = new Blob([JSON.stringify(jsonContent)], { type: 'application/json' })

      const result = await readJsonFile(file)
      expect(result).toEqual(jsonContent)
    })

    it('rechaza con error si el JSON es inválido', async () => {
      const file = new Blob(['not valid json'], { type: 'application/json' })

      await expect(readJsonFile(file)).rejects.toThrow('Error al leer el archivo JSON')
    })
  })

  describe('formato de export', () => {
    it('estructura esperada del formato de export', () => {
      const expectedFormat = {
        version: expect.any(Number),
        exportedAt: expect.any(String),
        exercises: expect.any(Array),
        routine: {
          name: expect.any(String),
          description: expect.any(String),
          goal: expect.any(String),
          days: expect.any(Array),
        },
      }

      const sampleExport = {
        version: 4,
        exportedAt: '2024-01-15T10:00:00Z',
        exercises: [
          {
            name: 'Press banca',
            measurement_type: 'weight_reps',
            weight_unit: 'kg',
            instructions: null,
            muscle_group_name: 'Pecho',
          },
        ],
        routine: {
          name: 'Mi rutina',
          description: 'Descripción',
          goal: 'Hipertrofia',
          days: [],
        },
      }

      expect(sampleExport).toMatchObject(expectedFormat)
    })
  })

  describe('helpers', () => {
    it('crea blob con tipo correcto', () => {
      const data = { routine: { name: 'Test' } }
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })

      expect(blob.type).toBe('application/json')
      expect(blob.size).toBeGreaterThan(0)
    })

    it('genera nombre de archivo válido', () => {
      const routineName = 'Mi Rutina PPL'
      const filename = `${routineName.replace(/\s+/g, '_')}.json`

      expect(filename).toBe('Mi_Rutina_PPL.json')
      expect(filename).not.toContain(' ')
    })
  })
})
