import { View, Text, Pressable, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useIsAdmin } from '../hooks/useAuth'
import { useAllUsers, useUpdateUserSetting } from '../hooks/useAdmin'
import { LoadingSpinner, ErrorMessage, PageHeader } from '../components/ui'
import { formatFullDate } from '@gym/shared'
import { colors } from '../lib/styles'

const FEATURE_FLAGS = [
  { key: 'can_upload_video', labelKey: 'common:preferences.showVideoUpload' },
  { key: 'is_admin', labelKey: 'common:nav.admin' },
]

function CustomToggle({ checked, onChange, disabled }) {
  return (
    <Pressable onPress={() => !disabled && onChange(!checked)} style={{ opacity: disabled ? 0.5 : 1 }}>
      <View style={{
        width: 48, height: 28, borderRadius: 14,
        backgroundColor: checked ? colors.success : colors.border,
      }}>
        <View style={{
          width: 20, height: 20, borderRadius: 10,
          backgroundColor: colors.bgPrimary,
          position: 'absolute', top: 4,
          left: checked ? 24 : 4,
        }} />
      </View>
    </Pressable>
  )
}

function UserRow({ user, onToggleSetting, isUpdating }) {
  const { t } = useTranslation()
  return (
    <View style={{
      backgroundColor: colors.bgSecondary, borderRadius: 12,
      borderWidth: 1, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 24,
    }}>
      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 2 }}>{user.email}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 10 }}>
        {t('common:admin.registered')}: {formatFullDate(user.created_at)}
      </Text>
      {FEATURE_FLAGS.map(flag => {
        const isEnabled = user.settings[flag.key] === 'true'
        return (
          <View key={flag.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{t(flag.labelKey)}</Text>
            <CustomToggle
              checked={isEnabled}
              onChange={() => onToggleSetting(user.id, flag.key, isEnabled ? null : 'true')}
              disabled={isUpdating}
            />
          </View>
        )
      })}
    </View>
  )
}

export default function AdminUsersScreen({ navigation }) {
  const { t } = useTranslation()
  const { isAdmin, isLoading: isLoadingAdmin } = useIsAdmin()
  const { data: users, isLoading, error } = useAllUsers()
  const updateSetting = useUpdateUserSetting()

  const handleToggleSetting = (userId, key, value) => {
    updateSetting.mutate({ userId, key, value })
  }

  if (isLoadingAdmin) return <LoadingSpinner />
  if (!isAdmin) { navigation.goBack(); return null }
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title={t('common:nav.admin')} onBack={() => navigation.goBack()} />

      <FlatList
        data={users || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserRow user={item} onToggleSetting={handleToggleSetting} isUpdating={updateSetting.isPending} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 32, fontSize: 13 }}>
            {t('common:admin.noUsers')}
          </Text>
        }
      />
    </SafeAreaView>
  )
}
