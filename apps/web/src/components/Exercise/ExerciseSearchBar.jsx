import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal, X } from 'lucide-react'
import { colors, inputStyle } from '../../lib/styles.js'
import { getMuscleGroupColor, getMuscleGroupName, getEquipmentName } from '@gym/shared'
import { Modal } from '../ui/index.js'

function ExerciseSearchBar({
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
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('exercise:searchPlaceholder')}
          className="flex-1 min-w-0 py-2 px-3 rounded-lg text-sm"
          style={inputStyle}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="relative p-2 rounded-lg shrink-0"
          style={{
            backgroundColor: activeFilterCount > 0 ? colors.accentBgSubtle : colors.bgTertiary,
            color: activeFilterCount > 0 ? colors.accent : colors.textSecondary,
            border: `1px solid ${activeFilterCount > 0 ? colors.accent : colors.border}`,
          }}
        >
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ backgroundColor: colors.accent, color: colors.white }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips (below input, only when filters active) */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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
        </div>
      )}

      {/* Filter panel */}
      <Modal isOpen={showFilters} onClose={() => setShowFilters(false)} position="bottom" maxWidth="max-w-md">
        <div className="p-4 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
              {t('common:buttons.filter')}
            </h3>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs font-medium"
                style={{ color: colors.accent }}
              >
                {t('common:buttons.reset')}
              </button>
            )}
          </div>

          {/* Muscle group */}
          <FilterSection label={t('exercise:filterMuscle')}>
            <div className="flex flex-wrap gap-1.5">
              <ChipOption
                label={t('common:labels.all')}
                isSelected={!selectedMuscleGroup}
                onClick={() => onMuscleGroupChange(null)}
              />
              {muscleGroups?.map(group => (
                <ChipOption
                  key={group.id}
                  label={getMuscleGroupName(group)}
                  isSelected={selectedMuscleGroup === group.id}
                  dot={getMuscleGroupColor(group.name)}
                  onClick={() => onMuscleGroupChange(group.id)}
                />
              ))}
            </div>
          </FilterSection>

          {/* Equipment */}
          {equipmentTypes && onEquipmentTypeChange && (
            <FilterSection label={t('exercise:filterEquipment')}>
              <div className="flex flex-wrap gap-1.5">
                <ChipOption
                  label={t('common:labels.all')}
                  isSelected={!selectedEquipmentType}
                  onClick={() => onEquipmentTypeChange(null)}
                />
                {equipmentTypes?.map(eq => (
                  <ChipOption
                    key={eq.id}
                    label={getEquipmentName(eq)}
                    isSelected={selectedEquipmentType === eq.id}
                    onClick={() => onEquipmentTypeChange(eq.id)}
                  />
                ))}
              </div>
            </FilterSection>
          )}

          {/* Source */}
          {onSourceFilterChange && (
            <FilterSection label={t('exercise:filterSource')}>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'all', label: t('common:labels.all') },
                  { value: 'system', label: t('exercise:system') },
                  { value: 'custom', label: t('exercise:custom') },
                ].map(opt => (
                  <ChipOption
                    key={opt.value}
                    label={opt.label}
                    isSelected={sourceFilter === opt.value}
                    onClick={() => onSourceFilterChange(opt.value)}
                  />
                ))}
              </div>
            </FilterSection>
          )}

          {/* Show usage toggle */}
          {onToggleUsage && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUsage}
                onChange={(e) => onToggleUsage(e.target.checked)}
                className="accent-current"
                style={{ accentColor: colors.accent }}
              />
              <span className="text-xs" style={{ color: colors.textSecondary }}>
                {t('exercise:showUsage')}
              </span>
            </label>
          )}
        </div>
      </Modal>
    </div>
  )
}

function FilterSection({ label, children }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>{label}</p>
      {children}
    </div>
  )
}

function ChipOption({ label, isSelected, dot, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors"
      style={{
        backgroundColor: isSelected ? colors.accentBgSubtle : colors.bgTertiary,
        color: isSelected ? colors.accent : colors.textSecondary,
        border: `1px solid ${isSelected ? colors.accent : 'transparent'}`,
      }}
    >
      {dot && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />}
      {label}
    </button>
  )
}

function ActiveChip({ label, dot, onClear }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={{ backgroundColor: colors.accentBgSubtle, color: colors.accent }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />}
      {label}
      <button type="button" onClick={onClear} className="ml-0.5 hover:opacity-70">
        <X size={10} />
      </button>
    </span>
  )
}

export default ExerciseSearchBar
