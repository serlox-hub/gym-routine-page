import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { inputStyle } from '../../lib/styles.js'
import {
  getMuscleGroupColor, getMuscleGroupName, getEquipmentName,
  getMuscleGroupFilterSections, getEquipmentFilterSections,
} from '@gym/shared'
import FilterSelectButton from './FilterSelectButton.jsx'
import FilterOptionSheet from './FilterOptionSheet.jsx'

function ExerciseSearchBar({
  search, onSearchChange,
  muscleGroups, selectedMuscleGroup, onMuscleGroupChange,
  equipmentTypes, selectedEquipmentType, onEquipmentTypeChange,
  autoFocus = false,
  inputRef,
}) {
  const { t } = useTranslation()
  const [openFilter, setOpenFilter] = useState(null)
  const ownInputRef = useRef(null)
  const searchInputRef = inputRef ?? ownInputRef

  // Built on every render, not memoized: labels and order depend on the language, which can
  // change while the picker is open, and the lists are a dozen items.
  const muscleSections = getMuscleGroupFilterSections(muscleGroups)
  const equipmentSections = getEquipmentFilterSections(equipmentTypes)
  const selectedGroup = muscleGroups?.find(g => g.id === selectedMuscleGroup)
  const selectedEquipment = equipmentTypes?.find(e => e.id === selectedEquipmentType)

  // The search keyboard would cover the sheet.
  const openSheet = filter => {
    searchInputRef.current?.blur()
    setOpenFilter(filter)
  }
  const closeSheet = () => setOpenFilter(null)

  return (
    <div className="mb-2">
      <input
        ref={searchInputRef}
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t('exercise:searchPlaceholder')}
        className="w-full h-11 px-3 rounded-lg text-sm"
        style={inputStyle}
        autoFocus={autoFocus}
      />

      <div className="flex items-center gap-2 mt-2">
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
      </div>

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
    </div>
  )
}

export default ExerciseSearchBar
