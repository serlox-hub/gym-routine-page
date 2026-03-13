import { View, Text, TextInput, Pressable } from 'react-native'
import { inputStyle, colors } from '../../lib/styles'

export default function DayEditForm({ dayNumber, form, setForm, onSave }) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3">
        <Text className="text-accent font-semibold">{dayNumber}</Text>
        <TextInput
          value={form.name}
          onChangeText={(v) => setForm(prev => ({ ...prev, name: v }))}
          placeholder="Nombre del día"
          placeholderTextColor="#6e7681"
          autoFocus
          className="flex-1"
          style={[inputStyle, { padding: 4 }]}
        />
      </View>
      <View className="flex-row items-center gap-2 pl-8">
        <Text className="text-secondary text-sm">Duración estimada:</Text>
        <TextInput
          value={String(form.duration || '')}
          onChangeText={(v) => setForm(prev => ({ ...prev, duration: v }))}
          placeholder="--"
          placeholderTextColor="#6e7681"
          keyboardType="numeric"
          className="w-16 text-sm text-center"
          style={[inputStyle, { padding: 4 }]}
        />
        <Text className="text-secondary text-sm">min</Text>
        <Pressable
          onPress={onSave}
          className="ml-auto px-3 py-1 rounded"
          style={{ backgroundColor: colors.accent }}
        >
          <Text className="text-white text-sm">OK</Text>
        </Pressable>
      </View>
    </View>
  )
}
