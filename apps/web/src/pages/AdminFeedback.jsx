import { useState, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bug, Lightbulb, Check, RotateCcw, Trash2 } from 'lucide-react'
import { useIsAdmin } from '../hooks/useAuth.js'
import {
  useAllFeedback,
  useSetFeedbackResolved,
  useDeleteFeedback,
  formatFullDate,
  getFeedbackCounts,
  filterFeedback,
} from '@gym/shared'
import { LoadingSpinner, ErrorMessage, PageHeader, ConfirmModal } from '../components/ui/index.js'
import { colors } from '../lib/styles.js'

const TYPE_META = {
  bug: { Icon: Bug, color: colors.danger, bg: colors.dangerBg, labelKey: 'common:admin.feedbackTypeBug' },
  suggestion: { Icon: Lightbulb, color: colors.warning, bg: colors.warningBg, labelKey: 'common:admin.feedbackTypeSuggestion' },
}

function FilterPill({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
      style={{
        backgroundColor: active ? colors.success : 'transparent',
        color: active ? colors.bgPrimary : colors.textMuted,
      }}
    >
      {label}
      {typeof count === 'number' && (
        <span
          className="px-1.5 rounded-md"
          style={{ backgroundColor: colors.bgTertiary, color: colors.textMuted, fontSize: 11 }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function FeedbackRow({ item, onToggleResolved, onDelete, isPending }) {
  const { t } = useTranslation()
  const meta = TYPE_META[item.type] || TYPE_META.suggestion
  const Icon = meta.Icon
  const isResolved = !!item.resolved_at
  const platformLabel = item.platform === 'web'
    ? t('common:admin.feedbackPlatformWeb')
    : item.platform === 'native'
      ? t('common:admin.feedbackPlatformNative')
      : null

  return (
    <div
      className="rounded-xl"
      style={{
        backgroundColor: colors.bgSecondary,
        border: `1px solid ${colors.border}`,
        padding: '14px 16px',
        opacity: isResolved ? 0.65 : 1,
      }}
    >
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold"
            style={{ backgroundColor: meta.bg, color: meta.color }}
          >
            <Icon size={12} />
            {t(meta.labelKey)}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-md font-semibold"
            style={{
              backgroundColor: isResolved ? colors.bgTertiary : colors.successBg,
              color: isResolved ? colors.textMuted : colors.success,
            }}
          >
            {isResolved ? t('common:admin.feedbackStatusResolved') : t('common:admin.feedbackStatusPending')}
          </span>
          {platformLabel && (
            <span
              className="text-xs px-2 py-0.5 rounded-md"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textMuted }}
            >
              {platformLabel}
            </span>
          )}
          {item.app_version && (
            <span className="text-xs" style={{ color: colors.textMuted }}>
              {t('common:admin.feedbackVersion', { version: item.app_version })}
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: colors.textMuted, whiteSpace: 'nowrap' }}>
          {formatFullDate(item.created_at)}
        </span>
      </div>

      <p style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
        {item.user_email || item.user_id}
      </p>
      <p style={{ color: colors.textPrimary, fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.45, marginBottom: 12 }}>
        {item.message}
      </p>

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => onToggleResolved(item)}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{
            backgroundColor: colors.bgTertiary,
            color: colors.textSecondary,
            opacity: isPending ? 0.5 : 1,
          }}
        >
          {isResolved ? <RotateCcw size={12} /> : <Check size={12} />}
          {isResolved ? t('common:admin.feedbackReopen') : t('common:admin.feedbackResolve')}
        </button>
        <button
          onClick={() => onDelete(item)}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{
            backgroundColor: colors.dangerBg,
            color: colors.danger,
            opacity: isPending ? 0.5 : 1,
          }}
        >
          <Trash2 size={12} />
          {t('common:admin.feedbackDelete')}
        </button>
      </div>
    </div>
  )
}

function AdminFeedback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAdmin, isLoading: isLoadingAdmin } = useIsAdmin()
  const { data: feedback, isLoading, error } = useAllFeedback()
  const setResolved = useSetFeedbackResolved()
  const deleteFeedback = useDeleteFeedback()
  const [filter, setFilter] = useState('pending')
  const [pendingDelete, setPendingDelete] = useState(null)

  const counts = useMemo(() => getFeedbackCounts(feedback), [feedback])
  const filtered = useMemo(() => filterFeedback(feedback, filter), [feedback, filter])

  const handleToggleResolved = (item) => {
    setResolved.mutate({ id: item.id, resolved: !item.resolved_at })
  }

  const handleDeleteConfirm = () => {
    if (!pendingDelete) return
    deleteFeedback.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
    })
  }

  if (isLoadingAdmin) return <LoadingSpinner />
  if (!isAdmin) return <Navigate to="/" replace />
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const isMutating = setResolved.isPending || deleteFeedback.isPending
  const emptyMessage = filter === 'pending'
    ? t('common:admin.feedbackEmptyPending')
    : t('common:admin.feedbackEmpty')

  return (
    <div className="px-6 pt-4 pb-20 max-w-2xl mx-auto">
      <PageHeader title={t('common:admin.feedbackTitle')} onBack={() => navigate(-1)} />

      <div className="flex rounded-lg mb-4" style={{ backgroundColor: colors.bgTertiary, padding: 4, alignSelf: 'flex-start', width: 'fit-content' }}>
        <FilterPill
          label={t('common:admin.feedbackFilterPending')}
          active={filter === 'pending'}
          onClick={() => setFilter('pending')}
          count={counts.pending}
        />
        <FilterPill
          label={t('common:admin.feedbackFilterAll')}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          count={counts.all}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(item => (
          <FeedbackRow
            key={item.id}
            item={item}
            onToggleResolved={handleToggleResolved}
            onDelete={setPendingDelete}
            isPending={isMutating}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-8" style={{ color: colors.textMuted, fontSize: 13 }}>
          {emptyMessage}
        </p>
      )}

      <ConfirmModal
        isOpen={!!pendingDelete}
        title={t('common:admin.feedbackDeleteTitle')}
        message={t('common:admin.feedbackDeleteMessage')}
        confirmText={t('common:admin.feedbackDelete')}
        isLoading={deleteFeedback.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

export default AdminFeedback
