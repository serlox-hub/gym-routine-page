import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus, Settings, ChevronDown } from 'lucide-react'
import { useBodyMeasurementHistory, useRecordBodyMeasurement, useUpdateBodyMeasurement, useDeleteBodyMeasurement } from '../../hooks/useBodyMeasurements.js'
import { usePreferences, useUpdatePreference } from '../../hooks/usePreferences.js'
import { Card, Button, LoadingSpinner } from '../ui/index.js'
import MeasurementChart from './MeasurementChart.jsx'
import MeasurementModal from './MeasurementModal.jsx'
import MeasurementConfigModal from './MeasurementConfigModal.jsx'
import { calculateMeasurementStats, calculateMeasurementTrend } from '../../lib/bodyMeasurementCalculations.js'
import { getMeasurementLabel } from '../../lib/measurementConstants.js'
import { formatShortDate } from '../../lib/dateUtils.js'
import { colors } from '../../lib/styles.js'

function MeasurementSection() {
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

  // Auto-seleccionar primera medida si no hay ninguna seleccionada
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
        onSuccess: () => {
          setShowRecordModal(false)
          setEditingRecord(null)
        }
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
    if (confirm('¿Eliminar este registro?')) {
      deleteMutation.mutate({ id, measurementType: selectedType })
    }
  }

  const handleCloseModal = () => {
    setShowRecordModal(false)
    setEditingRecord(null)
  }

  // Estado vacío: sin medidas configuradas
  if (enabledMeasurements.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary mb-4">
          Configura las medidas corporales que quieres trackear
        </p>
        <Button onClick={() => setShowConfigModal(true)}>
          Configurar medidas
        </Button>

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
  const trend = calculateMeasurementTrend(records)
  const TrendIcon = trend === 'increasing' ? TrendingUp : trend === 'decreasing' ? TrendingDown : Minus
  const trendColor = colors.textSecondary // Neutral para medidas (no siempre subir es malo)

  return (
    <div>
      {/* Selector de medida + Config */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <button
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            className="w-full flex items-center justify-between gap-2 p-3 rounded-lg"
            style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}
          >
            <span className="font-medium" style={{ color: colors.textPrimary }}>
              {getMeasurementLabel(selectedType)}
            </span>
            <ChevronDown size={18} style={{ color: colors.textSecondary }} />
          </button>

          {showTypeDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTypeDropdown(false)} />
              <div
                className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg shadow-lg overflow-hidden"
                style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
              >
                {enabledMeasurements.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type)
                      setShowTypeDropdown(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:opacity-80"
                    style={{
                      color: type === selectedType ? colors.accent : colors.textPrimary,
                      backgroundColor: type === selectedType ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                    }}
                  >
                    {getMeasurementLabel(type)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setShowConfigModal(true)}
          className="p-3 rounded-lg"
          style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}
        >
          <Settings size={18} style={{ color: colors.textSecondary }} />
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Card className="p-3">
                <div className="text-xs text-secondary mb-1">Actual</div>
                <div className="text-lg font-bold" style={{ color: colors.accent }}>
                  {stats.current} {unit}
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-1 text-xs text-secondary mb-1">
                  <span>Cambio</span>
                  <TrendIcon size={12} style={{ color: trendColor }} />
                </div>
                <div className="text-lg font-bold" style={{ color: trendColor }}>
                  {stats.change > 0 ? '+' : ''}{stats.change} {unit}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-secondary mb-1">Mínimo</div>
                <div className="text-lg font-bold" style={{ color: colors.success }}>
                  {stats.min} {unit}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-secondary mb-1">Máximo</div>
                <div className="text-lg font-bold" style={{ color: colors.warning }}>
                  {stats.max} {unit}
                </div>
              </Card>
            </div>
          )}

          {/* Chart */}
          {records && records.length >= 2 && (
            <Card className="p-4 mb-6">
              <MeasurementChart records={records} measurementType={selectedType} unit={unit} />
            </Card>
          )}

          {/* Action Button */}
          <div className="mb-6">
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setShowRecordModal(true)}
            >
              <Plus size={18} />
              Registrar {selectedType ? getMeasurementLabel(selectedType).toLowerCase() : 'medida'}
            </Button>
          </div>

          {/* History */}
          <h2 className="text-lg font-bold mb-3">Historial</h2>
          {!records || records.length === 0 ? (
            <p className="text-center text-secondary py-8">
              Sin registros. Empieza registrando tu primera medida.
            </p>
          ) : (
            <div className="space-y-2">
              {records.map(record => (
                <Card key={record.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                          {record.value} {record.unit}
                        </span>
                        <span className="text-xs" style={{ color: colors.textSecondary }}>
                          {formatShortDate(record.recorded_at)}
                        </span>
                      </div>
                      {record.notes && (
                        <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                          {record.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(record)}
                        className="p-2 rounded hover:opacity-80"
                        style={{ color: colors.textSecondary }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-2 rounded hover:opacity-80 disabled:opacity-50"
                        style={{ color: colors.error }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <MeasurementModal
        isOpen={showRecordModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        measurementType={selectedType}
        unit={unit}
        record={editingRecord}
        isPending={recordMutation.isPending || updateMutation.isPending}
      />

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
