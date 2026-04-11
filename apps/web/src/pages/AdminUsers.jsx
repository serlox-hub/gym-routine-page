import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useIsAdmin } from '../hooks/useAuth.js'
import { useAllUsers, useUpdateUserSetting } from '../hooks/useAdmin.js'
import { LoadingSpinner, ErrorMessage, PageHeader } from '../components/ui/index.js'
import { formatFullDate } from '@gym/shared'
import { colors } from '../lib/styles.js'

function CustomToggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className="shrink-0"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <div
        className="w-12 h-7 rounded-full relative transition-colors"
        style={{ backgroundColor: checked ? colors.success : colors.border }}
      >
        <div
          className="w-5 h-5 rounded-full absolute top-1 transition-all"
          style={{ backgroundColor: colors.bgPrimary, left: checked ? 24 : 4 }}
        />
      </div>
    </button>
  )
}

function UserRow({ user, featureFlags, onToggleSetting, isUpdating }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, padding: '12px 16px' }}>
      <div className="flex items-center justify-between mb-2">
        <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>{user.email}</span>
      </div>
      <p style={{ color: colors.textMuted, fontSize: 11, marginBottom: 10 }}>
        {t('common:admin.registered')}: {formatFullDate(user.created_at)}
      </p>
      {featureFlags.map(flag => {
        const isEnabled = user.settings[flag.key] === 'true'
        return (
          <div key={flag.key} className="flex items-center justify-between py-1.5">
            <span style={{ color: colors.textPrimary, fontSize: 13 }}>{flag.label}</span>
            <CustomToggle
              checked={isEnabled}
              onChange={() => onToggleSetting(user.id, flag.key, isEnabled ? null : 'true')}
              disabled={isUpdating}
            />
          </div>
        )
      })}
    </div>
  )
}

function AdminUsers() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: isLoadingAdmin } = useIsAdmin()
  const { data: users, isLoading, error } = useAllUsers()
  const updateSetting = useUpdateUserSetting()

  const FEATURE_FLAGS = [
    { key: 'can_upload_video', label: t('common:preferences.showVideoUpload') },
    { key: 'is_admin', label: t('common:nav.admin') },
  ]

  const handleToggleSetting = (userId, key, value) => {
    updateSetting.mutate({ userId, key, value })
  }

  if (isLoadingAdmin) return <LoadingSpinner />
  if (!isAdmin) return <Navigate to="/" replace />
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  return (
    <div className="px-6 pt-4 pb-20 max-w-2xl mx-auto">
      <PageHeader title={t('common:nav.admin')} backTo="/" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users?.map(user => (
          <UserRow
            key={user.id}
            user={user}
            featureFlags={FEATURE_FLAGS}
            onToggleSetting={handleToggleSetting}
            isUpdating={updateSetting.isPending}
          />
        ))}
      </div>

      {users?.length === 0 && (
        <p className="text-center py-8" style={{ color: colors.textMuted, fontSize: 13 }}>
          {t('common:admin.noUsers')}
        </p>
      )}
    </div>
  )
}

export default AdminUsers
