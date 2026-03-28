import { View, Text, Pressable } from 'react-native'
import { Badge } from '../ui'
import { colors } from '../../lib/styles'

function ExerciseCardNotes({
  series,
  reps,
  rir,
  tempo,
  rest_seconds,
  showNotes,
  onToggleNotes,
  exercise,
  tempoRazon,
  notes,
}) {
  const hasNoteContent = exercise.instructions || notes || tempoRazon

  return (
    <>
      <View className="my-3 pt-3 flex-row flex-wrap items-center gap-2" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <Badge variant="accent">{series}×{reps}</Badge>
        {rir !== null && <Badge variant="purple">RIR {rir}</Badge>}
        {tempo && <Badge variant="default">{tempo}</Badge>}
        {rest_seconds > 0 && <Badge variant="default">{rest_seconds}s</Badge>}
        {hasNoteContent && (
          <Pressable
            onPress={onToggleNotes}
            className="px-2 py-1 rounded active:opacity-70"
            style={{ backgroundColor: showNotes ? 'rgba(136, 198, 190, 0.2)' : colors.bgTertiary }}
          >
            <Text className="text-xs" style={{ color: showNotes ? colors.teal : colors.textSecondary }}>
              {showNotes ? '▲ Ocultar notas' : '▼ Ver notas'}
            </Text>
          </Pressable>
        )}
      </View>

      {showNotes && hasNoteContent && (
        <View className="mb-3 p-3 rounded gap-2" style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
          {exercise.instructions && (
            <Text className="text-sm" style={{ color: colors.textPrimary }}>
              <Text style={{ color: colors.accent }}>Ejecución: </Text>{exercise.instructions}
            </Text>
          )}
          {tempoRazon && (
            <Text className="text-sm" style={{ color: colors.textPrimary }}>
              <Text style={{ color: colors.purple }}>Tempo: </Text>{tempoRazon}
            </Text>
          )}
          {notes && (
            <Text className="text-sm" style={{ color: colors.textPrimary }}>
              <Text style={{ color: colors.warning }}>Nota: </Text>{notes}
            </Text>
          )}
        </View>
      )}
    </>
  )
}

export default ExerciseCardNotes
