import { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Modal } from 'react-native'
import { Search, ChevronDown } from 'lucide-react-native'
import { colors, inputStyle } from '../../lib/styles'
import { getMuscleGroupColor } from '../../lib/constants'

export default function ExerciseSearchBar({
  search,
  onSearchChange,
  muscleGroups,
  selectedMuscleGroup,
  onMuscleGroupChange,
  autoFocus = false,
}) {
  const [showPicker, setShowPicker] = useState(false)
  const selectedGroup = muscleGroups?.find(g => g.id === selectedMuscleGroup)

  const handleSelect = (value) => {
    onMuscleGroupChange(value)
    setShowPicker(false)
  }

  return (
    <>
      <View className="relative mb-3">
        <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
          <Search size={18} color={colors.textSecondary} />
        </View>
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Buscar ejercicio..."
          placeholderTextColor="#6e7681"
          autoFocus={autoFocus}
          style={[inputStyle, { paddingLeft: 40 }]}
        />
      </View>

      <Pressable
        onPress={() => setShowPicker(true)}
        className="flex-row items-center gap-2 p-3 rounded-lg mb-3"
        style={{ backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}
      >
        {selectedGroup && (
          <View
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: getMuscleGroupColor(selectedGroup.name) }}
          />
        )}
        <Text
          className="flex-1"
          style={{ color: selectedGroup ? colors.textPrimary : colors.textSecondary }}
          numberOfLines={1}
        >
          {selectedGroup ? selectedGroup.name : 'Todos los grupos musculares'}
        </Text>
        <ChevronDown size={16} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <Pressable
          onPress={() => setShowPicker(false)}
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-block rounded-t-2xl pb-8"
          >
            <Text className="text-primary font-semibold p-4">Grupo muscular</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <Pressable
                onPress={() => handleSelect(null)}
                className="px-4 py-3 flex-row items-center gap-2"
                style={!selectedMuscleGroup ? { backgroundColor: 'rgba(88, 166, 255, 0.1)' } : {}}
              >
                <Text style={{ color: !selectedMuscleGroup ? colors.accent : colors.textSecondary }}>
                  Todos los grupos musculares
                </Text>
              </Pressable>
              {muscleGroups?.map(group => {
                const isSelected = selectedMuscleGroup === group.id
                return (
                  <Pressable
                    key={group.id}
                    onPress={() => handleSelect(group.id)}
                    className="px-4 py-3 flex-row items-center gap-2"
                    style={isSelected ? { backgroundColor: 'rgba(88, 166, 255, 0.1)' } : {}}
                  >
                    <View
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: getMuscleGroupColor(group.name) }}
                    />
                    <Text style={{ color: isSelected ? colors.accent : colors.textPrimary }}>
                      {group.name}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
