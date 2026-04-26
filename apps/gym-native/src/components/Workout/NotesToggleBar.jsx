import { View, Pressable, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { FileText, ChevronDown } from 'lucide-react-native'
import { colors } from '../../lib/styles'

export default function NotesToggleBar({ showNotes, onToggle }) {
  const { t } = useTranslation()
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.bgAlt,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
      className="active:opacity-80"
    >
      <FileText size={14} color={colors.textSecondary} />
      <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
        {t('exercise:notesAndCues')}
      </Text>
      <View style={{ transform: [{ rotate: showNotes ? '180deg' : '0deg' }] }}>
        <ChevronDown size={16} color={colors.textSecondary} />
      </View>
    </Pressable>
  )
}
