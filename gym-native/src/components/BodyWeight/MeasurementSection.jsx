import { useState, useEffect, useMemo } from 'react'
import { View, Text, FlatList, Pressable } from 'react-native'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus, Settings, ChevronDown } from 'lucide-react-native'
import { useBodyMeasurementHistory, useRecordBodyMeasurement, useUpdateBodyMeasurement, useDeleteBodyMeasurement } from '../../hooks/useBodyMeasurements'
import { usePreferences, useUpdatePreference } from '../../hooks/usePreferences'
import { Card, Button, LoadingSpinner, Modal, ConfirmModal } from '../ui'
import { MeasurementChart } from '../Charts'
import MeasurementModal from './MeasurementModal'
import MeasurementConfigModal from './MeasurementConfigModal'
import { calculateMeasurementStats, calculateMeasurementTrend } from '../../lib/bodyMeasurementCalculations'
import { getMeasurementLabel } from '../../lib/measurementConstants'
import { formatShortDate } from '../../lib/dateUtils'
import { colors } from '../../lib/styles'

export default function MeasurementSection() {
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
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [recordToDelete, setRecordToDelete] = useState(null)

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

  const handleDelete = () => {
    if (!recordToDelete) return
    deleteMutation.mutate({ id: recordToDelete, measurementType: selectedType }, {
      onSuccess: () => setRecordToDelete(null),
    })
  }

  const handleCloseModal = () => {
    setShowRecordModal(false)
    setEditingRecord(null)
  }

  if (enabledMeasurements.length === 0) {
    return (
      <View className="items-center py-12">
        <Text className="text-secondary mb-4 text-center">
          Configura las medidas corporales que quieres trackear
        </Text>
        <Button onPress={() => setShowConfigModal(true)}>Configurar medidas</Button>

        <MeasurementConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          enabledMeasurements={enabledMeasurements}
          onSave={handleSaveConfig}
          isPending={updatePreference.isPending}
        />
      </View>
    )
  }

  const stats = calculateMeasurementStats(records)
  const trend = calculateMeasurementTrend(records)
  const TrendIcon = trend === 'increasing' ? TrendingUp : trend === 'decreasing' ? TrendingDown : Minus

  const renderRecord = ({ item: record }) => (
    <Card className="p-3 mx-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-baseline gap-2">
            <Text className="text-lg font-bold text-primary">{record.value} {record.unit}</Text>
            <Text className="text-xs text-secondary">{formatShortDate(record.recorded_at)}</Text>
          </View>
          {record.notes && (
            <Text className="text-xs text-secondary mt-1">{record.notes}</Text>
          )}
        </View>
        <View className="flex-row gap-1">
          <Pressable onPress={() => handleEdit(record)} className="p-2">
            <Pencil size={16} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => setRecordToDelete(record.id)}
            className="p-2"
            disabled={deleteMutation.isPending}
          >
            <Trash2 size={16} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    </Card>
  )

  return (
    <View className="flex-1">
      {/* Selector + Config */}
      <View className="flex-row items-center gap-2 px-4 mb-4">
        <Pressable
          onPress={() => setShowTypeSelector(true)}
          className="flex-1 flex-row items-center justify-between p-3 rounded-lg"
          style={{ backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}
        >
          <Text className="font-medium text-primary">
            {getMeasurementLabel(selectedType)}
          </Text>
          <ChevronDown size={18} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={() => setShowConfigModal(true)}
          className="p-3 rounded-lg"
          style={{ backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}
        >
          <Settings size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingSpinner fullScreen={false} />
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <View className="flex-row flex-wrap px-4 gap-3 mb-4">
              <View className="flex-1" style={{ minWidth: '45%' }}>
                <Card className="p-3">
                  <Text className="text-xs text-secondary mb-1">Actual</Text>
                  <Text className="text-lg font-bold" style={{ color: colors.accent }}>
                    {stats.current} {unit}
                  </Text>
                </Card>
              </View>
              <View className="flex-1" style={{ minWidth: '45%' }}>
                <Card className="p-3">
                  <View className="flex-row items-center gap-1 mb-1">
                    <Text className="text-xs text-secondary">Cambio</Text>
                    <TrendIcon size={12} color={colors.textSecondary} />
                  </View>
                  <Text className="text-lg font-bold text-secondary">
                    {stats.change > 0 ? '+' : ''}{stats.change} {unit}
                  </Text>
                </Card>
              </View>
              <View className="flex-1" style={{ minWidth: '45%' }}>
                <Card className="p-3">
                  <Text className="text-xs text-secondary mb-1">Mínimo</Text>
                  <Text className="text-lg font-bold" style={{ color: colors.success }}>
                    {stats.min} {unit}
                  </Text>
                </Card>
              </View>
              <View className="flex-1" style={{ minWidth: '45%' }}>
                <Card className="p-3">
                  <Text className="text-xs text-secondary mb-1">Máximo</Text>
                  <Text className="text-lg font-bold" style={{ color: colors.warning }}>
                    {stats.max} {unit}
                  </Text>
                </Card>
              </View>
            </View>
          )}

          {/* Chart */}
          {records && records.length >= 2 && (
            <View className="px-4 mb-4">
              <Card className="p-3">
                <MeasurementChart records={records} measurementType={selectedType} unit={unit} />
              </Card>
            </View>
          )}

          {/* Action Button */}
          <View className="px-4 mb-4">
            <Button onPress={() => setShowRecordModal(true)}>
              Registrar {selectedType ? getMeasurementLabel(selectedType).toLowerCase() : 'medida'}
            </Button>
          </View>

          {/* History */}
          <Text className="text-lg font-bold text-primary mb-3 px-4">Historial</Text>

          <FlatList
            data={records || []}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderRecord}
            ItemSeparatorComponent={() => <View className="h-2" />}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <Text className="text-secondary text-center py-8">
                Sin registros. Empieza registrando tu primera medida.
              </Text>
            }
          />
        </>
      )}

      {/* Type Selector Modal */}
      <Modal isOpen={showTypeSelector} onClose={() => setShowTypeSelector(false)} position="bottom" className="p-4">
        <Text className="text-lg font-semibold text-primary mb-4">Seleccionar medida</Text>
        <View className="gap-1">
          {enabledMeasurements.map(type => (
            <Pressable
              key={type}
              onPress={() => {
                setSelectedType(type)
                setShowTypeSelector(false)
              }}
              className="px-4 py-3 rounded-lg"
              style={{
                backgroundColor: type === selectedType ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
              }}
            >
              <Text
                className="text-sm"
                style={{ color: type === selectedType ? colors.accent : colors.textPrimary }}
              >
                {getMeasurementLabel(type)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Modal>

      {/* Record Modal */}
      <MeasurementModal
        isOpen={showRecordModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        measurementType={selectedType}
        unit={unit}
        record={editingRecord}
        isPending={recordMutation.isPending || updateMutation.isPending}
      />

      {/* Config Modal */}
      <MeasurementConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        enabledMeasurements={enabledMeasurements}
        onSave={handleSaveConfig}
        isPending={updatePreference.isPending}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!recordToDelete}
        title="Eliminar registro"
        message="¿Eliminar este registro?"
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setRecordToDelete(null)}
      />
    </View>
  )
}
