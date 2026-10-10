import { View, Text, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { Trophy, X } from 'lucide-react-native'
import { formatWeekdayDate } from '@gym/shared'
import { Modal, LoadingSpinner, IconButton } from '../ui'
import { colors } from '../../lib/styles'
import WeeklyPRExerciseCard from './WeeklyPRExerciseCard'

/**
 * The week's records, by session and exercise (records card of the home). An exercise opens its
 * session in the history.
 */
export default function WeeklyPRsModal({ isOpen, onClose, sessions, count, isLoading, isError }) {
  const { t } = useTranslation()
  const navigation = useNavigation()

  const openSession = (session) => {
    onClose()
    navigation.navigate('History', { date: session.sessionDate, sessionId: session.sessionId })
  }

  const showList = !isLoading && !isError && count > 0

  const renderBody = () => {
    if (isLoading) return <LoadingSpinner fullScreen={false} />
    if (!showList) {
      return (
        <View className="items-center gap-3 px-5 py-10">
          <Trophy size={32} color={colors.textMuted} />
          <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
            {isError ? t('common:home.weeklyPRsError') : t('common:home.weeklyPRsEmpty')}
          </Text>
        </View>
      )
    }
    return (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 20 }}>
        {sessions.map(session => (
          <View key={session.sessionId}>
            <Text
              className="px-1 mb-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: colors.textMuted }}
            >
              {formatWeekdayDate(session.sessionDate)} · {session.dayName || t('workout:session.freeWorkout')}
            </Text>
            <View className="gap-2">
              {session.exercises.map(exercise => (
                <WeeklyPRExerciseCard key={exercise.key} exercise={exercise} onPress={() => openSession(session)} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom">
      <View className="flex-row items-center gap-3 pl-5 pr-2 pt-4 pb-4">
        <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.goldBg }}>
          <Trophy size={20} color={colors.gold} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-primary">{t('common:home.weeklyPRsTitle')}</Text>
          {showList && (
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              {t('common:home.weeklyPRsCount', { count })} {t('common:home.weeklyPRsSessions', { count: sessions.length })}
            </Text>
          )}
        </View>
        <IconButton icon={X} label={t('common:buttons.close')} onPress={onClose} />
      </View>
      {renderBody()}
    </Modal>
  )
}
