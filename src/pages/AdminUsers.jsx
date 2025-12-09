import { Navigate } from 'react-router-dom'
import { useIsAdmin } from '../hooks/useAuth.js'
import { useAllUsers, useUpdateUserSetting } from '../hooks/useAdmin.js'
import { LoadingSpinner, ErrorMessage, Card, PageHeader } from '../components/ui/index.js'
import { formatFullDate } from '../lib/dateUtils.js'
import { colors } from '../lib/styles.js'

const FEATURE_FLAGS = [
  { key: 'can_upload_video', label: 'Subir videos', description: 'Permite subir videos de ejercicios' },
  { key: 'is_admin', label: 'Administrador', description: 'Acceso al panel de administración' },
]

function FeatureToggle({ userId, settingKey, label, description, currentValue, onToggle, isUpdating }) {
  const isEnabled = currentValue === 'true'

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium" style={{ color: colors.textPrimary }}>{label}</div>
        <div className="text-xs" style={{ color: colors.textSecondary }}>{description}</div>
      </div>
      <button
        onClick={() => onToggle(userId, settingKey, isEnabled ? null : 'true')}
        disabled={isUpdating}
        className="relative w-11 h-6 rounded-full transition-colors disabled:opacity-50"
        style={{ backgroundColor: isEnabled ? colors.success : colors.border }}
      >
        <span
          className="absolute top-1 left-1 w-4 h-4 rounded-full transition-transform"
          style={{
            backgroundColor: colors.textPrimary,
            transform: isEnabled ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </button>
    </div>
  )
}

function UserCard({ user, onToggleSetting, isUpdating }) {
  return (
    <Card className="p-4">
      <div className="mb-3">
        <div className="font-medium" style={{ color: colors.textPrimary }}>{user.email}</div>
        <div className="text-xs" style={{ color: colors.textSecondary }}>
          Registrado: {formatFullDate(user.created_at)}
        </div>
      </div>
      <div className="space-y-1" style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '12px' }}>
        {FEATURE_FLAGS.map(flag => (
          <FeatureToggle
            key={flag.key}
            userId={user.id}
            settingKey={flag.key}
            label={flag.label}
            description={flag.description}
            currentValue={user.settings[flag.key]}
            onToggle={onToggleSetting}
            isUpdating={isUpdating}
          />
        ))}
      </div>
    </Card>
  )
}

function AdminUsers() {
  const { isAdmin, isLoading: isLoadingAdmin } = useIsAdmin()
  const { data: users, isLoading, error } = useAllUsers()
  const updateSetting = useUpdateUserSetting()

  const handleToggleSetting = (userId, key, value) => {
    updateSetting.mutate({ userId, key, value })
  }

  if (isLoadingAdmin) return <LoadingSpinner />
  if (!isAdmin) return <Navigate to="/" replace />

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <PageHeader title="Gestión de usuarios" backTo="/" />

      <div className="space-y-3">
        {users?.map(user => (
          <UserCard
            key={user.id}
            user={user}
            onToggleSetting={handleToggleSetting}
            isUpdating={updateSetting.isPending}
          />
        ))}
      </div>

      {users?.length === 0 && (
        <div className="text-center py-8" style={{ color: colors.textSecondary }}>
          No hay usuarios registrados
        </div>
      )}
    </div>
  )
}

export default AdminUsers
