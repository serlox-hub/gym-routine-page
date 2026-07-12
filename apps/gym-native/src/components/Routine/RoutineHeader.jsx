import { View, Text, TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Pencil, Download, Trash2, Copy, ClipboardCopy } from 'lucide-react-native'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as Clipboard from 'expo-clipboard'
import Toast from 'react-native-toast-message'
import { useDuplicateRoutine, useRoutineEditForm } from '../../hooks/useRoutines'
import { sanitizeFilename, exportRoutine, formatRoutineAsText } from '@gym/shared'
import { colors } from '../../lib/styles'
import { PageHeader } from '../ui'

export function RoutineEditForm({ routine, routineId }) {
  const { t } = useTranslation()
  const { editForm, handleFieldChange } = useRoutineEditForm(routine, routineId)

  return (
    <View style={{ gap: 16, marginBottom: 16 }}>
      <View>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>
          {t('routine:name')}
        </Text>
        <TextInput
          value={editForm.name}
          onChangeText={(v) => handleFieldChange('name', v)}
          placeholder={t('routine:namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoFocus
          style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14 }}
        />
      </View>
      <View>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>
          {t('routine:description')}
        </Text>
        <TextInput
          value={editForm.description}
          onChangeText={(v) => handleFieldChange('description', v)}
          placeholder={t('routine:descriptionPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline numberOfLines={2}
          style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14, textAlignVertical: 'top', minHeight: 60 }}
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

  const handleCopyAsText = async () => {
    try {
      const data = await exportRoutine(parseInt(routineId))
      const text = formatRoutineAsText(data)
      await Clipboard.setStringAsync(text)
      Toast.show({ type: 'success', text1: t('routine:copiedToClipboard') })
    } catch {
      Toast.show({ type: 'error', text1: t('routine:copyAsTextFailed') })
    }
  }

  if (isEditing) {
    return (
      <PageHeader
        title={routine?.name || t('routine:new')}
        onBack={onEditEnd}
      />
    )
  }

  const menuItems = [
    { icon: Pencil, label: t('common:buttons.edit'), onClick: onEditStart },
    { icon: Copy, label: t('routine:duplicate'), onClick: handleDuplicate },
    { icon: ClipboardCopy, label: t('routine:copyAsText'), onClick: handleCopyAsText },
    { icon: Download, label: t('common:buttons.export'), onClick: handleExport },
    { icon: Trash2, label: t('common:buttons.delete'), onClick: onDelete, danger: true },
  ]

  return (
    <PageHeader
      title=""
      menuItems={menuItems}
    />
  )
}
