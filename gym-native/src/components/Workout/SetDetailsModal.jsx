import { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { Check, Save } from 'lucide-react-native'
import { Modal } from '../ui'
import { colors, inputStyle } from '../../lib/styles'
import { formatRestTimeDisplay } from '../../lib/timeUtils'
import { RIR_OPTIONS } from '../../lib/constants'
import { usePreference } from '../../hooks/usePreferences'
import { getEffortLabel } from '../../lib/measurementTypes'

export default function SetDetailsModal({
  isOpen,
  onClose,
  onSubmit,
  mode = 'complete',
  initialRir,
  initialNote,
  descansoSeg = 0,
  measurementType,
}) {
  const { value: showRirInput } = usePreference('show_rir_input')
  const { value: showSetNotes } = usePreference('show_set_notes')

  const [rir, setRir] = useState(null)
  const [note, setNote] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRir(initialRir ?? null)
      setNote(initialNote ?? '')
      setHasChanges(false)
    }
  }, [isOpen, initialRir, initialNote])

  const handleRirChange = (value) => {
    setRir(rir === value ? null : value)
    setHasChanges(true)
  }

  const handleSubmit = () => {
    onSubmit(rir, note.trim() || null, null, null)
    resetState()
  }

  const resetState = () => {
    setRir(null)
    setNote('')
    setHasChanges(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const isEditMode = mode === 'edit'
  const title = isEditMode ? 'Editar serie' : 'Completar serie'
  const buttonDisabled = isEditMode && !hasChanges
  const buttonColor = buttonDisabled ? colors.bgTertiary : (isEditMode ? colors.purple : colors.success)
  const buttonTextColor = buttonDisabled ? colors.textSecondary : '#ffffff'

  return (
    <Modal isOpen={isOpen} onClose={handleClose} position="bottom">
      <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View className="flex-row justify-between items-center">
          <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
            {title}
          </Text>
          <Pressable onPress={handleClose}>
            <Text className="text-xl" style={{ color: colors.textSecondary }}>✕</Text>
          </Pressable>
        </View>
      </View>

      <View className="p-4 gap-5">
        {showRirInput && (
          <View>
            <Text className="text-sm mb-3" style={{ color: colors.textSecondary }}>
              {getEffortLabel(measurementType)} (opcional)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {RIR_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => handleRirChange(option.value)}
                  className="flex-1 p-2 rounded-lg items-center"
                  style={{
                    backgroundColor: rir === option.value ? colors.purple : colors.bgTertiary,
                    minWidth: '18%',
                  }}
                >
                  <Text
                    className="text-lg font-bold"
                    style={{ color: rir === option.value ? colors.bgPrimary : colors.textPrimary }}
                  >
                    {option.label}
                  </Text>
                  <Text
                    className="text-xs"
                    style={{
                      color: rir === option.value ? colors.bgPrimary : colors.textSecondary,
                      opacity: 0.75,
                    }}
                  >
                    {option.description}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {showSetNotes && (
          <View>
            <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
              Nota (opcional)
            </Text>
            <TextInput
              value={note}
              onChangeText={(v) => { setNote(v); setHasChanges(true) }}
              placeholder="Ej: Buen pump, molestia en codo..."
              placeholderTextColor="#6e7681"
              multiline
              style={[inputStyle, { textAlignVertical: 'top', minHeight: 56 }]}
            />
          </View>
        )}

        {!isEditMode && descansoSeg > 0 && (
          <View className="py-2 rounded-lg items-center" style={{ backgroundColor: colors.bgTertiary }}>
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              Descanso: <Text style={{ color: colors.accent }}>{formatRestTimeDisplay(descansoSeg)}</Text>
            </Text>
          </View>
        )}
      </View>

      <View className="p-4" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <Pressable
          onPress={handleSubmit}
          disabled={buttonDisabled}
          className="py-3 rounded-lg flex-row items-center justify-center gap-2"
          style={{
            backgroundColor: buttonColor,
            opacity: buttonDisabled ? 0.5 : 1,
          }}
        >
          {isEditMode ? (
            <Save size={20} color={buttonTextColor} />
          ) : (
            <Check size={20} color={buttonTextColor} />
          )}
          <Text className="font-bold" style={{ color: buttonTextColor }}>
            {isEditMode ? 'Guardar cambios' : 'Completar'}
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}
