import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useBodyWeightHistory, useRecordBodyWeight, useUpdateBodyWeight, useDeleteBodyWeight } from '../hooks/useBodyWeight.js'
import { LoadingSpinner, ErrorMessage, Card, Button } from '../components/ui/index.js'
import { BodyWeightChart, BodyWeightModal, MeasurementSection } from '../components/BodyWeight/index.js'
import { calculateBodyWeightStats, calculateWeightTrend, formatShortDate, formatTime } from '@gym/shared'
import { colors } from '../lib/styles.js'

function BodyMetrics() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('peso')

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ backgroundColor: colors.bgTertiary }}>
        <button
          onClick={() => setActiveTab('peso')}
          className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === 'peso' ? colors.bgSecondary : 'transparent',
            color: activeTab === 'peso' ? colors.textPrimary : colors.textSecondary,
          }}
        >
          {t('body:weight.tab')}
        </button>
        <button
          onClick={() => setActiveTab('medidas')}
          className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === 'medidas' ? colors.bgSecondary : 'transparent',
            color: activeTab === 'medidas' ? colors.textPrimary : colors.textSecondary,
          }}
        >
          {t('body:measurements.title')}
        </button>
      </div>

      {activeTab === 'peso' && <WeightSection />}
      {activeTab === 'medidas' && <MeasurementSection />}
    </div>
  )
}

function WeightSection() {
  const { t } = useTranslation()
  const { data: records, isLoading, error } = useBodyWeightHistory()
  const recordMutation = useRecordBodyWeight()
  const updateMutation = useUpdateBodyWeight()
  const deleteMutation = useDeleteBodyWeight()

  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} />

  const stats = calculateBodyWeightStats(records)
  const trend = calculateWeightTrend(records)

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

  const handleDelete = (id) => {
    if (confirm(t('body:weight.deleteConfirm'))) {
      deleteMutation.mutate(id)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingRecord(null)
  }

  const TrendIcon = trend === 'increasing' ? TrendingUp : trend === 'decreasing' ? TrendingDown : Minus
  const trendColor = trend === 'increasing' ? colors.danger : trend === 'decreasing' ? colors.success : colors.textSecondary

  return (
    <>
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="p-3">
            <div className="text-xs text-secondary mb-1">{t('body:weight.current')}</div>
            <div className="text-lg font-bold" style={{ color: colors.accent }}>
              {stats.current} kg
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1 text-xs text-secondary mb-1">
              <span>{t('body:weight.change')}</span>
              <TrendIcon size={12} style={{ color: trendColor }} />
            </div>
            <div className="text-lg font-bold" style={{ color: trendColor }}>
              {stats.change > 0 ? '+' : ''}{stats.change} kg
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-secondary mb-1">{t('common:labels.worst')}</div>
            <div className="text-lg font-bold" style={{ color: colors.success }}>
              {stats.min} kg
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-secondary mb-1">{t('common:labels.best')}</div>
            <div className="text-lg font-bold" style={{ color: colors.warning }}>
              {stats.max} kg
            </div>
          </Card>
        </div>
      )}

      {/* Chart */}
      {records && records.length >= 2 && (
        <Card className="p-4 mb-6">
          <BodyWeightChart records={records} unit="kg" />
        </Card>
      )}

      {/* Action Button */}
      <div className="mb-6">
        <Button
          className="w-full flex items-center justify-center gap-2"
          onClick={() => setShowModal(true)}
        >
          {t('body:weight.record')}
        </Button>
      </div>

      {/* History */}
      <h2 className="text-lg font-bold mb-3">{t('body:weight.history')}</h2>
      {!records || records.length === 0 ? (
        <p className="text-center text-secondary py-8">
          {t('body:weight.noRecords')}
        </p>
      ) : (
        <div className="space-y-2">
          {records.map(record => (
            <Card key={record.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                      {record.weight} kg
                    </span>
                    <span className="text-xs" style={{ color: colors.textSecondary }}>
                      {formatShortDate(record.recorded_at)} · {formatTime(record.recorded_at)}
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
                    style={{ color: colors.danger }}
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

      {/* Modal */}
      <BodyWeightModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        record={editingRecord}
        isPending={recordMutation.isPending || updateMutation.isPending}
      />
    </>
  )
}

export default BodyMetrics
