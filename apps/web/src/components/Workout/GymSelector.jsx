import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Plus, Dumbbell } from 'lucide-react'
import { useGyms, useCreateGym, getGymDisplayName } from '@gym/shared'
import { Modal, LoadingSpinner } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

/**
 * Reusable gym picker. Lists the user's gyms, lets them pick one and add a new
 * one inline. Optionally exposes an "all gyms" entry (for chart filters).
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string|number|null} selectedGymId - currently selected gym id
 * @param {function} onSelect - called with the chosen gym id (null when "all gyms")
 * @param {boolean} allowAllGyms - show an "all gyms" option at the top
 */
function GymSelector({ isOpen, onClose, selectedGymId, onSelect, allowAllGyms = false }) {
  const { t } = useTranslation()
  const { data: gyms = [], isLoading } = useGyms()
  const createGym = useCreateGym()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')

  const getGymName = (gym) => getGymDisplayName(gym, t('common:gym.defaultName'))

  const handleSelect = (gymId) => {
    onSelect(gymId)
    onClose()
  }

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed || createGym.isPending) return
    createGym.mutate(
      { name: trimmed },
      {
        onSuccess: (created) => {
          setNewName('')
          setShowAddForm(false)
          if (created?.id != null) handleSelect(created.id)
        },
      }
    )
  }

  const rowStyle = {
    borderBottom: `1px solid ${colors.border}`,
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom" maxWidth="max-w-lg" noBorder>
      <div className="p-4 shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <h3 className="font-bold" style={{ color: colors.textPrimary }}>
          {t('common:gym.select')}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {allowAllGyms && (
              <button
                onClick={() => handleSelect(null)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:opacity-80 transition-opacity"
                style={rowStyle}
              >
                <Dumbbell size={18} style={{ color: colors.textMuted }} className="shrink-0" />
                <span className="flex-1 text-left" style={{ color: colors.textPrimary, fontSize: 14 }}>
                  {t('common:gym.allGyms')}
                </span>
                {selectedGymId == null && <Check size={18} style={{ color: colors.success }} className="shrink-0" />}
              </button>
            )}

            {gyms.map((gym) => {
              const isSelected = String(gym.id) === String(selectedGymId)
              return (
                <button
                  key={gym.id}
                  onClick={() => handleSelect(gym.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:opacity-80 transition-opacity"
                  style={rowStyle}
                >
                  <Dumbbell size={18} style={{ color: colors.textMuted }} className="shrink-0" />
                  <span className="flex-1 text-left truncate" style={{ color: colors.textPrimary, fontSize: 14 }}>
                    {getGymName(gym)}
                  </span>
                  {isSelected && <Check size={18} style={{ color: colors.success }} className="shrink-0" />}
                </button>
              )
            })}

            {gyms.length === 0 && !showAddForm && (
              <p className="px-4 py-6 text-center" style={{ color: colors.textMuted, fontSize: 13 }}>
                {t('common:gym.empty')}
              </p>
            )}

            {showAddForm ? (
              <div className="p-4 flex flex-col gap-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder={t('common:gym.namePlaceholder')}
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowAddForm(false); setNewName('') }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
                  >
                    {t('common:buttons.cancel')}
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || createGym.isPending}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
                    style={{ backgroundColor: colors.success, color: colors.bgPrimary }}
                  >
                    {createGym.isPending ? t('common:buttons.loading') : t('common:buttons.save')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:opacity-80 transition-opacity"
              >
                <Plus size={18} style={{ color: colors.success }} className="shrink-0" />
                <span className="flex-1 text-left" style={{ color: colors.success, fontSize: 14, fontWeight: 600 }}>
                  {t('common:gym.add')}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

export default GymSelector
