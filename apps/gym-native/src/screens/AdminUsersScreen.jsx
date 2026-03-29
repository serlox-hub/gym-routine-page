import { View, Text, Switch, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useIsAdmin } from '../hooks/useAuth'
import { useAllUsers, useUpdateUserSetting } from '../hooks/useAdmin'
import { LoadingSpinner, ErrorMessage, Card, PageHeader } from '../components/ui'
import { formatFullDate } from '@gym/shared'
import { colors } from '../lib/styles'

const FEATURE_FLAGS = [
  { key: 'can_upload_video', labelKey: 'common:preferences.showVideoUpload', descriptionKey: 'common:preferences.showVideoUploadDescription' },
  { key: 'is_admin', labelKey: 'common:nav.admin', descriptionKey: 'common:nav.adminDescription' },
]

function FeatureToggle({ userId, settingKey, label, description, currentValue, onToggle, isUpdating }) {
  const isEnabled = currentValue === 'true'

  return (
    <View className="flex-row items-center justify-between py-2">
      <View className="flex-1 mr-3">
        <Text className="text-sm font-medium text-primary">{label}</Text>
        <Text className="text-xs text-secondary">{description}</Text>
      </View>
      <Switch
        value={isEnabled}
        onValueChange={() => onToggle(userId, settingKey, isEnabled ? null : 'true')}
        disabled={isUpdating}
        trackColor={{ false: colors.bgTertiary, true: colors.success }}
        thumbColor={colors.textPrimary}
      />
    </View>
  )
}

function UserCard({ user, onToggleSetting, isUpdating }) {
  const { t } = useTranslation()
  return (
    <Card className="p-4 mx-4">
      <View className="mb-3">
        <Text className="font-medium text-primary">{user.email}</Text>
        <Text className="text-xs text-secondary">
          {t('common:admin.registered')}: {formatFullDate(user.created_at)}
        </Text>
      </View>
      <View className="gap-1" style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
        {FEATURE_FLAGS.map(flag => (
          <FeatureToggle
            key={flag.key}
            userId={user.id}
            settingKey={flag.key}
            label={t(flag.labelKey)}
            description={t(flag.descriptionKey)}
            currentValue={user.settings[flag.key]}
            onToggle={onToggleSetting}
            isUpdating={isUpdating}
          />
        ))}
      </View>
    </Card>
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

  if (!isAdmin) {
    navigation.goBack()
    return null
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title={t('common:nav.admin')} onBack={() => navigation.goBack()} />

      <FlatList
        data={users || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserCard
            user={item}
            onToggleSetting={handleToggleSetting}
            isUpdating={updateSetting.isPending}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <Text className="text-secondary text-center py-8">
            {t('common:admin.noUsers')}
          </Text>
        }
      />
    </SafeAreaView>
  )
}
