import { useState } from 'react'
import { View, Text, FlatList, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Pencil, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react-native'
import { useBodyWeightHistory, useRecordBodyWeight, useUpdateBodyWeight, useDeleteBodyWeight } from '../hooks/useBodyWeight'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, PageHeader, Button, ActiveSessionBanner } from '../components/ui'
import { BodyWeightModal, MeasurementSection } from '../components/BodyWeight'
import { BodyWeightChart } from '../components/Charts'
import { calculateBodyWeightStats, calculateWeightTrend, formatShortDate, formatTime } from '@gym/shared'
import { colors } from '../lib/styles'

function WeightSection() {
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
  const trend = calculateWeightTrend(records)
  const TrendIcon = trend === 'increasing' ? TrendingUp : trend === 'decreasing' ? TrendingDown : Minus
  const trendColor = trend === 'increasing' ? colors.danger : trend === 'decreasing' ? colors.success : colors.textSecondary

  const handleSubmit = ({ id, weight, notes }) => {
    if (id) {
      updateMutation.mutate({ id, weight, notes }, {
        onSuccess: () => {
          setShowModal(false)
          setEditingRecord(null)
        }
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
    <Card className="p-3 mx-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-baseline gap-2">
            <Text className="text-lg font-bold text-primary">{record.weight} kg</Text>
            <Text className="text-xs text-secondary">{formatShortDate(record.recorded_at)} · {formatTime(record.recorded_at)}</Text>
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

  const ListHeader = () => (
    <View className="px-4">
      {/* Stats */}
      {stats && (
        <View className="flex-row flex-wrap gap-3 mb-4">
          <View className="flex-1" style={{ minWidth: '45%' }}>
            <Card className="p-3">
              <Text className="text-xs text-secondary mb-1">Actual</Text>
              <Text className="text-lg font-bold" style={{ color: colors.accent }}>
                {stats.current} kg
              </Text>
            </Card>
          </View>
          <View className="flex-1" style={{ minWidth: '45%' }}>
            <Card className="p-3">
              <View className="flex-row items-center gap-1 mb-1">
                <Text className="text-xs text-secondary">Cambio</Text>
                <TrendIcon size={12} color={trendColor} />
              </View>
              <Text className="text-lg font-bold" style={{ color: trendColor }}>
                {stats.change > 0 ? '+' : ''}{stats.change} kg
              </Text>
            </Card>
          </View>
          <View className="flex-1" style={{ minWidth: '45%' }}>
            <Card className="p-3">
              <Text className="text-xs text-secondary mb-1">Mínimo</Text>
              <Text className="text-lg font-bold" style={{ color: colors.success }}>
                {stats.min} kg
              </Text>
            </Card>
          </View>
          <View className="flex-1" style={{ minWidth: '45%' }}>
            <Card className="p-3">
              <Text className="text-xs text-secondary mb-1">Máximo</Text>
              <Text className="text-lg font-bold" style={{ color: colors.warning }}>
                {stats.max} kg
              </Text>
            </Card>
          </View>
        </View>
      )}

      {/* Chart */}
      {records && records.length >= 2 && (
        <Card className="p-3 mb-4">
          <BodyWeightChart records={records} />
        </Card>
      )}

      {/* Add Button */}
      <View className="mb-4">
        <Button onPress={() => setShowModal(true)}>Registrar peso</Button>
      </View>

      <Text className="text-lg font-bold text-primary mb-3">Historial</Text>
    </View>
  )

  return (
    <View className="flex-1">
      <FlatList
        data={records || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRecord}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text className="text-secondary text-center py-8">
            Sin registros. Empieza registrando tu peso actual.
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
        title="Eliminar registro"
        message="¿Eliminar este registro de peso?"
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setRecordToDelete(null)}
      />
    </View>
  )
}

export default function BodyMetricsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('peso')

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title="Registro Corporal" onBack={() => navigation.goBack()} />

      {/* Tabs */}
      <View
        className="flex-row mx-4 mb-4 p-1 rounded-lg"
        style={{ backgroundColor: colors.bgTertiary }}
      >
        <Pressable
          onPress={() => setActiveTab('peso')}
          className="flex-1 py-2 px-4 rounded-md items-center"
          style={{
            backgroundColor: activeTab === 'peso' ? colors.bgSecondary : 'transparent',
          }}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: activeTab === 'peso' ? colors.textPrimary : colors.textSecondary }}
          >
            Peso
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('medidas')}
          className="flex-1 py-2 px-4 rounded-md items-center"
          style={{
            backgroundColor: activeTab === 'medidas' ? colors.bgSecondary : 'transparent',
          }}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: activeTab === 'medidas' ? colors.textPrimary : colors.textSecondary }}
          >
            Medidas
          </Text>
        </Pressable>
      </View>

      {activeTab === 'peso' && <WeightSection />}
      {activeTab === 'medidas' && <MeasurementSection />}

      <ActiveSessionBanner />
    </SafeAreaView>
  )
}
