import { useState, useMemo } from 'react'
import { View, Text, FlatList, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Bug, Lightbulb, Check, RotateCcw, Trash2 } from 'lucide-react-native'
import { useIsAdmin } from '../hooks/useAuth'
import {
  useAllFeedback,
  useSetFeedbackResolved,
  useDeleteFeedback,
  formatFullDate,
  getFeedbackCounts,
  filterFeedback,
} from '@gym/shared'
import { LoadingSpinner, ErrorMessage, PageHeader, ConfirmModal } from '../components/ui'
import { colors } from '../lib/styles'

const TYPE_META = {
  bug: { Icon: Bug, color: colors.danger, bg: colors.dangerBg, labelKey: 'common:admin.feedbackTypeBug' },
  suggestion: { Icon: Lightbulb, color: colors.warning, bg: colors.warningBg, labelKey: 'common:admin.feedbackTypeSuggestion' },
}

function FilterPill({ label, active, onPress, count }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: active ? colors.success : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? colors.bgPrimary : colors.textMuted }}>
        {label}
      </Text>
      {typeof count === 'number' && (
        <View style={{
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: 6,
          backgroundColor: colors.bgTertiary,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted }}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

function ActionButton({ Icon, label, onPress, color, bg, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: bg,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon size={12} color={color} />
      <Text style={{ fontSize: 12, fontWeight: '600', color }}>{label}</Text>
    </Pressable>
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
    <View style={{
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginHorizontal: 24,
      opacity: isResolved ? 0.65 : 1,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: meta.bg }}>
            <Icon size={12} color={meta.color} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: meta.color }}>{t(meta.labelKey)}</Text>
          </View>
          <View style={{
            paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
            backgroundColor: isResolved ? colors.bgTertiary : colors.successBg,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: isResolved ? colors.textMuted : colors.success }}>
              {isResolved ? t('common:admin.feedbackStatusResolved') : t('common:admin.feedbackStatusPending')}
            </Text>
          </View>
          {platformLabel && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.bgTertiary }}>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>{platformLabel}</Text>
            </View>
          )}
          {item.app_version && (
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              {t('common:admin.feedbackVersion', { version: item.app_version })}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>{formatFullDate(item.created_at)}</Text>
      </View>

      <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>
        {item.user_email || item.user_id}
      </Text>
      <Text style={{ color: colors.textPrimary, fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
        {item.message}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
        <ActionButton
          Icon={isResolved ? RotateCcw : Check}
          label={isResolved ? t('common:admin.feedbackReopen') : t('common:admin.feedbackResolve')}
          onPress={() => onToggleResolved(item)}
          color={colors.textSecondary}
          bg={colors.bgTertiary}
          disabled={isPending}
        />
        <ActionButton
          Icon={Trash2}
          label={t('common:admin.feedbackDelete')}
          onPress={() => onDelete(item)}
          color={colors.danger}
          bg={colors.dangerBg}
          disabled={isPending}
        />
      </View>
    </View>
  )
}

export default function AdminFeedbackScreen({ navigation }) {
  const { t } = useTranslation()
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
  if (!isAdmin) { navigation.goBack(); return null }
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const isMutating = setResolved.isPending || deleteFeedback.isPending
  const emptyMessage = filter === 'pending'
    ? t('common:admin.feedbackEmptyPending')
    : t('common:admin.feedbackEmpty')

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title={t('common:admin.feedbackTitle')} onBack={() => navigation.goBack()} />

      <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.bgTertiary,
          borderRadius: 8,
          padding: 4,
          alignSelf: 'flex-start',
        }}>
          <FilterPill
            label={t('common:admin.feedbackFilterPending')}
            active={filter === 'pending'}
            onPress={() => setFilter('pending')}
            count={counts.pending}
          />
          <FilterPill
            label={t('common:admin.feedbackFilterAll')}
            active={filter === 'all'}
            onPress={() => setFilter('all')}
            count={counts.all}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <FeedbackRow
            item={item}
            onToggleResolved={handleToggleResolved}
            onDelete={setPendingDelete}
            isPending={isMutating}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 32, fontSize: 13 }}>
            {emptyMessage}
          </Text>
        }
      />

      <ConfirmModal
        isOpen={!!pendingDelete}
        title={t('common:admin.feedbackDeleteTitle')}
        message={t('common:admin.feedbackDeleteMessage')}
        confirmText={t('common:admin.feedbackDelete')}
        isLoading={deleteFeedback.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />
    </SafeAreaView>
  )
}
