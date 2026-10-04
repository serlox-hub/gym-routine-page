import { useTranslation } from 'react-i18next'
import { getEquipmentName, countSheetFilters, getFilterSheetDoneLabel } from '@gym/shared'
import { colors } from '../../lib/styles.js'
import { Modal, Button, Switch } from '../ui/index.js'
import FilterChip from './FilterChip.jsx'

/**
 * The filters that do not fit on screen: equipment and "only my exercises". The muscle group is
 * not here, it has its own row. The button at the bottom closes it and says how many exercises
 * the search and filters show (`resultCount`, null while the catalog loads).
 */
function ExerciseFilterSheet({
  isOpen, onClose,
  equipmentTypes, selectedEquipmentType, onEquipmentTypeChange,
  sourceFilter, onSourceFilterChange,
  resultCount,
}) {
  const { t } = useTranslation()
  const hasSheetFilters = countSheetFilters({ equipmentTypeId: selectedEquipmentType, sourceFilter }) > 0

  // Only the sheet's own filters: the muscle group stays as it is.
  const handleReset = () => {
    onEquipmentTypeChange?.(null)
    onSourceFilterChange?.('all')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom" maxWidth="max-w-md">
      <div className="px-4 pt-2 pb-8 flex flex-col min-h-0">
        <div className="flex items-center justify-between min-h-11 mb-2">
          <h3 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
            {t('common:buttons.filter')}
          </h3>
          {hasSheetFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="h-11 px-2 -mr-2 text-xs font-medium"
              style={{ color: colors.success }}
            >
              {t('common:buttons.reset')}
            </button>
          )}
        </div>

        <div className="overflow-y-auto min-h-0">
          {equipmentTypes && onEquipmentTypeChange && (
            <div className="mb-2">
              <p className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
                {t('exercise:filterEquipment')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  label={t('common:labels.all')}
                  isSelected={!selectedEquipmentType}
                  onClick={() => onEquipmentTypeChange(null)}
                />
                {equipmentTypes.map(equipment => (
                  <FilterChip
                    key={equipment.id}
                    label={getEquipmentName(equipment)}
                    isSelected={selectedEquipmentType === equipment.id}
                    onClick={() => onEquipmentTypeChange(equipment.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {onSourceFilterChange && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: colors.textPrimary }}>{t('exercise:onlyMine')}</span>
              <Switch
                checked={sourceFilter === 'custom'}
                onChange={checked => onSourceFilterChange(checked ? 'custom' : 'all')}
                accessibilityLabel={t('exercise:onlyMine')}
              />
            </div>
          )}
        </div>

        <Button onClick={onClose} className="w-full min-h-11 mt-4 shrink-0">
          {getFilterSheetDoneLabel(resultCount)}
        </Button>
      </div>
    </Modal>
  )
}

export default ExerciseFilterSheet
