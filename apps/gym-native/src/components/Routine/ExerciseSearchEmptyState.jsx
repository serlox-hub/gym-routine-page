import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui'

/**
 * Empty exercise list. When the filters are what hides the results (`onClearFilters` given), it
 * says so and offers to clear them; otherwise the plain "not found".
 */
export default function ExerciseSearchEmptyState({ onClearFilters }) {
  const { t } = useTranslation()

  if (!onClearFilters) {
    return <Text className="text-secondary text-center py-4">{t('common:errors.notFound')}</Text>
  }

  return (
    <View className="items-center gap-3 py-4">
      <Text className="text-secondary text-center">{t('exercise:noResultsWithFilters')}</Text>
      <Button variant="secondary" onPress={onClearFilters}>{t('exercise:clearFilters')}</Button>
    </View>
  )
}
