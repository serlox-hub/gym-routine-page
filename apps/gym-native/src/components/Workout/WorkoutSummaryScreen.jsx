import { useEffect, useRef } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import ViewShot from 'react-native-view-shot'
import { Share2, Home } from 'lucide-react-native'
import { useCompletedSessionCount } from '@gym/shared'
import { useShareWorkoutSummary } from '../../hooks/useShareWorkoutSummary'
import WorkoutSummaryCard from './WorkoutSummaryCard'
import { colors } from '../../lib/styles'

function goHome(navigation) {
  navigation.reset({
    index: 0,
    routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Home' }] } }],
  })
}

export default function WorkoutSummaryScreen({ route, navigation }) {
  const { t } = useTranslation()
  const viewShotRef = useRef(null)
  const { generateAndShare, isGenerating } = useShareWorkoutSummary()
  const { data: sessionCount } = useCompletedSessionCount()

  const summaryData = route?.params?.summaryData

  useEffect(() => {
    if (!summaryData) goHome(navigation)
  }, [summaryData, navigation])

  if (!summaryData) return null

  const handleShare = () => {
    generateAndShare(viewShotRef.current, summaryData?.date)
  }

  const handleDismiss = () => goHome(navigation)

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Tarjeta a tamaño real para captura, fuera del viewport */}
      <View style={{ position: 'absolute', top: -2000, left: 0, width: 540 }} collapsable={false} pointerEvents="none">
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          <WorkoutSummaryCard summaryData={summaryData} sessionNumber={sessionCount} />
        </ViewShot>
      </View>

      <View className="px-4 pt-2 pb-3">
        <Text className="text-primary text-xl font-bold text-center">{t('workout:summary.title')}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ alignItems: 'center', paddingVertical: 16 }}
      >
        <View style={{
          transform: [{ scale: 0.65 }],
          marginVertical: -160,
        }}>
          <WorkoutSummaryCard summaryData={summaryData} sessionNumber={sessionCount} />
        </View>
      </ScrollView>

      <View
        className="px-4 py-3 gap-3"
        style={{ backgroundColor: colors.bgSecondary, borderTopWidth: 1, borderTopColor: colors.border }}
      >
        <Pressable
          onPress={handleShare}
          disabled={isGenerating}
          className="flex-row items-center justify-center gap-2 py-3 rounded-lg active:opacity-70"
          style={{
            backgroundColor: colors.success,
            borderWidth: 1,
            borderColor: colors.success,
            opacity: isGenerating ? 0.5 : 1,
          }}
        >
          <Share2 size={16} color={colors.textDark} />
          <Text style={{ color: colors.textDark, fontSize: 14, fontWeight: '600' }}>
            {isGenerating ? t('common:buttons.loading') : t('common:buttons.share')}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleDismiss}
          className="flex-row items-center justify-center gap-2 py-3 rounded-lg active:opacity-70"
          style={{
            backgroundColor: colors.bgTertiary,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Home size={16} color={colors.textPrimary} />
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
            {t('common:nav.home')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
