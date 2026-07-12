import { useState } from 'react'
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Check, Plus, Dumbbell } from 'lucide-react-native'
import { useGyms, useCreateGym, getGymDisplayName } from '@gym/shared'
import { Modal, LoadingSpinner } from '../ui'
import { colors } from '../../lib/styles'

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
export default function GymSelector({ isOpen, onClose, selectedGymId, onSelect, allowAllGyms = false }) {
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom">
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 }}>
          {t('common:gym.select')}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ padding: 24 }}>
          <LoadingSpinner fullScreen={false} />
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
          {allowAllGyms && (
            <Pressable onPress={() => handleSelect(null)} style={rowStyle} className="active:opacity-80">
              <Dumbbell size={18} color={colors.textMuted} />
              <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 14 }}>
                {t('common:gym.allGyms')}
              </Text>
              {selectedGymId == null && <Check size={18} color={colors.success} />}
            </Pressable>
          )}

          {gyms.map((gym) => {
            const isSelected = String(gym.id) === String(selectedGymId)
            return (
              <Pressable key={gym.id} onPress={() => handleSelect(gym.id)} style={rowStyle} className="active:opacity-80">
                <Dumbbell size={18} color={colors.textMuted} />
                <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 14 }} numberOfLines={1}>
                  {getGymName(gym)}
                </Text>
                {isSelected && <Check size={18} color={colors.success} />}
              </Pressable>
            )
          })}

          {gyms.length === 0 && !showAddForm && (
            <Text style={{ paddingHorizontal: 16, paddingVertical: 24, textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
              {t('common:gym.empty')}
            </Text>
          )}

          {showAddForm ? (
            <View style={{ padding: 16, gap: 12 }}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={handleCreate}
                placeholder={t('common:gym.namePlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoFocus
                returnKeyType="done"
                style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: colors.border }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => { setShowAddForm(false); setNewName('') }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: colors.bgTertiary }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>{t('common:buttons.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
                  disabled={!newName.trim() || createGym.isPending}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: colors.success, opacity: !newName.trim() || createGym.isPending ? 0.4 : 1 }}
                >
                  <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>
                    {createGym.isPending ? t('common:buttons.loading') : t('common:buttons.save')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowAddForm(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}
              className="active:opacity-80"
            >
              <Plus size={18} color={colors.success} />
              <Text style={{ flex: 1, color: colors.success, fontSize: 14, fontWeight: '600' }}>
                {t('common:gym.add')}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </Modal>
  )
}
