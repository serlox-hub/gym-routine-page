import { useRef } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ViewShot from 'react-native-view-shot'
import { Share2 } from 'lucide-react-native'
import { useCompletedSessionCount } from '@gym/shared'
import { Button } from '../ui'
import { useShareWorkoutSummary } from '../../hooks/useShareWorkoutSummary'
import WorkoutSummaryCard from './WorkoutSummaryCard'
import { colors } from '../../lib/styles'

export default function WorkoutSummaryScreen({ summaryData, onDismiss }) {
  const viewShotRef = useRef(null)
  const { generateAndShare, isGenerating } = useShareWorkoutSummary()
  const { data: sessionCount } = useCompletedSessionCount()

  const handleShare = () => {
    generateAndShare(viewShotRef.current, summaryData?.date)
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Tarjeta a tamaño real para captura, fuera del viewport */}
      <View style={{ position: 'absolute', top: -2000, left: 0, width: 540 }} collapsable={false} pointerEvents="none">
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          <WorkoutSummaryCard summaryData={summaryData} sessionNumber={sessionCount} />
        </ViewShot>
      </View>

      <View className="px-4 pt-2 pb-3">
        <Text className="text-primary text-xl font-bold text-center">Resumen</Text>
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
        <Button onPress={handleShare} loading={isGenerating}>
          <View className="flex-row items-center justify-center gap-2">
            <Share2 size={16} color={colors.white} />
            <Text className="text-white font-medium text-sm">
              {isGenerating ? 'Generando...' : 'Compartir'}
            </Text>
          </View>
        </Button>
        <Button variant="secondary" onPress={onDismiss}>
          Ir a inicio
        </Button>
      </View>
    </SafeAreaView>
  )
}
