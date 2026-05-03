import { useMemo, useRef, useState, useCallback } from 'react'
import { View, Text, Pressable, FlatList } from 'react-native'
import { useTranslation } from 'react-i18next'
import ViewShot from 'react-native-view-shot'
import { Share2, X } from 'lucide-react-native'
import { useCompletedSessionCount } from '@gym/shared'
import { Modal } from '../ui'
import { useShareWorkoutSummary } from '../../hooks/useShareWorkoutSummary'
import WorkoutSummaryCard from './WorkoutSummaryCard'
import PRCard from './PRCard'
import { colors } from '../../lib/styles'

const CARD_W = 540
const CARD_H = 960
const SCALE = 0.42
const SCALED_W = CARD_W * SCALE
const SCALED_H = CARD_H * SCALE
const SLIDE_W = 280 // un poco más ancho que SCALED_W (~227) para padding lateral

export default function WorkoutSummaryModal({ summaryData, isOpen, onClose }) {
  const { t } = useTranslation()
  const { generateAndShare, isGenerating } = useShareWorkoutSummary()
  const { data: sessionCount } = useCompletedSessionCount()

  // Slides: tarjeta resumen + 1 PR card por cada rep-PR detectado.
  const slides = useMemo(() => {
    if (!summaryData) return []
    const result = [{ kind: 'summary' }]
    for (const pr of summaryData.prs || []) {
      for (const detail of pr.details || []) {
        if (detail.type === 'repPR') {
          result.push({ kind: 'pr', exerciseName: pr.exerciseName, record: detail })
        }
      }
    }
    return result
  }, [summaryData])

  const viewShotRefs = useRef([])
  if (viewShotRefs.current.length !== slides.length) {
    viewShotRefs.current = slides.map((_, i) => viewShotRefs.current[i] || { current: null })
  }

  const [currentIndex, setCurrentIndex] = useState(0)

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index)
    }
  }).current

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current

  const handleShare = useCallback(() => {
    const ref = viewShotRefs.current[currentIndex]?.current
    if (ref) generateAndShare(ref, summaryData?.date)
  }, [currentIndex, generateAndShare, summaryData])

  if (!isOpen) return null

  const renderSlide = ({ item }) => (
    <View style={{ width: SLIDE_W, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: SCALED_W, height: SCALED_H, overflow: 'hidden', borderRadius: 12 }}>
        <View style={{
          transform: [
            { scale: SCALE },
            { translateX: -CARD_W * (1 - SCALE) / 2 },
            { translateY: -CARD_H * (1 - SCALE) / 2 },
          ],
        }}>
          {item.kind === 'summary' ? (
            <WorkoutSummaryCard summaryData={summaryData} sessionNumber={sessionCount} />
          ) : (
            <PRCard exerciseName={item.exerciseName} record={item.record} date={summaryData.date} />
          )}
        </View>
      </View>
    </View>
  )

  return (
    <>
      {/* Tarjetas a tamaño real para captura, fuera del viewport */}
      <View style={{ position: 'absolute', top: -3000, left: 0, width: CARD_W }} collapsable={false} pointerEvents="none">
        {slides.map((slide, i) => (
          <ViewShot key={i} ref={viewShotRefs.current[i]} options={{ format: 'png', quality: 1 }}>
            {slide.kind === 'summary' ? (
              <WorkoutSummaryCard summaryData={summaryData} sessionNumber={sessionCount} />
            ) : (
              <PRCard exerciseName={slide.exerciseName} record={slide.record} date={summaryData.date} />
            )}
          </ViewShot>
        ))}
      </View>

      <Modal isOpen={isOpen} onClose={onClose} position="center" className="p-0">
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-primary text-lg font-semibold">{t('workout:summary.title')}</Text>
            <Pressable onPress={onClose} hitSlop={8} className="p-1.5 active:opacity-60">
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ height: SCALED_H + 8, alignItems: 'center' }}>
            <FlatList
              data={slides}
              keyExtractor={(_, i) => `slide-${i}`}
              renderItem={renderSlide}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SLIDE_W}
              snapToAlignment="center"
              decelerationRate="fast"
              onViewableItemsChanged={handleViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              contentContainerStyle={{ paddingHorizontal: 0 }}
            />
          </View>

          {slides.length > 1 ? (
            <View className="flex-row justify-center gap-2 mt-3">
              {slides.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: i === currentIndex ? colors.success : colors.bgTertiary,
                  }}
                />
              ))}
            </View>
          ) : null}

          <View className="flex-row gap-3 mt-4">
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-lg"
              style={{ backgroundColor: colors.success }}
              onPress={handleShare}
              disabled={isGenerating}
            >
              <Share2 size={16} color={colors.textDark} />
              <Text style={{ color: colors.textDark, fontSize: 14, fontWeight: '500' }}>
                {isGenerating ? t('common:buttons.loading') : t('common:buttons.share')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  )
}
