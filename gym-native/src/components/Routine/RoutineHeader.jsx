import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TextInput } from 'react-native'
import { Pencil, Download, Trash2, Copy } from 'lucide-react-native'
import { useUpdateRoutine, useDuplicateRoutine } from '../../hooks/useRoutines'
import { inputStyle } from '../../lib/styles'
import { PageHeader } from '../ui'

const DEBOUNCE_MS = 500

export default function RoutineHeader({ routine, routineId, isEditing, onEditStart, onEditEnd, onDelete, navigation }) {
  const [editForm, setEditForm] = useState({ name: '', description: '', goal: '' })
  const debounceRef = useRef(null)
  const updateRoutine = useUpdateRoutine()
  const duplicateRoutine = useDuplicateRoutine()

  useEffect(() => {
    if (routine && !isEditing) {
      setEditForm({
        name: routine.name || '',
        description: routine.description || '',
        goal: routine.goal || '',
      })
    }
  }, [routine, isEditing])

  const saveChanges = useCallback((formData) => {
    if (!formData.name.trim()) return
    updateRoutine.mutate({
      routineId: parseInt(routineId),
      data: {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        goal: formData.goal.trim() || null,
      },
    })
  }, [routineId, updateRoutine])

  const handleFieldChange = (field, value) => {
    const newForm = { ...editForm, [field]: value }
    setEditForm(newForm)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveChanges(newForm), DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleDuplicate = async () => {
    try {
      const newRoutine = await duplicateRoutine.mutateAsync({ routineId: parseInt(routineId) })
      navigation.replace('RoutineDetail', { routineId: newRoutine.id })
    } catch {
      // Silent fail
    }
  }

  const menuItems = [
    { icon: Pencil, label: 'Editar', onClick: onEditStart },
    { icon: Copy, label: 'Duplicar', onClick: handleDuplicate },
    { icon: Download, label: 'Exportar', onClick: () => {} },
    { icon: Trash2, label: 'Eliminar', onClick: onDelete, danger: true },
  ]

  return (
    <PageHeader
      title={isEditing ? 'Editar rutina' : routine?.name || 'Días'}
      onBack={isEditing ? onEditEnd : undefined}
      menuItems={!isEditing ? menuItems : undefined}
    >
      {isEditing && (
        <View className="mt-4 gap-3">
          <View>
            <Text className="text-secondary text-sm mb-1">Nombre</Text>
            <TextInput
              value={editForm.name}
              onChangeText={(v) => handleFieldChange('name', v)}
              placeholder="Nombre de la rutina"
              placeholderTextColor="#6e7681"
              autoFocus
              style={[inputStyle, { padding: 8, fontSize: 14 }]}
            />
          </View>
          <View>
            <Text className="text-secondary text-sm mb-1">Descripción</Text>
            <TextInput
              value={editForm.description}
              onChangeText={(v) => handleFieldChange('description', v)}
              placeholder="Descripción de la rutina..."
              placeholderTextColor="#6e7681"
              multiline
              numberOfLines={2}
              style={[inputStyle, { padding: 8, fontSize: 14, textAlignVertical: 'top', minHeight: 50 }]}
            />
          </View>
          <View>
            <Text className="text-secondary text-sm mb-1">Objetivo</Text>
            <TextInput
              value={editForm.goal}
              onChangeText={(v) => handleFieldChange('goal', v)}
              placeholder="Ej: Hipertrofia, Fuerza..."
              placeholderTextColor="#6e7681"
              style={[inputStyle, { padding: 8, fontSize: 14 }]}
            />
          </View>
        </View>
      )}
    </PageHeader>
  )
}
