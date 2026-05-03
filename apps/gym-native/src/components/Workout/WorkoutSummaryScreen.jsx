import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { View, Text, FlatList, Pressable, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import ViewShot from 'react-native-view-shot'
import { Share2, Home } from 'lucide-react-native'
import { useCompletedSessionCount } from '@gym/shared'
import { useShareWorkoutSummary } from '../../hooks/useShareWorkoutSummary'
import WorkoutSummaryCard from './WorkoutSummaryCard'
import PRCard from './PRCard'
import { colors } from '../../lib/styles'

const CARD_W = 540
const CARD_H = 960

function goHome(navigation) {
  navigation.reset({
    index: 0,
    routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Home' }] } }],
  })
}

export default function WorkoutSummaryScreen({ route, navigation }) {
  const { t } = useTranslation()
  const { generateAndShare, isGenerating } = useShareWorkoutSummary()
  const { data: sessionCount } = useCompletedSessionCount()

  const summaryData = route?.params?.summaryData

  // Slides: tarjeta resumen + 1 PR card por cada ejercicio con records
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

  // Refs a los ViewShot full-size (off-screen) para captura
  const viewShotRefs = useRef([])
  if (viewShotRefs.current.length !== slides.length) {
    viewShotRefs.current = slides.map((_, i) => viewShotRefs.current[i] || { current: null })
  }

  const [currentIndex, setCurrentIndex] = useState(0)
  const screenWidth = Dimensions.get('window').width
  // El preview escala el card 540x960 al ancho de pantalla menos un poco de margen
  const previewScale = Math.min((screenWidth - 32) / CARD_W, 0.7)
  const slideWidth = screenWidth

  useEffect(() => {
    if (!summaryData) goHome(navigation)
  }, [summaryData, navigation])

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

  const handleDismiss = () => goHome(navigation)

  if (!summaryData) return null

  const renderSlide = ({ item }) => (
    <View style={{ width: slideWidth, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: CARD_W * previewScale, height: CARD_H * previewScale, overflow: 'hidden', borderRadius: 16 }}>
        <View style={{ transform: [{ scale: previewScale }, { translateX: -CARD_W * (1 - previewScale) / 2 }, { translateY: -CARD_H * (1 - previewScale) / 2 }] }}>
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
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
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

      <View className="px-4 pt-2 pb-3">
        <Text className="text-primary text-xl font-bold text-center">{t('workout:summary.title')}</Text>
      </View>

      <View className="flex-1 justify-center">
        <FlatList
          data={slides}
          keyExtractor={(_, i) => `slide-${i}`}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        {slides.length > 1 ? (
          <View className="flex-row justify-center gap-2 mt-4">
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
      </View>

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
