/**
 * Filters of the exercise picker: muscle group and equipment, each a button
 * that opens the full list of options, and an "only my exercises" toggle.
 * Filter values are the ones filterExercises takes.
 */

import { filterExercises } from './arrayUtils.js'
import { getMuscleGroupName, getEquipmentName } from './exerciseUtils.js'
import { getCurrentLocale } from '../i18n/index.js'

const isSourceFiltered = sourceFilter => Boolean(sourceFilter) && sourceFilter !== 'all'

// muscle_groups.category is a Spanish identifier ('Superior', 'Inferior', 'Abdominales')
// and is null for Cardio, Movilidad and Cuerpo Completo. Anything not mapped goes to 'other'.
const MUSCLE_SECTION_BY_CATEGORY = { Superior: 'upper', Inferior: 'lower' }
const MUSCLE_SECTION_ORDER = ['upper', 'lower', 'other']

const byLocalizedName = getName => (a, b) => getName(a).localeCompare(getName(b), getCurrentLocale())

const toOption = getName => item => ({ id: item.id, label: getName(item), item })

/**
 * Muscle groups as the filter's list shows them: upper body, lower body, then
 * core and the rest, each sorted by the name in the current language. Empty
 * sections are left out.
 *
 * @param {Array|null} muscleGroups - Rows with id, name, name_en, category
 * @returns {Array<{ key: 'upper'|'lower'|'other', options: Array<{ id, label, item }> }>}
 */
export function getMuscleGroupFilterSections(muscleGroups) {
  if (!muscleGroups?.length) return []
  const bySection = new Map(MUSCLE_SECTION_ORDER.map(key => [key, []]))
  for (const group of muscleGroups) {
    bySection.get(MUSCLE_SECTION_BY_CATEGORY[group.category] ?? 'other').push(group)
  }
  return MUSCLE_SECTION_ORDER
    .map(key => ({
      key,
      options: bySection.get(key).sort(byLocalizedName(getMuscleGroupName)).map(toOption(getMuscleGroupName)),
    }))
    .filter(section => section.options.length > 0)
}

/**
 * Equipment types as the filter's list shows them: one section, sorted by the
 * name in the current language (the query sorts by the Spanish name).
 *
 * @param {Array|null} equipmentTypes - Rows with id, name, name_en
 * @returns {Array<{ key: 'all', options: Array<{ id, label, item }> }>}
 */
export function getEquipmentFilterSections(equipmentTypes) {
  if (!equipmentTypes?.length) return []
  const options = [...equipmentTypes].sort(byLocalizedName(getEquipmentName)).map(toOption(getEquipmentName))
  return [{ key: 'all', options }]
}

/**
 * Whether any filter (muscle group, equipment, only mine) is active.
 *
 * @param {Object} filters
 * @param {number|null} [filters.muscleGroupId]
 * @param {number|null} [filters.equipmentTypeId]
 * @param {'all'|'custom'|'system'} [filters.sourceFilter]
 * @returns {boolean}
 */
export function hasActiveExerciseFilters({ muscleGroupId, equipmentTypeId, sourceFilter } = {}) {
  return Boolean(muscleGroupId) || Boolean(equipmentTypeId) || isSourceFiltered(sourceFilter)
}

/**
 * Whether to offer "Clear filters": the filtered list is empty, some filter is
 * active, and the same search without filters finds something, so the filters
 * really are what hides the results.
 *
 * @param {Array|null} exercises - Full catalog
 * @param {Object} filters - Same options as filterExercises, search included
 * @returns {boolean}
 */
export function shouldOfferClearFilters(exercises, filters = {}) {
  if (!hasActiveExerciseFilters(filters)) return false
  if (filterExercises(exercises, filters).length > 0) return false
  const withoutFilters = { ...filters, muscleGroupId: null, equipmentTypeId: null, sourceFilter: 'all' }
  return filterExercises(exercises, withoutFilters).length > 0
}
