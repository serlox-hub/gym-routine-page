/**
 * Filters of the exercise picker. The muscle group lives in a row always on
 * screen; equipment and "only my exercises" live in a sheet behind a button.
 * Filter values are the ones filterExercises takes.
 */

import { filterExercises } from './arrayUtils.js'
import { t } from '../i18n/index.js'

const isSourceFiltered = sourceFilter => Boolean(sourceFilter) && sourceFilter !== 'all'

/**
 * How many filters the sheet holds that are active (equipment, only mine).
 * Muscle group excluded: its row already shows it.
 *
 * @param {Object} filters
 * @param {number|null} [filters.equipmentTypeId]
 * @param {'all'|'custom'|'system'} [filters.sourceFilter]
 * @returns {number} 0 to 2
 */
export function countSheetFilters({ equipmentTypeId, sourceFilter } = {}) {
  return (equipmentTypeId ? 1 : 0) + (isSourceFiltered(sourceFilter) ? 1 : 0)
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
  return Boolean(muscleGroupId) || countSheetFilters({ equipmentTypeId, sourceFilter }) > 0
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

/**
 * Label of the button that closes the filter sheet: how many exercises the
 * current search and filters show.
 *
 * @param {number|null} resultCount - null while the catalog is loading
 * @returns {string} "Ver 23 ejercicios", "Sin resultados" for 0, "Hecho" while loading
 */
export function getFilterSheetDoneLabel(resultCount) {
  if (resultCount == null) return t('common:buttons.done')
  if (resultCount === 0) return t('exercise:noResults')
  return t('exercise:showResults', { count: resultCount })
}
