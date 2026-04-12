import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Settings, ChevronDown } from 'lucide-react'
import { useBodyMeasurementHistory, useRecordBodyMeasurement, useUpdateBodyMeasurement, useDeleteBodyMeasurement } from '../../hooks/useBodyMeasurements.js'
import { usePreferences, useUpdatePreference } from '../../hooks/usePreferences.js'
import { LoadingSpinner } from '../ui/index.js'
import MeasurementChart from './MeasurementChart.jsx'
import MeasurementModal from './MeasurementModal.jsx'
import MeasurementConfigModal from './MeasurementConfigModal.jsx'
import { calculateMeasurementStats, formatShortDate, formatTime, getMeasurementLabel } from '@gym/shared'
import { colors } from '../../lib/styles.js'

function MeasurementSection() {
  const { t } = useTranslation()
  const { data: preferences } = usePreferences()
  const updatePreference = useUpdatePreference()

  const enabledMeasurements = useMemo(
    () => preferences?.enabled_body_measurements || [],
    [preferences?.enabled_body_measurements]
  )
  const unit = preferences?.measurement_unit || 'cm'

  const [selectedType, setSelectedType] = useState(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)

  useEffect(() => {
    if (enabledMeasurements.length > 0 && !selectedType) {
      setSelectedType(enabledMeasurements[0])
    } else if (enabledMeasurements.length > 0 && !enabledMeasurements.includes(selectedType)) {
      setSelectedType(enabledMeasurements[0])
    } else if (enabledMeasurements.length === 0) {
      setSelectedType(null)
    }
  }, [enabledMeasurements, selectedType])

  const { data: records, isLoading } = useBodyMeasurementHistory(selectedType)
  const recordMutation = useRecordBodyMeasurement()
  const updateMutation = useUpdateBodyMeasurement()
  const deleteMutation = useDeleteBodyMeasurement()

  const handleSaveConfig = (newMeasurements) => {
    updatePreference.mutate(
      { key: 'enabled_body_measurements', value: newMeasurements },
      { onSuccess: () => setShowConfigModal(false) }
    )
  }

  const handleSubmit = ({ id, measurementType, value, notes }) => {
    if (id) {
      updateMutation.mutate({ id, value, unit, notes }, {
        onSuccess: () => { setShowRecordModal(false); setEditingRecord(null) }
      })
    } else {
      recordMutation.mutate({ measurementType, value, unit, notes }, {
        onSuccess: () => setShowRecordModal(false)
      })
    }
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    setShowRecordModal(true)
  }

  const handleDelete = (id) => {
    if (confirm(t('body:measurements.deleteConfirm'))) {
      deleteMutation.mutate({ id, measurementType: selectedType })
    }
  }

  const handleCloseModal = () => {
    setShowRecordModal(false)
    setEditingRecord(null)
  }

  if (enabledMeasurements.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
          {t('body:measurements.configureDescription')}
        </p>
        <button onClick={() => setShowConfigModal(true)}
          className="px-6 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
          {t('body:measurements.configure')}
        </button>
        <MeasurementConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          enabledMeasurements={enabledMeasurements}
          onSave={handleSaveConfig}
          isPending={updatePreference.isPending}
        />
      </div>
    )
  }

  const stats = calculateMeasurementStats(records)

  return (
    <div>
      {/* Selector + Config */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <button onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            className="w-full flex items-center justify-between gap-2 p-3 rounded-xl"
            style={{ backgroundColor: colors.bgTertiary }}>
            <span className="font-medium text-sm" style={{ color: colors.textPrimary }}>
              {getMeasurementLabel(selectedType)}
            </span>
            <ChevronDown size={16} color={colors.textSecondary} />
          </button>

          {showTypeDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTypeDropdown(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl shadow-lg overflow-hidden"
                style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
                {enabledMeasurements.map(type => (
                  <button key={type}
                    onClick={() => { setSelectedType(type); setShowTypeDropdown(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:opacity-80"
                    style={{
                      color: type === selectedType ? colors.success : colors.textPrimary,
                      backgroundColor: type === selectedType ? colors.successBg : 'transparent',
                    }}>
                    {getMeasurementLabel(type)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button onClick={() => setShowConfigModal(true)} className="p-3 rounded-xl"
          style={{ backgroundColor: colors.bgTertiary }}>
          <Settings size={16} color={colors.textSecondary} />
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
                <div className="text-xs mb-0.5" style={{ color: colors.textSecondary }}>{t('body:weight.current')}</div>
                <div className="text-lg font-bold" style={{ color: colors.textPrimary }}>{stats.current} {unit}</div>
              </div>
              <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
                <div className="text-xs mb-0.5" style={{ color: colors.textSecondary }}>{t('body:weight.change')}</div>
                <div className="text-lg font-bold" style={{ color: colors.success }}>
                  {stats.change > 0 ? '+' : ''}{stats.change} {unit}
                </div>
              </div>
              <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
                <div className="text-xs mb-0.5" style={{ color: colors.textSecondary }}>{t('body:weight.lowest')}</div>
                <div className="text-lg font-bold" style={{ color: colors.textPrimary }}>{stats.min} {unit}</div>
              </div>
              <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
                <div className="text-xs mb-0.5" style={{ color: colors.textSecondary }}>{t('body:weight.highest')}</div>
                <div className="text-lg font-bold" style={{ color: colors.textPrimary }}>{stats.max} {unit}</div>
              </div>
            </div>
          )}

          {/* Chart */}
          {records && records.length >= 2 && (
            <div className="p-3 rounded-xl mb-4" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
              <MeasurementChart records={records} measurementType={selectedType} unit={unit} />
            </div>
          )}

          {/* Record Button */}
          <button onClick={() => setShowRecordModal(true)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold mb-6"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
            {t('body:measurements.record')} {selectedType ? getMeasurementLabel(selectedType).toLowerCase() : ''}
          </button>

          {/* History */}
          <h2 className="text-base font-bold mb-3" style={{ color: colors.textPrimary }}>{t('body:weight.history')}</h2>
          {!records || records.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: colors.textSecondary }}>
              {t('body:measurements.noRecords')}
            </p>
          ) : (
            <div className="space-y-2">
              {records.map(record => (
                <div key={record.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold" style={{ color: colors.textPrimary }}>{record.value} {record.unit}</span>
                    <span className="text-xs" style={{ color: colors.textSecondary }}>
                      {formatShortDate(record.recorded_at)} · {formatTime(record.recorded_at)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(record)} className="p-2 hover:opacity-80"
                      style={{ color: colors.textMuted }}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(record.id)}
                      className="p-2 hover:opacity-80 disabled:opacity-50"
                      style={{ color: colors.textMuted }} disabled={deleteMutation.isPending}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedType && (
        <MeasurementModal
          isOpen={showRecordModal}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          measurementType={selectedType}
          unit={unit}
          record={editingRecord}
          isPending={recordMutation.isPending || updateMutation.isPending}
        />
      )}

      <MeasurementConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        enabledMeasurements={enabledMeasurements}
        onSave={handleSaveConfig}
        isPending={updatePreference.isPending}
      />
    </div>
  )
}

export default MeasurementSection
