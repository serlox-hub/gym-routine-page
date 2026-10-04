import { describe, it, expect, afterEach } from 'vitest'
import {
  getMuscleGroupFilterSections,
  getEquipmentFilterSections,
  hasActiveExerciseFilters,
  shouldOfferClearFilters,
} from './exerciseFilters.js'
import { initI18n } from '../i18n/index.js'

initI18n()

const CHEST = 1
const LEGS = 2
const BARBELL = 10
const TRX = 30

const CATALOG = [
  { id: 1, name: 'Press banca', muscle_group_id: CHEST, is_system: true, equipment_type: { id: BARBELL } },
  { id: 2, name: 'Press inclinado', muscle_group_id: CHEST, is_system: false, equipment_type: { id: BARBELL } },
  { id: 3, name: 'Sentadilla', muscle_group_id: LEGS, is_system: true, equipment_type: { id: BARBELL } },
  { id: 4, name: 'Remo TRX', muscle_group_id: LEGS, is_system: true, equipment_type: { id: TRX } },
]

describe('getMuscleGroupFilterSections', () => {
  afterEach(() => initI18n({ lng: 'es' }))

  const group = (id, name, nameEn, category) => ({ id, name, name_en: nameEn, category })
  const GROUPS = [
    group(1, 'Pecho', 'Chest', 'Superior'),
    group(2, 'Cuádriceps', 'Quadriceps', 'Inferior'),
    group(3, 'Abdominales', 'Abs', 'Abdominales'),
    group(4, 'Bíceps', 'Biceps', 'Superior'),
    group(5, 'Cardio', 'Cardio', null),
    group(6, 'Glúteos', 'Glutes', 'Inferior'),
  ]
  const shape = sections => sections.map(s => [s.key, s.options.map(o => o.label)])

  it('splits upper, lower and the rest, each sorted by name', () => {
    expect(shape(getMuscleGroupFilterSections(GROUPS))).toEqual([
      ['upper', ['Bíceps', 'Pecho']],
      ['lower', ['Cuádriceps', 'Glúteos']],
      ['other', ['Abdominales', 'Cardio']],
    ])
  })

  it('sorts by the name in the current language', () => {
    initI18n({ lng: 'en' })
    expect(shape(getMuscleGroupFilterSections(GROUPS))[0]).toEqual(['upper', ['Biceps', 'Chest']])
  })

  it('carries the id and the row with each option', () => {
    const [upper] = getMuscleGroupFilterSections(GROUPS)
    expect(upper.options[0]).toEqual({ id: 4, label: 'Bíceps', item: GROUPS[3] })
  })

  it('leaves empty sections out', () => {
    expect(shape(getMuscleGroupFilterSections([GROUPS[0]]))).toEqual([['upper', ['Pecho']]])
  })

  it('puts an unknown category with the rest', () => {
    expect(shape(getMuscleGroupFilterSections([group(9, 'Cuello', 'Neck', 'Otra')]))).toEqual([['other', ['Cuello']]])
  })

  it('is empty without groups', () => {
    expect(getMuscleGroupFilterSections(null)).toEqual([])
    expect(getMuscleGroupFilterSections([])).toEqual([])
  })
})

describe('getEquipmentFilterSections', () => {
  afterEach(() => initI18n({ lng: 'es' }))

  const EQUIPMENT = [
    { id: 1, name: 'Polea', name_en: 'Cable' },
    { id: 2, name: 'Barra', name_en: 'Barbell' },
    { id: 3, name: 'Mancuernas', name_en: 'Dumbbell' },
  ]

  it('is one section sorted by name', () => {
    const [section] = getEquipmentFilterSections(EQUIPMENT)
    expect(section.key).toBe('all')
    expect(section.options.map(o => o.label)).toEqual(['Barra', 'Mancuernas', 'Polea'])
  })

  it('sorts by the name in the current language', () => {
    initI18n({ lng: 'en' })
    expect(getEquipmentFilterSections(EQUIPMENT)[0].options.map(o => o.label)).toEqual(['Barbell', 'Cable', 'Dumbbell'])
  })

  it('does not reorder the array it gets', () => {
    getEquipmentFilterSections(EQUIPMENT)
    expect(EQUIPMENT.map(e => e.id)).toEqual([1, 2, 3])
  })

  it('is empty without equipment', () => {
    expect(getEquipmentFilterSections(undefined)).toEqual([])
    expect(getEquipmentFilterSections([])).toEqual([])
  })
})

describe('hasActiveExerciseFilters', () => {
  it('is false with no filter', () => {
    expect(hasActiveExerciseFilters({ muscleGroupId: null, equipmentTypeId: null, sourceFilter: 'all' })).toBe(false)
  })

  it('is false with nothing passed', () => {
    expect(hasActiveExerciseFilters()).toBe(false)
  })

  it('is true with the muscle group alone', () => {
    expect(hasActiveExerciseFilters({ muscleGroupId: CHEST, equipmentTypeId: null, sourceFilter: 'all' })).toBe(true)
  })

  it('is true with the equipment alone', () => {
    expect(hasActiveExerciseFilters({ muscleGroupId: null, equipmentTypeId: BARBELL, sourceFilter: 'all' })).toBe(true)
  })

  it('is true with only mine alone', () => {
    expect(hasActiveExerciseFilters({ muscleGroupId: null, equipmentTypeId: null, sourceFilter: 'custom' })).toBe(true)
  })

  it('is true with "system"', () => {
    expect(hasActiveExerciseFilters({ muscleGroupId: null, equipmentTypeId: null, sourceFilter: 'system' })).toBe(true)
  })

  it('is true with all three combined', () => {
    expect(hasActiveExerciseFilters({ muscleGroupId: CHEST, equipmentTypeId: BARBELL, sourceFilter: 'custom' })).toBe(true)
  })
})

describe('shouldOfferClearFilters', () => {
  const noFilters = { search: '', muscleGroupId: null, equipmentTypeId: null, sourceFilter: 'all' }

  it('is true when the filters are what empties the list', () => {
    expect(shouldOfferClearFilters(CATALOG, { ...noFilters, muscleGroupId: CHEST, equipmentTypeId: TRX })).toBe(true)
  })

  it('is true when the filters empty a list the search alone would fill', () => {
    const filters = { ...noFilters, search: 'sentadilla', muscleGroupId: CHEST }
    expect(shouldOfferClearFilters(CATALOG, filters)).toBe(true)
  })

  it('is false when the search finds nothing even without filters', () => {
    expect(shouldOfferClearFilters(CATALOG, { ...noFilters, search: 'xyzq', muscleGroupId: CHEST })).toBe(false)
  })

  it('is false with no filter active', () => {
    expect(shouldOfferClearFilters(CATALOG, { ...noFilters, search: 'xyzq' })).toBe(false)
  })

  it('is false when the filtered list is not empty', () => {
    expect(shouldOfferClearFilters(CATALOG, { ...noFilters, muscleGroupId: CHEST })).toBe(false)
  })

  it('is false while the catalog is not loaded', () => {
    expect(shouldOfferClearFilters(undefined, { ...noFilters, muscleGroupId: CHEST })).toBe(false)
    expect(shouldOfferClearFilters([], { ...noFilters, muscleGroupId: CHEST })).toBe(false)
  })

  it('treats only mine as a filter', () => {
    const systemOnly = CATALOG.filter(e => e.is_system)
    expect(shouldOfferClearFilters(systemOnly, { ...noFilters, sourceFilter: 'custom' })).toBe(true)
  })
})
