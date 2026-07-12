import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Dumbbell } from 'lucide-react'
import { useGyms, useCreateGym, useRenameGym, useDeleteGym, useGymSessionCount, getGymDisplayName } from '@gym/shared'
import { LoadingSpinner, PageHeader, ConfirmModal, Modal } from '../components/ui/index.js'
import { colors } from '../lib/styles.js'

function getGymName(gym, t) {
  return getGymDisplayName(gym, t('common:gym.defaultName'))
}

function GymRow({ gym, onRename, onDelete }) {
  const { t } = useTranslation()
  const { data: sessionCount } = useGymSessionCount(gym.id)
  const hasSessions = (sessionCount ?? 0) > 0

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: `1px solid ${colors.border}` }}
    >
      <Dumbbell size={18} style={{ color: colors.textMuted }} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 500 }}>
          {getGymName(gym, t)}
        </p>
        {sessionCount != null && (
          <p style={{ color: colors.textMuted, fontSize: 12 }}>
            {t('common:gym.sessionCount', { count: sessionCount })}
          </p>
        )}
      </div>
      <button
        onClick={() => onRename(gym)}
        className="p-2 rounded-lg hover:opacity-80 transition-opacity shrink-0"
        title={t('common:gym.rename')}
      >
        <Pencil size={16} style={{ color: colors.textSecondary }} />
      </button>
      <button
        onClick={() => !hasSessions && onDelete(gym)}
        disabled={hasSessions}
        className="p-2 rounded-lg hover:opacity-80 transition-opacity shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
        title={hasSessions ? t('common:gym.cannotDeleteWithSessions') : t('common:gym.delete')}
      >
        <Trash2 size={16} style={{ color: colors.danger }} />
      </button>
    </div>
  )
}

function GymFormModal({ isOpen, onClose, onSubmit, isPending, initialName = '', title }) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)

  // Sincroniza el valor cuando cambia el gym que se está editando
  const [lastInitial, setLastInitial] = useState(initialName)
  if (initialName !== lastInitial) {
    setLastInitial(initialName)
    setName(initialName)
  }

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed || isPending) return
    onSubmit(trimmed)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom" maxWidth="max-w-lg">
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700 }}>{title}</h3>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
            {t('common:gym.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={t('common:gym.namePlaceholder')}
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || isPending}
          className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ backgroundColor: colors.success, color: colors.bgPrimary }}
        >
          {isPending ? t('common:buttons.loading') : t('common:buttons.save')}
        </button>
      </div>
    </Modal>
  )
}

function Gyms() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: gyms = [], isLoading } = useGyms()
  const createGym = useCreateGym()
  const renameGym = useRenameGym()
  const deleteGym = useDeleteGym()

  const [showAdd, setShowAdd] = useState(false)
  const [gymToRename, setGymToRename] = useState(null)
  const [gymToDelete, setGymToDelete] = useState(null)

  const handleCreate = (name) => {
    createGym.mutate({ name }, { onSuccess: () => setShowAdd(false) })
  }

  const handleRename = (name) => {
    if (!gymToRename) return
    renameGym.mutate({ id: gymToRename.id, name }, { onSuccess: () => setGymToRename(null) })
  }

  const handleDelete = () => {
    if (!gymToDelete) return
    deleteGym.mutate(gymToDelete.id, { onSuccess: () => setGymToDelete(null) })
  }

  return (
    <div className="px-6 pt-4 pb-20 max-w-2xl mx-auto">
      <PageHeader
        title={t('common:gym.title')}
        onBack={() => navigate(-1)}
        rightAction={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}
          >
            <Plus size={16} />
            {t('common:gym.add')}
          </button>
        }
      />

      <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
        {t('common:gym.manageDescription')}
      </p>

      {isLoading ? (
        <LoadingSpinner />
      ) : gyms.length === 0 ? (
        <p className="text-center py-10" style={{ color: colors.textMuted, fontSize: 14 }}>
          {t('common:gym.empty')}
        </p>
      ) : (
        <div
          className="rounded-xl"
          style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, overflow: 'hidden' }}
        >
          {gyms.map((gym) => (
            <GymRow
              key={gym.id}
              gym={gym}
              onRename={setGymToRename}
              onDelete={setGymToDelete}
            />
          ))}
        </div>
      )}

      <GymFormModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={handleCreate}
        isPending={createGym.isPending}
        title={t('common:gym.add')}
      />

      <GymFormModal
        isOpen={!!gymToRename}
        onClose={() => setGymToRename(null)}
        onSubmit={handleRename}
        isPending={renameGym.isPending}
        initialName={gymToRename ? getGymName(gymToRename, t) : ''}
        title={t('common:gym.rename')}
      />

      <ConfirmModal
        isOpen={!!gymToDelete}
        title={t('common:gym.delete')}
        message={t('common:gym.deleteConfirm', { name: gymToDelete ? getGymName(gymToDelete, t) : '' })}
        confirmText={t('common:buttons.delete')}
        loadingText={t('common:buttons.loading')}
        isLoading={deleteGym.isPending}
        onConfirm={handleDelete}
        onCancel={() => setGymToDelete(null)}
      />
    </div>
  )
}

export default Gyms
