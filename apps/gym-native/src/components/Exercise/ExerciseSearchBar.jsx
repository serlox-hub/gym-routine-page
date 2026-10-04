import { useState } from 'react'
import { View, Text, TextInput, Pressable, Keyboard } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react-native'
import { colors, design, inputStyle } from '../../lib/styles'
import { getEquipmentName, countSheetFilters } from '@gym/shared'
import MuscleGroupFilterRow from './MuscleGroupFilterRow'
import ExerciseFilterSheet from './ExerciseFilterSheet'
import ActiveFilterChip from './ActiveFilterChip'

const ACTIVE_CHIP_GAP = 6

export default function ExerciseSearchBar({
  search, onSearchChange,
  muscleGroups, selectedMuscleGroup, onMuscleGroupChange,
  equipmentTypes, selectedEquipmentType, onEquipmentTypeChange,
  sourceFilter, onSourceFilterChange,
  resultCount,
  autoFocus = false,
}) {
  const { t } = useTranslation()
  const [showFilters, setShowFilters] = useState(false)

  const selectedEquipment = equipmentTypes?.find(e => e.id === selectedEquipmentType)
  // The muscle group is not counted: its row already shows it.
  const sheetFilterCount = countSheetFilters({ equipmentTypeId: selectedEquipmentType, sourceFilter })

  // The search keyboard would cover the sheet's bottom, where its button is.
  const handleOpenFilters = () => {
    Keyboard.dismiss()
    setShowFilters(true)
  }

  return (
    <View className="mb-2">
      <View className="flex-row items-center gap-2">
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={t('exercise:searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoFocus={autoFocus}
          className="flex-1"
          style={[inputStyle, { height: design.minTouchTarget, paddingHorizontal: 12, paddingVertical: 0, fontSize: 14 }]}
        />
        <Pressable
          onPress={handleOpenFilters}
          accessibilityRole="button"
          accessibilityLabel={t('common:buttons.filter')}
          className="rounded-lg items-center justify-center"
          style={{
            width: design.minTouchTarget,
            height: design.minTouchTarget,
            backgroundColor: sheetFilterCount > 0 ? colors.successBgSubtle : colors.bgTertiary,
            borderWidth: 1,
            borderColor: sheetFilterCount > 0 ? colors.success : colors.border,
          }}
        >
          <SlidersHorizontal size={16} color={sheetFilterCount > 0 ? colors.success : colors.textSecondary} />
          {sheetFilterCount > 0 && (
            <View
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.success }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.bgPrimary }}>{sheetFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <MuscleGroupFilterRow
        muscleGroups={muscleGroups}
        selectedMuscleGroup={selectedMuscleGroup}
        onMuscleGroupChange={onMuscleGroupChange}
      />

      {sheetFilterCount > 0 && (
        <View className="flex-row flex-wrap items-center" style={{ columnGap: ACTIVE_CHIP_GAP }}>
          {selectedEquipment && (
            <ActiveFilterChip
              label={getEquipmentName(selectedEquipment)}
              onClear={() => onEquipmentTypeChange(null)}
            />
          )}
          {sourceFilter === 'custom' && (
            <ActiveFilterChip
              label={t('exercise:onlyMine')}
              onClear={() => onSourceFilterChange('all')}
            />
          )}
        </View>
      )}

      <ExerciseFilterSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        equipmentTypes={equipmentTypes}
        selectedEquipmentType={selectedEquipmentType}
        onEquipmentTypeChange={onEquipmentTypeChange}
        sourceFilter={sourceFilter}
        onSourceFilterChange={onSourceFilterChange}
        resultCount={resultCount}
      />
    </View>
  )
}
