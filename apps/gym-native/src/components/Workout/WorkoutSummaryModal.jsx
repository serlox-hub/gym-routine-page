import { useRef, Fragment } from 'react'
import { View, Text, ScrollView } from 'react-native'
import ViewShot from 'react-native-view-shot'
import { Share2, X } from 'lucide-react-native'
import { useCompletedSessionCount } from '@gym/shared'
import { Modal, Button } from '../ui'
import { useShareWorkoutSummary } from '../../hooks/useShareWorkoutSummary'
import WorkoutSummaryCard from './WorkoutSummaryCard'
import { colors } from '../../lib/styles'

export default function WorkoutSummaryModal({ summaryData, isOpen, onClose }) {
  const viewShotRef = useRef(null)
  const { generateAndShare, isGenerating } = useShareWorkoutSummary()
  const { data: sessionCount } = useCompletedSessionCount()

  const handleShare = () => {
    generateAndShare(viewShotRef.current, summaryData?.date)
  }

  return (
    <Fragment>
      {/* Tarjeta a tamaño real para captura, fuera del viewport */}
      {isOpen && (
        <View style={{ position: 'absolute', top: -2000 }} collapsable={false} pointerEvents="none">
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
            <WorkoutSummaryCard summaryData={summaryData} sessionNumber={sessionCount} />
          </ViewShot>
        </View>
      )}

      <Modal isOpen={isOpen} onClose={onClose} position="center" className="p-0">
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-primary text-lg font-semibold">Resumen</Text>
            <Button variant="secondary" size="sm" onPress={onClose}>
              <X size={18} color={colors.textSecondary} />
            </Button>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center' }}
            style={{ maxHeight: 420 }}
          >
            <View style={{ transform: [{ scale: 0.42 }], marginVertical: -280, marginHorizontal: -160 }}>
              <WorkoutSummaryCard summaryData={summaryData} sessionNumber={sessionCount} />
            </View>
          </ScrollView>

          <View className="flex-row gap-3 mt-4">
            <Button
              className="flex-1"
              onPress={handleShare}
              loading={isGenerating}
            >
              <View className="flex-row items-center gap-2">
                <Share2 size={16} color="#ffffff" />
                <Text className="text-white font-medium text-sm">
                  {isGenerating ? 'Generando...' : 'Compartir'}
                </Text>
              </View>
            </Button>
          </View>
        </View>
      </Modal>
    </Fragment>
  )
}
