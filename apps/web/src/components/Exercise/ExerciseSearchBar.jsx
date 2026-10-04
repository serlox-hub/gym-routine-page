import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react'
import { colors, inputStyle } from '../../lib/styles.js'
import { getEquipmentName, countSheetFilters } from '@gym/shared'
import MuscleGroupFilterRow from './MuscleGroupFilterRow.jsx'
import ExerciseFilterSheet from './ExerciseFilterSheet.jsx'
import ActiveFilterChip from './ActiveFilterChip.jsx'

function ExerciseSearchBar({
  search, onSearchChange,
  muscleGroups, selectedMuscleGroup, onMuscleGroupChange,
  equipmentTypes, selectedEquipmentType, onEquipmentTypeChange,
  sourceFilter, onSourceFilterChange,
  resultCount,
  autoFocus = false,
  inputRef,
}) {
  const { t } = useTranslation()
  const [showFilters, setShowFilters] = useState(false)
  const ownInputRef = useRef(null)
  const searchInputRef = inputRef ?? ownInputRef

  const selectedEquipment = equipmentTypes?.find(e => e.id === selectedEquipmentType)
  // The muscle group is not counted: its row already shows it.
  const sheetFilterCount = countSheetFilters({ equipmentTypeId: selectedEquipmentType, sourceFilter })

  // The search keyboard would cover the sheet's bottom, where its button is.
  const handleOpenFilters = () => {
    searchInputRef.current?.blur()
    setShowFilters(true)
  }

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('exercise:searchPlaceholder')}
          className="flex-1 min-w-0 h-11 px-3 rounded-lg text-sm"
          style={inputStyle}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          onClick={handleOpenFilters}
          aria-label={t('common:buttons.filter')}
          className="relative w-11 h-11 flex items-center justify-center rounded-lg shrink-0"
          style={{
            backgroundColor: sheetFilterCount > 0 ? colors.successBgSubtle : colors.bgTertiary,
            color: sheetFilterCount > 0 ? colors.success : colors.textSecondary,
            border: `1px solid ${sheetFilterCount > 0 ? colors.success : colors.border}`,
          }}
        >
          <SlidersHorizontal size={16} />
          {sheetFilterCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ backgroundColor: colors.success, color: colors.bgPrimary }}
            >
              {sheetFilterCount}
            </span>
          )}
        </button>
      </div>

      <MuscleGroupFilterRow
        muscleGroups={muscleGroups}
        selectedMuscleGroup={selectedMuscleGroup}
        onMuscleGroupChange={onMuscleGroupChange}
      />

      {sheetFilterCount > 0 && (
        <div className="flex items-center gap-x-1.5 flex-wrap">
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
        </div>
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
    </div>
  )
}

export default ExerciseSearchBar
