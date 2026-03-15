import { View, Text, ScrollView } from 'react-native'
import { Dumbbell, Calendar } from 'lucide-react-native'
import { Modal, LoadingSpinner, ErrorMessage } from '../ui'
import { useExerciseUsageDetail } from '../../hooks/useExercises'
import { formatShortDate } from '../../lib/dateUtils'
import { colors } from '../../lib/styles'

export default function ExerciseUsageModal({ exercise, onClose }) {
  const { data, isLoading, error } = useExerciseUsageDetail(exercise?.id)

  return (
    <Modal isOpen={!!exercise} onClose={onClose} position="bottom">
      <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text className="text-base font-semibold text-primary">{exercise?.name}</Text>
      </View>

      <ScrollView className="p-4" style={{ maxHeight: 400 }}>
        {isLoading ? (
          <LoadingSpinner fullScreen={false} />
        ) : error ? (
          <ErrorMessage message="No se pudieron cargar los datos" />
        ) : (
          <View className="gap-5">
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <Dumbbell size={16} color={colors.textSecondary} />
                <Text className="text-sm font-medium text-primary">Rutinas</Text>
              </View>
              {data?.routines?.length > 0 ? (
                <View className="gap-1.5">
                  {data.routines.map(r => (
                    <Text key={`${r.routineId}-${r.dayName}`} className="text-sm text-secondary">
                      <Text className="text-primary">{r.routineName}</Text> · {r.dayName}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-secondary">No está en ninguna rutina</Text>
              )}
            </View>

            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <Calendar size={16} color={colors.textSecondary} />
                <Text className="text-sm font-medium text-primary">Últimas sesiones</Text>
              </View>
              {data?.sessions?.length > 0 ? (
                <View className="gap-1.5">
                  {data.sessions.slice(0, 20).map(s => (
                    <Text key={s.sessionId} className="text-sm text-secondary">
                      <Text className="text-primary">{formatShortDate(s.date)}</Text>
                      {s.routineName && ` · ${s.routineName}`}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-secondary">Sin registros</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </Modal>
  )
}
