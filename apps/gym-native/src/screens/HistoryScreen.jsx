import { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react-native'
import { useWorkoutHistory, useSelectedDaySessions, formatTime, getSessionsForDateKey, parseDateInput } from '@gym/shared'
import { LoadingSpinner, ErrorMessage } from '../components/ui'
import { MonthlyCalendar } from '../components/History'
import SessionInlineDetail from '../components/History/SessionInlineDetail'
import { colors, design } from '../lib/styles'

export default function HistoryScreen({ navigation, route }) {
  const { t } = useTranslation()
  const [currentDate, setCurrentDate] = useState(new Date())
  const { data: sessions, isLoading, error, refetch } = useWorkoutHistory(currentDate)
  const [refreshing, setRefreshing] = useState(false)
  // Día y sesión seleccionados: las sesiones del día se derivan de la query, y si la sesión
  // abierta se mueve de fecha la selección la sigue (ver `useSelectedDaySessions`).
  const {
    selectedDateKey,
    setSelectedDateKey,
    selectedSessionId,
    setSelectedSessionId,
    selectedSessions,
  } = useSelectedDaySessions(sessions)
  const autoSelectedRef = useRef(null)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try { await refetch() } finally { setRefreshing(false) }
  }, [refetch])

  // Navegar a un día (con sesión opcional) si viene por params.
  // `date` acepta ISO timestamp o YYYY-MM-DD. `sessionId` es opcional: si está y existe en el día, se abre esa; si no, la primera del día.
  const incomingDate = route?.params?.date
  const incomingSessionId = route?.params?.sessionId
  useEffect(() => {
    if (!incomingDate) return

    const target = parseDateInput(incomingDate)
    if (target.getFullYear() !== currentDate.getFullYear() || target.getMonth() !== currentDate.getMonth()) {
      setCurrentDate(target)
      return
    }

    if (!sessions || sessions.length === 0) return
    const dateKey = target.toDateString()
    const daySessions = getSessionsForDateKey(sessions, dateKey)
    const sessionToOpen = (incomingSessionId && daySessions.find(s => s.id === incomingSessionId)) || daySessions[0]

    setSelectedDateKey(dateKey)
    setSelectedSessionId(sessionToOpen?.id ?? null)
    autoSelectedRef.current = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
    navigation.setParams({ date: undefined, sessionId: undefined })
  }, [incomingDate, incomingSessionId, sessions, currentDate, navigation, setSelectedDateKey, setSelectedSessionId])

  // Auto-seleccionar día de hoy al cargar (skip si hay incoming)
  useEffect(() => {
    if (incomingDate) return
    if (!sessions || sessions.length === 0) return
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
    if (autoSelectedRef.current === monthKey) return
    autoSelectedRef.current = monthKey

    const todayKey = new Date().toDateString()
    const todaySessions = getSessionsForDateKey(sessions, todayKey)

    setSelectedDateKey(todayKey)
    setSelectedSessionId(todaySessions[0]?.id ?? null)
  }, [incomingDate, sessions, currentDate, setSelectedDateKey, setSelectedSessionId])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleDayPress = (dayData) => {
    setSelectedDateKey(dayData.dateKey)
    setSelectedSessionId(dayData.sessions?.[0]?.id ?? null)
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: design.tabContentPaddingBottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
        keyboardShouldPersistTaps="handled"
      >
        <MonthlyCalendar
          sessions={sessions}
          onDayPress={handleDayPress}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          selectedDateKey={selectedDateKey}
        />

        {!sessions || sessions.length === 0 ? (
          <View className="items-center py-12">
            <Calendar size={48} color={colors.textSecondary} />
            <Text className="mt-4" style={{ color: colors.textSecondary }}>{t('workout:history.noSessions')}</Text>
          </View>
        ) : (
          <>
            {/* Session selector */}
            {selectedSessions.length > 1 && (
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
                  const remaining = selectedSessions.filter(s => s.id !== selectedSessionId)
                  setSelectedSessionId(remaining[0]?.id ?? null)
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
