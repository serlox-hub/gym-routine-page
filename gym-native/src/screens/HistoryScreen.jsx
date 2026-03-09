import { useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Calendar } from 'lucide-react-native'
import { useWorkoutHistory } from '../hooks/useWorkout'
import { LoadingSpinner, ErrorMessage, Card, Modal, PageHeader } from '../components/ui'
import { MonthlyCalendar } from '../components/History'
import { formatTime } from '../lib/dateUtils'
import { colors } from '../lib/styles'

export default function HistoryScreen({ navigation }) {
  const { data: sessions, isLoading, error, refetch, isRefetching } = useWorkoutHistory()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleDayPress = (dayData) => {
    if (dayData.sessions.length === 1) {
      navigation.navigate('SessionDetail', { sessionId: dayData.sessions[0].id })
    } else if (dayData.sessions.length > 1) {
      setSelectedDay(dayData)
    }
  }

  const handleSessionSelect = (sessionId) => {
    setSelectedDay(null)
    navigation.navigate('SessionDetail', { sessionId })
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title="Histórico" onBack={() => navigation.goBack()} />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        {!sessions || sessions.length === 0 ? (
          <View className="items-center py-12">
            <Calendar size={48} color={colors.textSecondary} />
            <Text className="text-secondary mt-4">No hay sesiones registradas</Text>
          </View>
        ) : (
          <MonthlyCalendar
            sessions={sessions}
            onDayPress={handleDayPress}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
          />
        )}
      </ScrollView>

      <Modal isOpen={!!selectedDay} onClose={() => setSelectedDay(null)} className="p-4">
        <Text className="text-primary font-semibold mb-4">
          {selectedDay?.sessions.length} sesiones este día
        </Text>
        <View className="gap-2">
          {selectedDay?.sessions.map(session => (
            <Card
              key={session.id}
              className="p-3"
              onPress={() => handleSessionSelect(session.id)}
            >
              <Text className="text-primary font-medium">
                {session.day_name || session.routine_day?.name || 'Entrenamiento Libre'}
              </Text>
              <Text className="text-secondary text-sm">
                {formatTime(session.started_at)}
                {session.duration_minutes && ` · ${session.duration_minutes} min`}
              </Text>
            </Card>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  )
}
