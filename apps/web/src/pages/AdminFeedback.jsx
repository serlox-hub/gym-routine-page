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
    <button onClick={onClick} className="relative min-h-11 flex items-center">
      <span
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
      </span>
    </button>
  )
}

// The action is a 44px box around its 28px pill.
function ActionButton({ icon: Icon, label, onClick, disabled, color, backgroundColor }) {
  return (
    <button onClick={onClick} disabled={disabled} className="min-h-11 flex items-center">
      <span
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ backgroundColor, color, opacity: disabled ? 0.5 : 1 }}
      >
        <Icon size={12} />
        {label}
      </span>
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

      {/* -my-2: the 44px boxes take the 8px they add from the gap above and the card's padding below. */}
      <div className="flex gap-2 justify-end -my-2">
        <ActionButton
          icon={isResolved ? RotateCcw : Check}
          label={isResolved ? t('common:admin.feedbackReopen') : t('common:admin.feedbackResolve')}
          onClick={() => onToggleResolved(item)}
          disabled={isPending}
          color={colors.textSecondary}
          backgroundColor={colors.bgTertiary}
        />
        <ActionButton
          icon={Trash2}
          label={t('common:admin.feedbackDelete')}
          onClick={() => onDelete(item)}
          disabled={isPending}
          color={colors.danger}
          backgroundColor={colors.dangerBg}
        />
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

      {/* The pills are 44px boxes; the track (inset-y-1) is painted behind them at its old 36px. */}
      <div className="relative flex px-1 mb-4" style={{ width: 'fit-content' }}>
        <div className="absolute inset-x-0 inset-y-1 rounded-lg" style={{ backgroundColor: colors.bgTertiary }} />
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
