import { View, Text, TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Pencil, Download, Trash2, Copy } from 'lucide-react-native'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import Toast from 'react-native-toast-message'
import { useDuplicateRoutine, useRoutineEditForm } from '../../hooks/useRoutines'
import { sanitizeFilename, exportRoutine } from '@gym/shared'
import { inputStyle, colors } from '../../lib/styles'
import { PageHeader } from '../ui'

export function RoutineEditForm({ routine, routineId }) {
  const { t } = useTranslation()
  const { editForm, handleFieldChange } = useRoutineEditForm(routine, routineId)

  return (
    <View className="gap-3 mb-4">
      <View>
        <Text className="text-secondary text-sm mb-1">{t('routine:name')}</Text>
        <TextInput
          value={editForm.name}
          onChangeText={(v) => handleFieldChange('name', v)}
          placeholder={t('routine:namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoFocus
          style={[inputStyle, { padding: 8, fontSize: 14 }]}
        />
      </View>
      <View>
        <Text className="text-secondary text-sm mb-1">{t('routine:description')}</Text>
        <TextInput
          value={editForm.description}
          onChangeText={(v) => handleFieldChange('description', v)}
          placeholder={t('routine:descriptionPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={2}
          style={[inputStyle, { padding: 8, fontSize: 14, textAlignVertical: 'top', minHeight: 50 }]}
        />
      </View>
      <View>
        <Text className="text-secondary text-sm mb-1">{t('routine:goal')}</Text>
        <TextInput
          value={editForm.goal}
          onChangeText={(v) => handleFieldChange('goal', v)}
          placeholder={t('routine:goalPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={[inputStyle, { padding: 8, fontSize: 14 }]}
        />
      </View>
      <View>
        <Text className="text-secondary text-sm mb-1">{t('routine:cycleDays')}</Text>
        <TextInput
          value={String(editForm.cycle_days)}
          onChangeText={(v) => handleFieldChange('cycle_days', v)}
          placeholder="7"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={[inputStyle, { padding: 8, fontSize: 14 }]}
        />
      </View>
    </View>
  )
}

export default function RoutineHeader({ routine, routineId, isEditing, onEditStart, onEditEnd, onDelete, navigation }) {
  const { t } = useTranslation()
  const duplicateRoutine = useDuplicateRoutine()

  const handleDuplicate = async () => {
    Toast.show({ type: 'loading', text1: t('routine:duplicating'), autoHide: false })
    try {
      const newRoutine = await duplicateRoutine.mutateAsync({ routineId: parseInt(routineId) })
      Toast.show({ type: 'success', text1: t('routine:duplicated') })
      navigation.replace('RoutineDetail', { routineId: newRoutine.id })
    } catch {
      Toast.show({ type: 'error', text1: t('routine:duplicateError') })
    }
  }

  const handleExport = async () => {
    try {
      const data = await exportRoutine(parseInt(routineId))
      const json = JSON.stringify(data, null, 2)
      const filename = sanitizeFilename(routine?.name || 'rutina') + '.json'
      const file = new File(Paths.cache, filename)
      file.write(json)
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: t('common:buttons.export') })
    } catch {
      Toast.show({ type: 'error', text1: t('routine:exportError') })
    }
  }

  const menuItems = [
    { icon: Pencil, label: t('common:buttons.edit'), onClick: onEditStart, accent: true },
    { icon: Copy, label: t('routine:duplicate'), onClick: handleDuplicate },
    { icon: Download, label: t('common:buttons.export'), onClick: handleExport },
    { icon: Trash2, label: t('common:buttons.delete'), onClick: onDelete, danger: true },
  ]

  const editMenuItems = [
    { icon: Trash2, label: t('common:buttons.delete'), onClick: onDelete, danger: true },
  ]

  return (
    <PageHeader
      title={isEditing ? t('routine:edit') : ''}
      onBack={isEditing ? onEditEnd : undefined}
      menuItems={isEditing ? editMenuItems : menuItems}
    />
  )
}
