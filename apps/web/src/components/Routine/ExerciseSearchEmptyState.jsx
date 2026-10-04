import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles.js'
import { Button } from '../ui/index.js'

/**
 * Empty exercise list. When the filters are what hides the results (`onClearFilters` given), it
 * says so and offers to clear them; otherwise the plain "not found".
 */
function ExerciseSearchEmptyState({ onClearFilters }) {
  const { t } = useTranslation()

  if (!onClearFilters) {
    return (
      <p className="text-center py-4" style={{ color: colors.textSecondary }}>
        {t('common:errors.notFound')}
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-center" style={{ color: colors.textSecondary }}>
        {t('exercise:noResultsWithFilters')}
      </p>
      <Button variant="secondary" className="min-h-11" onClick={onClearFilters}>{t('exercise:clearFilters')}</Button>
    </div>
  )
}

export default ExerciseSearchEmptyState
