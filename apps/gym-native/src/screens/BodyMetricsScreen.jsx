import { useState, useRef, useEffect } from 'react'
import { View, Text, FlatList, Pressable, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react-native'
import { useBodyWeightHistory, useRecordBodyWeight, useUpdateBodyWeight, useDeleteBodyWeight } from '../hooks/useBodyWeight'
import { LoadingSpinner, ErrorMessage, ConfirmModal } from '../components/ui'
import { BodyWeightModal, MeasurementSection } from '../components/BodyWeight'
import { BodyWeightChart } from '../components/Charts'
import { calculateBodyWeightStats, formatShortDate, formatTime } from '@gym/shared'
import { colors, design } from '../lib/styles'

function WeightSection() {
  const { t } = useTranslation()
  const { data: records, isLoading, error } = useBodyWeightHistory()
  const recordMutation = useRecordBodyWeight()
  const updateMutation = useUpdateBodyWeight()
  const deleteMutation = useDeleteBodyWeight()

  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [recordToDelete, setRecordToDelete] = useState(null)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const stats = calculateBodyWeightStats(records)

  const handleSubmit = ({ id, weight, notes }) => {
    if (id) {
      updateMutation.mutate({ id, weight, notes }, {
        onSuccess: () => { setShowModal(false); setEditingRecord(null) }
      })
    } else {
      recordMutation.mutate({ weight, notes }, {
        onSuccess: () => setShowModal(false)
      })
    }
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    setShowModal(true)
  }

  const handleDelete = () => {
    if (!recordToDelete) return
    deleteMutation.mutate(recordToDelete, {
      onSuccess: () => setRecordToDelete(null),
    })
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingRecord(null)
  }

  const renderRecord = ({ item: record }) => (
    <View style={{ marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>{record.weight} kg</Text>
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
      {/* Stats */}
      {stats && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <View style={{ flex: 1, minWidth: '45%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>{t('body:weight.current')}</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{stats.current} kg</Text>
          </View>
          <View style={{ flex: 1, minWidth: '45%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>{t('body:weight.change')}</Text>
            <Text style={{ color: colors.success, fontSize: 18, fontWeight: '700' }}>
              {stats.change > 0 ? '+' : ''}{stats.change} kg
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: '45%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>{t('body:weight.lowest')}</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{stats.min} kg</Text>
          </View>
          <View style={{ flex: 1, minWidth: '45%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>{t('body:weight.highest')}</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{stats.max} kg</Text>
          </View>
        </View>
      )}

      {/* Chart */}
      {records && records.length >= 2 && (
        <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
          <BodyWeightChart records={records} />
        </View>
      )}

      {/* Record Button */}
      <Pressable onPress={() => setShowModal(true)}
        style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('body:weight.record')}</Text>
      </Pressable>

      <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>{t('body:weight.history')}</Text>
    </View>
  )

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={records || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRecord}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: design.tabContentPaddingBottom }}
        ListEmptyComponent={
          <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 32, fontSize: 14 }}>
            {t('body:weight.noRecords')}
          </Text>
        }
      />

      <BodyWeightModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        record={editingRecord}
        isPending={recordMutation.isPending || updateMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!recordToDelete}
        title={t('body:weight.delete')}
        message={t('body:weight.deleteConfirm')}
        confirmText={t('common:buttons.delete')}
        onConfirm={handleDelete}
        onCancel={() => setRecordToDelete(null)}
      />
    </View>
  )
}

export default function BodyMetricsScreen() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('peso')
  const [tabWidth, setTabWidth] = useState(0)
  const slideAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: activeTab === 'peso' ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start()
  }, [activeTab, slideAnim])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }} edges={['top']}>
      {/* Tabs */}
      <View
        onLayout={(e) => setTabWidth(e.nativeEvent.layout.width)}
        style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 8, marginBottom: 20, padding: 4, borderRadius: 10, backgroundColor: colors.bgTertiary }}>
        {tabWidth > 0 && (
          <Animated.View style={{
            position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 8,
            width: (tabWidth - 8) / 2, backgroundColor: colors.success,
            transform: [{ translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, (tabWidth - 8) / 2] }) }],
          }} />
        )}
        <Pressable onPress={() => setActiveTab('peso')}
          style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', zIndex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'peso' ? colors.bgPrimary : colors.textSecondary }}>
            {t('body:weight.tab')}
          </Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('medidas')}
          style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', zIndex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'medidas' ? colors.bgPrimary : colors.textSecondary }}>
            {t('body:measurements.title')}
          </Text>
        </Pressable>
      </View>

      {activeTab === 'peso' && <WeightSection />}
      {activeTab === 'medidas' && <MeasurementSection />}
    </SafeAreaView>
  )
}
