import { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react-native'
import { useWorkoutHistory, formatTime, groupSessionsByDate } from '@gym/shared'
import { LoadingSpinner, ErrorMessage } from '../components/ui'
import { MonthlyCalendar } from '../components/History'
import SessionInlineDetail from '../components/History/SessionInlineDetail'
import { colors, design } from '../lib/styles'

export default function HistoryScreen({ navigation, route }) {
  const { t } = useTranslation()
  const [currentDate, setCurrentDate] = useState(new Date())
  const { data: sessions, isLoading, error, refetch } = useWorkoutHistory(currentDate)
  const [selectedSessions, setSelectedSessions] = useState(null)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [selectedDateKey, setSelectedDateKey] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const autoSelectedRef = useRef(null)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try { await refetch() } finally { setRefreshing(false) }
  }, [refetch])

  // Navegar a sesión específica si viene por params
  const incomingSessionId = route?.params?.sessionId
  const incomingSessionDate = route?.params?.sessionDate
  useEffect(() => {
    if (!incomingSessionId) return

    // Cambiar al mes de la sesión si es diferente al actual
    if (incomingSessionDate) {
      const sessionDate = new Date(incomingSessionDate)
      if (sessionDate.getFullYear() !== currentDate.getFullYear() || sessionDate.getMonth() !== currentDate.getMonth()) {
        setCurrentDate(sessionDate)
        return
      }
    }

    if (!sessions || sessions.length === 0) return
    const sessionsByDate = groupSessionsByDate(sessions)
    for (const [dateKey, daySessions] of sessionsByDate) {
      const match = daySessions.find(s => s.id === incomingSessionId)
      if (match) {
        setSelectedDateKey(dateKey)
        setSelectedSessions(daySessions)
        setSelectedSessionId(incomingSessionId)
        autoSelectedRef.current = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
        navigation.setParams({ sessionId: undefined, sessionDate: undefined })
        return
      }
    }
  }, [incomingSessionId, incomingSessionDate, sessions, currentDate, navigation])

  // Auto-seleccionar día de hoy al cargar (skip si hay incoming)
  useEffect(() => {
    if (incomingSessionId) return
    if (!sessions || sessions.length === 0) return
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
    if (autoSelectedRef.current === monthKey) return
    autoSelectedRef.current = monthKey

    const todayKey = new Date().toDateString()
    const todaySessions = groupSessionsByDate(sessions).get(todayKey)

    setSelectedDateKey(todayKey)
    if (todaySessions) {
      setSelectedSessions(todaySessions)
      setSelectedSessionId(todaySessions[0].id)
    } else {
      setSelectedSessions(null)
      setSelectedSessionId(null)
    }
  }, [incomingSessionId, sessions, currentDate])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleDayPress = (dayData) => {
    setSelectedDateKey(dayData.dateKey)
    if (dayData.sessions && dayData.sessions.length > 0) {
      setSelectedSessions(dayData.sessions)
      setSelectedSessionId(dayData.sessions[0].id)
    } else {
      setSelectedSessions(null)
      setSelectedSessionId(null)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: design.tabContentPaddingBottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
        keyboardShouldPersistTaps="handled"
      >
        {!sessions || sessions.length === 0 ? (
          <View className="items-center py-12">
            <Calendar size={48} color={colors.textSecondary} />
            <Text className="mt-4" style={{ color: colors.textSecondary }}>{t('workout:history.noSessions')}</Text>
          </View>
        ) : (
          <>
            <MonthlyCalendar
              sessions={sessions}
              onDayPress={handleDayPress}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              selectedDateKey={selectedDateKey}
            />

            {/* Session selector */}
            {selectedSessions && selectedSessions.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 mb-2">
                <View className="flex-row gap-2">
                  {selectedSessions.map(session => (
                    <Pressable
                      key={session.id}
                      onPress={() => setSelectedSessionId(session.id)}
                      className="px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor: session.id === selectedSessionId ? colors.success : colors.bgTertiary,
                      }}
                    >
                      <Text className="text-xs font-medium" style={{
                        color: session.id === selectedSessionId ? colors.bgPrimary : colors.textSecondary,
                      }}>
                        {session.day_name || session.routine_day?.name || t('workout:session.freeWorkout')}
                        {' · '}
                        {formatTime(session.started_at)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Inline session detail */}
            {selectedSessionId ? (
              <View className="mt-4">
                <SessionInlineDetail key={selectedSessionId} sessionId={selectedSessionId} navigation={navigation} onSessionDeleted={() => {
                  const remaining = selectedSessions?.filter(s => s.id !== selectedSessionId)
                  if (remaining?.length > 0) {
                    setSelectedSessions(remaining)
                    setSelectedSessionId(remaining[0].id)
                  } else {
                    setSelectedSessions(null)
                    setSelectedSessionId(null)
                  }
                }} />
              </View>
            ) : (
              <View className="items-center py-8">
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  {selectedDateKey ? t('workout:history.noSessionsDay') : t('workout:history.selectDay')}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
