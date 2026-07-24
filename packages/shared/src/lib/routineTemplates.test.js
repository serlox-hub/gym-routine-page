import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { ROUTINE_TEMPLATES, getTemplateDisplay, getTemplateImportData } from './routineTemplates.js'
import { GOAL_VALUES } from './routineWizardOptions.js'
import { BLOCK_NAMES } from './constants.js'
import esRoutine from '../i18n/locales/es/routine.json'
import enRoutine from '../i18n/locales/en/routine.json'

// El catálogo del sistema vive en la raíz del repo (fuera del paquete): es la fuente contra la
// que importRoutine matchea por name_es. Se lee con fs (no import) para no depender del fs.allow
// de Vite al estar fuera del workspace. Este test bloquea cualquier deriva plantilla↔catálogo.
const catalogPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../seed/exercise_catalog.json')
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
const catalogArr = Array.isArray(catalog) ? catalog : (catalog.exercises || catalog.data || [])
const CATALOG_NAMES = new Set(catalogArr.map(e => e.name_es))
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced']
const VALID_GOALS = Object.values(GOAL_VALUES)

// fake t: devuelve la clave (o clave:count para plurales) — permite verificar el cableado sin i18n real
const fakeT = (key, opts) => (opts && opts.count != null ? `${key}:${opts.count}` : key)

function usedExerciseNames(template) {
  const names = new Set()
  for (const day of template.data.routine.days)
    for (const block of day.blocks)
      for (const ex of block.exercises) names.add(ex.exercise_name)
  return names
}

describe('ROUTINE_TEMPLATES ⊆ catálogo (acoplamiento)', () => {
  it('el catálogo se carga y tiene ejercicios', () => {
    expect(CATALOG_NAMES.size).toBeGreaterThan(200)
  })

  it('todo exercise_name de cada plantilla existe en el catálogo por name_es', () => {
    const offenders = []
    for (const tpl of ROUTINE_TEMPLATES)
      for (const name of usedExerciseNames(tpl))
        if (!CATALOG_NAMES.has(name)) offenders.push(`${tpl.id}: "${name}"`)
    expect(offenders).toEqual([])
  })

  it('data.exercises cubre exactamente los ejercicios usados en los días', () => {
    for (const tpl of ROUTINE_TEMPLATES) {
      const declared = new Set(tpl.data.exercises.map(e => e.name_es))
      const used = usedExerciseNames(tpl)
      expect([...used].filter(n => !declared.has(n))).toEqual([]) // usados sin declarar
      expect([...declared].filter(n => !used.has(n))).toEqual([]) // declarados sin usar
    }
  })
})

describe('ROUTINE_TEMPLATES estructura y metadata', () => {
  it('ids únicos', () => {
    const ids = ROUTINE_TEMPLATES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('metadata coherente: goal/level/equipment válidos y daysPerWeek === nº de días', () => {
    for (const tpl of ROUTINE_TEMPLATES) {
      expect(VALID_GOALS).toContain(tpl.goal)
      expect(VALID_LEVELS).toContain(tpl.level)
      expect(['full', 'bodyweight', 'dumbbell']).toContain(tpl.equipment)
      expect(tpl.daysPerWeek).toBe(tpl.data.routine.days.length)
      expect(tpl.data.version).toBe(5)
    }
  })

  it('cada día tiene un bloque principal con al menos un ejercicio', () => {
    for (const tpl of ROUTINE_TEMPLATES)
      for (const day of tpl.data.routine.days) {
        const main = day.blocks.find(b => b.name === BLOCK_NAMES.MAIN)
        expect(main).toBeTruthy()
        expect(main.exercises.length).toBeGreaterThan(0)
      }
  })
})

describe('i18n de plantillas', () => {
  it('cada plantilla tiene name y description en es y en', () => {
    for (const tpl of ROUTINE_TEMPLATES) {
      for (const loc of [esRoutine, enRoutine]) {
        expect(loc.templates?.items?.[tpl.id]?.name, `${tpl.id} name`).toBeTruthy()
        expect(loc.templates?.items?.[tpl.id]?.description, `${tpl.id} description`).toBeTruthy()
      }
    }
  })

  it('las claves de tag de objetivo y bodyweight existen en es y en', () => {
    for (const loc of [esRoutine, enRoutine]) {
      expect(loc.templates?.goalTags?.hypertrophy).toBeTruthy()
      expect(loc.templates?.goalTags?.strength).toBeTruthy()
      expect(loc.templates?.goalTags?.general).toBeTruthy()
      expect(loc.templates?.tagBodyweight).toBeTruthy()
    }
  })
})

describe('getTemplateDisplay / getTemplateImportData', () => {
  it('getTemplateDisplay devuelve name, description y tags (goal + días)', () => {
    const tpl = ROUTINE_TEMPLATES.find(t => t.id === 'ppl')
    const { name, description, tags } = getTemplateDisplay(tpl, fakeT)
    expect(name).toBe('routine:templates.items.ppl.name')
    expect(description).toBe('routine:templates.items.ppl.description')
    expect(tags).toContain('common:home.nDays:6')
    expect(tags.length).toBeGreaterThanOrEqual(2)
  })

  it('la plantilla de peso corporal añade el tag de bodyweight', () => {
    const tpl = ROUTINE_TEMPLATES.find(t => t.id === 'home-bodyweight')
    const { tags } = getTemplateDisplay(tpl, fakeT)
    expect(tags).toContain('routine:templates.tagBodyweight')
  })

  it('getTemplateImportData localiza el nombre/descr. de la rutina y conserva días', () => {
    const tpl = ROUTINE_TEMPLATES.find(t => t.id === 'full-body')
    const data = getTemplateImportData(tpl, fakeT)
    expect(data.routine.name).toBe('routine:templates.items.full-body.name')
    expect(data.routine.description).toBe('routine:templates.items.full-body.description')
    expect(data.routine.days).toHaveLength(3)
    expect(data.exercises.length).toBeGreaterThan(0)
  })
})
