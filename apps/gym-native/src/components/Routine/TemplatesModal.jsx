import { useState } from 'react'
import { View, Text, FlatList } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react-native'
import { Modal, Card, Button } from '../ui'
import { colors } from '../../lib/styles'
import { ROUTINE_TEMPLATES } from '@gym/shared'

function TemplateCard({ template, isSelected, onSelect }) {
  const { t } = useTranslation()
  const daysCount = template.data.routine.days.length

  return (
    <Card
      className="p-3"
      onPress={onSelect}
      style={isSelected ? { borderColor: colors.accent, borderWidth: 2 } : {}}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="w-5 h-5 rounded-full items-center justify-center mt-0.5"
          style={{
            borderWidth: 2,
            borderColor: isSelected ? colors.accent : colors.border,
            backgroundColor: isSelected ? colors.accent : 'transparent',
          }}
        >
          {isSelected && <Check size={12} color={colors.white} />}
        </View>
        <View className="flex-1">
          <Text className="font-medium text-sm text-primary">{template.name}</Text>
          <Text className="text-xs text-secondary mt-0.5">{template.description}</Text>
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {template.tags.map(tag => (
              <View
                key={tag}
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: colors.bgPrimary }}
              >
                <Text className="text-xs text-secondary">{tag}</Text>
              </View>
            ))}
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bgPrimary }}>
              <Text className="text-xs text-secondary">
                {daysCount} {t('routine:day.title', { count: daysCount })}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  )
}

export default function TemplatesModal({ isOpen, onClose, onSelect }) {
  const { t } = useTranslation()
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate.data)
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text className="font-semibold text-primary">{t('routine:templates.title')}</Text>
      </View>

      <View className="p-4">
        <Text className="text-sm text-secondary mb-4">
          {t('routine:templates.description')}
        </Text>
      </View>

      <FlatList
        data={ROUTINE_TEMPLATES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TemplateCard
            template={item}
            isSelected={selectedTemplate?.id === item.id}
            onSelect={() => setSelectedTemplate(item)}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-2" />}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        style={{ maxHeight: 400 }}
      />

      <View className="p-4" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button onPress={handleConfirm} disabled={!selectedTemplate}>
          {t('routine:templates.use')}
        </Button>
      </View>
    </Modal>
  )
}
