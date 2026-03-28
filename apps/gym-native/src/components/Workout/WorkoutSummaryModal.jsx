import { useRef, Fragment } from 'react'
import { View, Text, Pressable } from 'react-native'
import ViewShot from 'react-native-view-shot'
import { Share2, X } from 'lucide-react-native'
import { useCompletedSessionCount } from '@gym/shared'
import { Modal } from '../ui'
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
            <Pressable onPress={onClose} className="p-1.5">
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View
            style={{ maxHeight: 420, alignItems: 'center', overflow: 'hidden' }}
          >
            <View style={{ transform: [{ scale: 0.42 }], marginVertical: -280 }}>
              <WorkoutSummaryCard summaryData={summaryData} sessionNumber={sessionCount} />
            </View>
          </View>

          <View className="flex-row gap-3 mt-4">
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-lg"
              style={{ backgroundColor: colors.accent }}
              onPress={handleShare}
              disabled={isGenerating}
            >
              <Share2 size={16} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '500' }}>
                {isGenerating ? 'Generando...' : 'Compartir'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Fragment>
  )
}
