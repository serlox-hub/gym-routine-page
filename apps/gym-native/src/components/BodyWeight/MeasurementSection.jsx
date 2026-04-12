import { useState, useEffect, useMemo } from 'react'
import { View, Text, FlatList, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Settings, ChevronDown } from 'lucide-react-native'
import { useBodyMeasurementHistory, useRecordBodyMeasurement, useUpdateBodyMeasurement, useDeleteBodyMeasurement } from '../../hooks/useBodyMeasurements'
import { usePreferences, useUpdatePreference } from '../../hooks/usePreferences'
import { LoadingSpinner, Modal, ConfirmModal } from '../ui'
import { MeasurementChart } from '../Charts'
import MeasurementModal from './MeasurementModal'
import MeasurementConfigModal from './MeasurementConfigModal'
import { calculateMeasurementStats, formatShortDate, formatTime, getMeasurementLabel } from '@gym/shared'
import { colors } from '../../lib/styles'

export default function MeasurementSection() {
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
      <View style={{ alignItems: 'center', paddingVertical: 48 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 16, textAlign: 'center', paddingHorizontal: 32 }}>
          {t('body:measurements.configureDescription')}
        </Text>
        <Pressable onPress={() => setShowConfigModal(true)}
          style={{ paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.success }}>
          <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('body:measurements.configure')}</Text>
        </Pressable>
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

  const renderRecord = ({ item: record }) => (
    <View style={{ marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>{record.value} {record.unit}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          {formatShortDate(record.recorded_at)} · {formatTime(record.recorded_at)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <Pressable onPress={() => handleEdit(record)} style={{ padding: 8 }} className="active:opacity-70">
          <Pencil size={16} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => setRecordToDelete(record.id)} disabled={deleteMutation.isPending}
          style={{ padding: 8 }} className="active:opacity-70">
          <Trash2 size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  )

  const ListHeader = () => (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Selector + Config */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Pressable onPress={() => setShowTypeSelector(true)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: colors.bgTertiary }}
          className="active:opacity-80">
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>{getMeasurementLabel(selectedType)}</Text>
          <ChevronDown size={16} color={colors.textSecondary} />
        </Pressable>
        <Pressable onPress={() => setShowConfigModal(true)}
          style={{ padding: 12, borderRadius: 12, backgroundColor: colors.bgTertiary }}
          className="active:opacity-70">
          <Settings size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingSpinner fullScreen={false} />
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <View style={{ flex: 1, minWidth: '45%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>{t('body:weight.current')}</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{stats.current} {unit}</Text>
              </View>
              <View style={{ flex: 1, minWidth: '45%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>{t('body:weight.change')}</Text>
                <Text style={{ color: colors.success, fontSize: 18, fontWeight: '700' }}>
                  {stats.change > 0 ? '+' : ''}{stats.change} {unit}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: '45%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>{t('body:weight.lowest')}</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{stats.min} {unit}</Text>
              </View>
              <View style={{ flex: 1, minWidth: '45%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>{t('body:weight.highest')}</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{stats.max} {unit}</Text>
              </View>
            </View>
          )}

          {/* Chart */}
          {records && records.length >= 2 && (
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
              <MeasurementChart records={records} measurementType={selectedType} unit={unit} />
            </View>
          )}

          {/* Record Button */}
          <Pressable onPress={() => setShowRecordModal(true)}
            style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>
              {t('body:measurements.record')} {selectedType ? getMeasurementLabel(selectedType).toLowerCase() : ''}
            </Text>
          </Pressable>

          <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>{t('body:weight.history')}</Text>
        </>
      )}
    </View>
  )

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={isLoading ? [] : (records || [])}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRecord}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 32, fontSize: 14 }}>
              {t('body:measurements.noRecords')}
            </Text>
          ) : null
        }
      />

      {/* Type Selector Modal */}
      <Modal isOpen={showTypeSelector} onClose={() => setShowTypeSelector(false)} position="bottom">
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 16 }}>{t('body:measurements.selectType')}</Text>
          <View style={{ gap: 4 }}>
            {enabledMeasurements.map(type => (
              <Pressable key={type}
                onPress={() => { setSelectedType(type); setShowTypeSelector(false) }}
                style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: type === selectedType ? colors.successBg : 'transparent' }}
                className="active:opacity-80">
                <Text style={{ color: type === selectedType ? colors.success : colors.textPrimary, fontSize: 14 }}>
                  {getMeasurementLabel(type)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

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

      <ConfirmModal
        isOpen={!!recordToDelete}
        title={t('body:measurements.delete')}
        message={t('body:measurements.deleteConfirm')}
        confirmText={t('common:buttons.delete')}
        onConfirm={handleDelete}
        onCancel={() => setRecordToDelete(null)}
      />
    </View>
  )
}
