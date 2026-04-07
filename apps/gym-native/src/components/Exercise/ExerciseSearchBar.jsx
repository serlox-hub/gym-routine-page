import { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Modal as RNModal } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal, X } from 'lucide-react-native'
import { colors, inputStyle } from '../../lib/styles'
import { getMuscleGroupColor, getMuscleGroupName, getEquipmentName } from '@gym/shared'

export default function ExerciseSearchBar({
  search, onSearchChange,
  muscleGroups, selectedMuscleGroup, onMuscleGroupChange,
  equipmentTypes, selectedEquipmentType, onEquipmentTypeChange,
  sourceFilter, onSourceFilterChange,
  showUsage, onToggleUsage,
  autoFocus = false,
}) {
  const { t } = useTranslation()
  const [showFilters, setShowFilters] = useState(false)

  const selectedGroup = muscleGroups?.find(g => g.id === selectedMuscleGroup)
  const selectedEquipment = equipmentTypes?.find(e => e.id === selectedEquipmentType)
  const activeFilterCount = (selectedMuscleGroup ? 1 : 0) + (selectedEquipmentType ? 1 : 0) + (sourceFilter && sourceFilter !== 'all' ? 1 : 0)

  const handleClearAll = () => {
    onMuscleGroupChange?.(null)
    onEquipmentTypeChange?.(null)
    onSourceFilterChange?.('all')
  }

  return (
    <>
      <View className="flex-row items-center gap-2 mb-3">
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={t('exercise:searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoFocus={autoFocus}
          className="flex-1"
          style={[inputStyle, { paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 }]}
        />
        <Pressable
          onPress={() => setShowFilters(true)}
          className="p-2 rounded-lg"
          style={{
            backgroundColor: activeFilterCount > 0 ? colors.accentBgSubtle : colors.bgTertiary,
            borderWidth: 1,
            borderColor: activeFilterCount > 0 ? colors.accent : colors.border,
          }}
        >
          <SlidersHorizontal size={16} color={activeFilterCount > 0 ? colors.accent : colors.textSecondary} />
          {activeFilterCount > 0 && (
            <View
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.accent }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.white }}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <View className="flex-row flex-wrap gap-1.5 mb-3 -mt-1">
          {selectedGroup && (
            <ActiveChip
              label={getMuscleGroupName(selectedGroup)}
              dot={getMuscleGroupColor(selectedGroup.name)}
              onClear={() => onMuscleGroupChange(null)}
            />
          )}
          {selectedEquipment && (
            <ActiveChip
              label={getEquipmentName(selectedEquipment)}
              onClear={() => onEquipmentTypeChange(null)}
            />
          )}
          {sourceFilter && sourceFilter !== 'all' && (
            <ActiveChip
              label={sourceFilter === 'custom' ? t('exercise:custom') : t('exercise:system')}
              onClear={() => onSourceFilterChange('all')}
            />
          )}
        </View>
      )}

      {/* Filter panel */}
      <RNModal visible={showFilters} transparent animationType="fade" onRequestClose={() => setShowFilters(false)}>
        <Pressable onPress={() => setShowFilters(false)} className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-surface-block rounded-t-2xl pb-8">
            <View className="flex-row items-center justify-between p-4">
              <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                {t('common:buttons.filter')}
              </Text>
              {activeFilterCount > 0 && (
                <Pressable onPress={handleClearAll}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: colors.accent }}>
                    {t('common:buttons.reset')}
                  </Text>
                </Pressable>
              )}
            </View>

            <ScrollView className="px-4" style={{ maxHeight: 400 }}>
              {/* Muscle group */}
              <FilterSection label={t('exercise:filterMuscle')}>
                <View className="flex-row flex-wrap gap-1.5">
                  <ChipOption
                    label={t('common:labels.all')}
                    isSelected={!selectedMuscleGroup}
                    onPress={() => onMuscleGroupChange(null)}
                  />
                  {muscleGroups?.map(group => (
                    <ChipOption
                      key={group.id}
                      label={getMuscleGroupName(group)}
                      isSelected={selectedMuscleGroup === group.id}
                      dot={getMuscleGroupColor(group.name)}
                      onPress={() => onMuscleGroupChange(group.id)}
                    />
                  ))}
                </View>
              </FilterSection>

              {/* Equipment */}
              {equipmentTypes && onEquipmentTypeChange && (
                <FilterSection label={t('exercise:filterEquipment')}>
                  <View className="flex-row flex-wrap gap-1.5">
                    <ChipOption
                      label={t('common:labels.all')}
                      isSelected={!selectedEquipmentType}
                      onPress={() => onEquipmentTypeChange(null)}
                    />
                    {equipmentTypes?.map(eq => (
                      <ChipOption
                        key={eq.id}
                        label={getEquipmentName(eq)}
                        isSelected={selectedEquipmentType === eq.id}
                        onPress={() => onEquipmentTypeChange(eq.id)}
                      />
                    ))}
                  </View>
                </FilterSection>
              )}

              {/* Source */}
              {onSourceFilterChange && (
                <FilterSection label={t('exercise:filterSource')}>
                  <View className="flex-row flex-wrap gap-1.5">
                    {[
                      { value: 'all', label: t('common:labels.all') },
                      { value: 'system', label: t('exercise:system') },
                      { value: 'custom', label: t('exercise:custom') },
                    ].map(opt => (
                      <ChipOption
                        key={opt.value}
                        label={opt.label}
                        isSelected={sourceFilter === opt.value}
                        onPress={() => onSourceFilterChange(opt.value)}
                      />
                    ))}
                  </View>
                </FilterSection>
              )}

              {/* Show usage toggle */}
              {onToggleUsage && (
                <Pressable
                  onPress={() => onToggleUsage(!showUsage)}
                  className="flex-row items-center gap-2"
                >
                  <View
                    className="w-5 h-5 rounded items-center justify-center"
                    style={{
                      backgroundColor: showUsage ? colors.accent : 'transparent',
                      borderWidth: 1.5,
                      borderColor: showUsage ? colors.accent : colors.textSecondary,
                    }}
                  >
                    {showUsage && <Text style={{ fontSize: 12, color: colors.white, fontWeight: '700' }}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {t('exercise:showUsage')}
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </RNModal>
    </>
  )
}

function FilterSection({ label, children }) {
  return (
    <View className="mb-4">
      <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: 8 }}>{label}</Text>
      {children}
    </View>
  )
}

function ChipOption({ label, isSelected, dot, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full"
      style={{
        backgroundColor: isSelected ? colors.accentBgSubtle : colors.bgTertiary,
        borderWidth: 1,
        borderColor: isSelected ? colors.accent : 'transparent',
      }}
    >
      {dot && <View className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />}
      <Text style={{ fontSize: 12, fontWeight: '500', color: isSelected ? colors.accent : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  )
}

function ActiveChip({ label, dot, onClear }) {
  return (
    <View
      className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ backgroundColor: colors.accentBgSubtle }}
    >
      {dot && <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />}
      <Text style={{ fontSize: 12, color: colors.accent }}>{label}</Text>
      <Pressable onPress={onClear} className="ml-0.5">
        <X size={10} color={colors.accent} />
      </Pressable>
    </View>
  )
}
