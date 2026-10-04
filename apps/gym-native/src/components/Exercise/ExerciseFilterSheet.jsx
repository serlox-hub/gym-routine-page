import { View, Text, Pressable, ScrollView, Modal as RNModal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { getEquipmentName, countSheetFilters, getFilterSheetDoneLabel } from '@gym/shared'
import { colors, design } from '../../lib/styles'
import { Button, Switch } from '../ui'
import FilterChip from './FilterChip'

const SHEET_CONTENT_MAX_HEIGHT = 400
const SHEET_BOTTOM_PADDING = 16

/**
 * The filters that do not fit on screen: equipment and "only my exercises". The muscle group is
 * not here, it has its own row. The button at the bottom closes it and says how many exercises
 * the search and filters show (`resultCount`, null while the catalog loads).
 */
export default function ExerciseFilterSheet({
  isOpen, onClose,
  equipmentTypes, selectedEquipmentType, onEquipmentTypeChange,
  sourceFilter, onSourceFilterChange,
  resultCount,
}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const hasSheetFilters = countSheetFilters({ equipmentTypeId: selectedEquipmentType, sourceFilter }) > 0

  // Only the sheet's own filters: the muscle group stays as it is.
  const handleReset = () => {
    onEquipmentTypeChange?.(null)
    onSourceFilterChange?.('all')
  }

  return (
    <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end" style={{ backgroundColor: colors.overlaySoft }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface-block rounded-t-2xl px-4 pt-2"
          style={{ paddingBottom: insets.bottom + SHEET_BOTTOM_PADDING }}
        >
          <View className="flex-row items-center justify-between mb-2" style={{ minHeight: design.minTouchTarget }}>
            <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
              {t('common:buttons.filter')}
            </Text>
            {hasSheetFilters && (
              <Pressable
                onPress={handleReset}
                accessibilityRole="button"
                className="px-2 -mr-2 justify-center"
                style={{ height: design.minTouchTarget }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.success }}>
                  {t('common:buttons.reset')}
                </Text>
              </Pressable>
            )}
          </View>

          <ScrollView style={{ maxHeight: SHEET_CONTENT_MAX_HEIGHT }}>
            {equipmentTypes && onEquipmentTypeChange && (
              <View className="mb-2">
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: 8 }}>
                  {t('exercise:filterEquipment')}
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  <FilterChip
                    label={t('common:labels.all')}
                    isSelected={!selectedEquipmentType}
                    onPress={() => onEquipmentTypeChange(null)}
                  />
                  {equipmentTypes.map(equipment => (
                    <FilterChip
                      key={equipment.id}
                      label={getEquipmentName(equipment)}
                      isSelected={selectedEquipmentType === equipment.id}
                      onPress={() => onEquipmentTypeChange(equipment.id)}
                    />
                  ))}
                </View>
              </View>
            )}

            {onSourceFilterChange && (
              <View className="flex-row items-center justify-between gap-3">
                <Text style={{ fontSize: 14, color: colors.textPrimary }}>{t('exercise:onlyMine')}</Text>
                <Switch
                  checked={sourceFilter === 'custom'}
                  onChange={checked => onSourceFilterChange(checked ? 'custom' : 'all')}
                  accessibilityLabel={t('exercise:onlyMine')}
                />
              </View>
            )}
          </ScrollView>

          <View className="mt-4">
            <Button onPress={onClose}>{getFilterSheetDoneLabel(resultCount)}</Button>
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  )
}
