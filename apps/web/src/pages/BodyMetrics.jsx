import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import { useBodyWeightHistory, useRecordBodyWeight, useUpdateBodyWeight, useDeleteBodyWeight } from '../hooks/useBodyWeight.js'
import { LoadingSpinner, ErrorMessage } from '../components/ui/index.js'
import { BodyWeightChart, BodyWeightModal, MeasurementSection } from '../components/BodyWeight/index.js'
import { calculateBodyWeightStats, formatShortDate, formatTime } from '@gym/shared'
import { colors } from '../lib/styles.js'

function BodyMetrics() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('peso')

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      {/* Tabs */}
      <div className="relative flex p-1 rounded-xl mb-5" style={{ backgroundColor: colors.bgTertiary }}>
        <div
          className="absolute top-1 bottom-1 rounded-lg"
          style={{
            width: 'calc(50% - 4px)',
            backgroundColor: colors.success,
            transform: activeTab === 'peso' ? 'translateX(0)' : 'translateX(calc(100% + 4px))',
            transition: 'transform 0.25s ease',
            left: 2,
          }}
        />
        <button onClick={() => setActiveTab('peso')}
          className="relative flex-1 py-1.5 px-4 rounded-lg text-sm font-semibold z-10"
          style={{ color: activeTab === 'peso' ? colors.bgPrimary : colors.textSecondary, background: 'none', border: 'none', transition: 'color 0.2s' }}>
          {t('body:weight.tab')}
        </button>
        <button onClick={() => setActiveTab('medidas')}
          className="relative flex-1 py-1.5 px-4 rounded-lg text-sm font-semibold z-10"
          style={{ color: activeTab === 'medidas' ? colors.bgPrimary : colors.textSecondary, background: 'none', border: 'none', transition: 'color 0.2s' }}>
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

  const handleDelete = (id) => {
    if (confirm(t('body:weight.deleteConfirm'))) {
      deleteMutation.mutate(id)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingRecord(null)
  }

  return (
    <>
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
            <div className="text-xs mb-0.5" style={{ color: colors.textSecondary }}>{t('body:weight.current')}</div>
            <div className="text-lg font-bold" style={{ color: colors.textPrimary }}>{stats.current} kg</div>
          </div>
          <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
            <div className="text-xs mb-0.5" style={{ color: colors.textSecondary }}>{t('body:weight.change')}</div>
            <div className="text-lg font-bold" style={{ color: colors.success }}>
              {stats.change > 0 ? '+' : ''}{stats.change} kg
            </div>
          </div>
          <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
            <div className="text-xs mb-0.5" style={{ color: colors.textSecondary }}>{t('body:weight.lowest')}</div>
            <div className="text-lg font-bold" style={{ color: colors.textPrimary }}>{stats.min} kg</div>
          </div>
          <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
            <div className="text-xs mb-0.5" style={{ color: colors.textSecondary }}>{t('body:weight.highest')}</div>
            <div className="text-lg font-bold" style={{ color: colors.textPrimary }}>{stats.max} kg</div>
          </div>
        </div>
      )}

      {/* Chart */}
      {records && records.length >= 2 && (
        <div className="p-3 rounded-xl mb-4" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
          <BodyWeightChart records={records} unit="kg" />
        </div>
      )}

      {/* Record Button */}
      <button onClick={() => setShowModal(true)}
        className="w-full py-2.5 rounded-xl text-sm font-semibold mb-6"
        style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
        {t('body:weight.record')}
      </button>

      {/* History */}
      <h2 className="text-base font-bold mb-3" style={{ color: colors.textPrimary }}>{t('body:weight.history')}</h2>
      {!records || records.length === 0 ? (
        <p className="text-center py-8 text-sm" style={{ color: colors.textSecondary }}>
          {t('body:weight.noRecords')}
        </p>
      ) : (
        <div className="space-y-2">
          {records.map(record => (
            <div key={record.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold" style={{ color: colors.textPrimary }}>{record.weight} kg</span>
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
