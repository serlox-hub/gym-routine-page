import { useState } from 'react'
import { View, TextInput, Keyboard } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, design, inputStyle } from '../../lib/styles'
import {
  getMuscleGroupColor, getMuscleGroupName, getEquipmentName,
  getMuscleGroupFilterSections, getEquipmentFilterSections,
} from '@gym/shared'
import FilterSelectButton from './FilterSelectButton'
import FilterOptionSheet from './FilterOptionSheet'

export default function ExerciseSearchBar({
  search, onSearchChange,
  muscleGroups, selectedMuscleGroup, onMuscleGroupChange,
  equipmentTypes, selectedEquipmentType, onEquipmentTypeChange,
  autoFocus = false,
}) {
  const { t } = useTranslation()
  const [openFilter, setOpenFilter] = useState(null)

  // Built on every render, not memoized: labels and order depend on the language, which can
  // change while the picker is open, and the lists are a dozen items.
  const muscleSections = getMuscleGroupFilterSections(muscleGroups)
  const equipmentSections = getEquipmentFilterSections(equipmentTypes)
  const selectedGroup = muscleGroups?.find(g => g.id === selectedMuscleGroup)
  const selectedEquipment = equipmentTypes?.find(e => e.id === selectedEquipmentType)

  // The search keyboard would cover the sheet.
  const openSheet = filter => {
    Keyboard.dismiss()
    setOpenFilter(filter)
  }
  const closeSheet = () => setOpenFilter(null)

  return (
    <View className="mb-2">
      <TextInput
        value={search}
        onChangeText={onSearchChange}
        placeholder={t('exercise:searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
        autoFocus={autoFocus}
        style={[inputStyle, { height: design.minTouchTarget, paddingHorizontal: 12, paddingVertical: 0, fontSize: 14 }]}
      />

      <View className="flex-row items-center gap-2 mt-2">
        <FilterSelectButton
          label={t('exercise:filterMuscle')}
          value={selectedGroup ? getMuscleGroupName(selectedGroup) : null}
          onOpen={() => openSheet('muscle')}
          onClear={() => onMuscleGroupChange(null)}
          clearLabel={t('exercise:clearFilterValue', { value: getMuscleGroupName(selectedGroup) })}
        />
        <FilterSelectButton
          label={t('exercise:filterEquipment')}
          value={selectedEquipment ? getEquipmentName(selectedEquipment) : null}
          onOpen={() => openSheet('equipment')}
          onClear={() => onEquipmentTypeChange(null)}
          clearLabel={t('exercise:clearFilterValue', { value: getEquipmentName(selectedEquipment) })}
        />
      </View>

      <FilterOptionSheet
        isOpen={openFilter === 'muscle'}
        onClose={closeSheet}
        title={t('exercise:filterMuscle')}
        allLabel={t('exercise:allMuscles')}
        sections={muscleSections}
        getSectionTitle={key => t(`exercise:muscleSection.${key}`)}
        getOptionDot={option => getMuscleGroupColor(option.item.name)}
        selectedId={selectedMuscleGroup}
        onSelect={onMuscleGroupChange}
      />
      <FilterOptionSheet
        isOpen={openFilter === 'equipment'}
        onClose={closeSheet}
        title={t('exercise:filterEquipment')}
        allLabel={t('exercise:allEquipment')}
        sections={equipmentSections}
        selectedId={selectedEquipmentType}
        onSelect={onEquipmentTypeChange}
      />
    </View>
  )
}
