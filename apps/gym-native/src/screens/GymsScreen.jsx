import { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Dumbbell, Pencil, Trash2, Plus } from 'lucide-react-native'
import {
  useGyms,
  useCreateGym,
  useRenameGym,
  useDeleteGym,
  useGymSessionCount,
  getNotifier,
  getGymDisplayName,
  getGymDeleteAction,
  GYM_DELETE_ACTION,
} from '@gym/shared'
import { LoadingSpinner, PageHeader, ConfirmModal, Modal, IconButton } from '../components/ui'
import { colors, design } from '../lib/styles'

function getGymName(gym, t) {
  return getGymDisplayName(gym, t('common:gym.defaultName'))
}

function GymRow({ gym, onRename, onDelete }) {
  const { t } = useTranslation()
  const { data: sessionCount, isError, refetch } = useGymSessionCount(gym.id)
  const deleteAction = getGymDeleteAction(sessionCount, isError)

  const handleDeletePress = () => {
    if (deleteAction === GYM_DELETE_ACTION.DELETE) return onDelete(gym)
    if (deleteAction === GYM_DELETE_ACTION.HAS_SESSIONS) {
      return getNotifier()?.show(t('common:gym.cannotDeleteWithSessions'), 'error')
    }
    getNotifier()?.show(t('common:gym.cannotDeleteUnknownSessions'), 'error')
    refetch()
  }

  // paddingVertical 8 and paddingRight 6: with the 44pt boxes the row keeps its height and the
  // icons stay put.
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: colors.bgSecondary, borderRadius: 12,
        borderWidth: 1, borderColor: colors.border,
        paddingVertical: 8, paddingLeft: 14, paddingRight: 6,
      }}
    >
      <Dumbbell size={18} color={colors.textMuted} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
          {getGymName(gym, t)}
        </Text>
        {sessionCount != null && (
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }}>
            {t('common:gym.sessionCount', { count: sessionCount })}
          </Text>
        )}
      </View>
      <IconButton icon={Pencil} iconSize={16} label={t('common:gym.rename')} onPress={() => onRename(gym)} />
      <IconButton
        icon={Trash2}
        iconSize={16}
        color={colors.danger}
        label={t('common:gym.delete')}
        loading={deleteAction === GYM_DELETE_ACTION.BUSY}
        blocked={deleteAction === GYM_DELETE_ACTION.HAS_SESSIONS || deleteAction === GYM_DELETE_ACTION.UNKNOWN}
        onPress={handleDeletePress}
      />
    </View>
  )
}

export default function GymsScreen({ navigation }) {
  const { t } = useTranslation()
  const { data: gyms = [], isLoading } = useGyms()
  const createGym = useCreateGym()
  const renameGym = useRenameGym()
  const deleteGym = useDeleteGym()

  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [gymToRename, setGymToRename] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [gymToDelete, setGymToDelete] = useState(null)

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed || createGym.isPending) return
    createGym.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setNewName('')
          setShowAddForm(false)
        },
      }
    )
  }

  const handleOpenRename = (gym) => {
    setGymToRename(gym)
    setRenameValue(getGymName(gym, t) || '')
  }

  const handleRename = () => {
    const trimmed = renameValue.trim()
    if (!trimmed || !gymToRename) {
      setGymToRename(null)
      return
    }
    renameGym.mutate(
      { id: gymToRename.id, name: trimmed },
      { onSuccess: () => setGymToRename(null) }
    )
  }

  const handleConfirmDelete = () => {
    if (!gymToDelete) return
    deleteGym.mutate(gymToDelete.id, {
      onSuccess: () => setGymToDelete(null),
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title={t('common:gym.title')} onBack={() => navigation.goBack()} />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40, gap: 12 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
            {t('common:gym.manageDescription')}
          </Text>

          {gyms.length === 0 && !showAddForm && (
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 24 }}>
              {t('common:gym.empty')}
            </Text>
          )}

          {gyms.map((gym) => (
            <GymRow
              key={gym.id}
              gym={gym}
              onRename={handleOpenRename}
              onDelete={setGymToDelete}
            />
          ))}

          {showAddForm ? (
            <View style={{ gap: 12, backgroundColor: colors.bgSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14 }}>
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
                  style={{ flex: 1, minHeight: design.minTouchTarget, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgTertiary }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>{t('common:buttons.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
                  disabled={!newName.trim() || createGym.isPending}
                  style={{ flex: 1, minHeight: design.minTouchTarget, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, opacity: !newName.trim() || createGym.isPending ? 0.4 : 1 }}
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
              className="active:opacity-70"
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: design.minTouchTarget, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}
            >
              <Plus size={16} color={colors.success} />
              <Text style={{ color: colors.success, fontSize: 14, fontWeight: '600' }}>{t('common:gym.add')}</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Rename modal */}
      <Modal isOpen={!!gymToRename} onClose={() => setGymToRename(null)} position="bottom">
        <View style={{ padding: 20, gap: 16 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{t('common:gym.rename')}</Text>
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>{t('common:gym.name')}</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              placeholder={t('common:gym.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleRename}
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14 }}
            />
          </View>
          <Pressable
            onPress={handleRename}
            disabled={!renameValue.trim() || renameGym.isPending}
            style={{ backgroundColor: colors.success, borderRadius: 12, minHeight: design.minTouchTarget, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', opacity: renameValue.trim() && !renameGym.isPending ? 1 : 0.4 }}
          >
            <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>
              {renameGym.isPending ? t('common:buttons.loading') : t('common:buttons.save')}
            </Text>
          </Pressable>
        </View>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!gymToDelete}
        title={t('common:gym.delete')}
        message={t('common:gym.deleteConfirm', { name: gymToDelete ? getGymName(gymToDelete, t) : '' })}
        confirmText={t('common:buttons.delete')}
        loadingText={t('common:buttons.loading')}
        isLoading={deleteGym.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setGymToDelete(null)}
      />
    </SafeAreaView>
  )
}
