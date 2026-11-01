import { useMemo, useRef, useCallback } from 'react'
import { View, Text, Pressable, Animated, PanResponder, useWindowDimensions } from 'react-native'
import { useTranslation } from 'react-i18next'
import { BarChart } from 'react-native-gifted-charts'
import LinearGradient from 'react-native-linear-gradient'
import { Zap, Pause, X, Target, ChevronRight, Timer } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import {
  useTrainingGoal, useViewedTrainingCycle, useHomeCycleOffset, useHomeWeekStore, getTodayDateStr,
  getPaginationDots, getChartMaxWithLabelRoom, STREAK_MAX_BACK,
} from '@gym/shared'
import { Card, Skeleton } from '../ui'
import { colors, gradients, design } from '../../lib/styles'
import StreakErrorState from './StreakErrorState'

const SWIPE_THRESHOLD = design.swipeThreshold
const TAP_MAX_DISTANCE_PX = 10

function SetupBanner() {
  const { t } = useTranslation()
  const navigation = useNavigation()

  return (
    <Pressable
      onPress={() => navigation.navigate('Preferences', { scrollTo: 'training-goal' })}
      className="flex-row items-center mb-3"
      style={{
        backgroundColor: colors.successBg,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 12,
      }}
    >
      <Target size={20} color={colors.success} />
      <View className="flex-1">
        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
          {t('common:home.setWeeklyGoal')}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>
          {t('common:preferences.trackConsistency')}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  )
}
function PaginationDots({ current, min, max }) {
  return (
    <View className="flex-row items-center justify-center gap-1.5 mt-3">
      {getPaginationDots(current, min, max).map(({ dotIndex, isActive, isEdge, size }) => {
        return (
          <View
            key={dotIndex}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: isActive ? colors.success : colors.textMuted,
              opacity: isEdge ? 0.5 : 1,
            }}
          />
        )
      })}
    </View>
  )
}

function StreakCard() {
  const { t, i18n } = useTranslation()
  const { width: screenWidth } = useWindowDimensions()
  const navigation = useNavigation()
  const goal = useTrainingGoal()
  // In a store, not local state: the stats row under the card shows the same week
  const cycleOffset = useHomeCycleOffset()
  const setCycleOffset = useHomeWeekStore(state => state.setCycleOffset)
  const translateX = useRef(new Animated.Value(0)).current
  const touchStartX = useRef(0)
  const isAnimating = useRef(false)
  const offsetRef = useRef(cycleOffset)
  offsetRef.current = cycleOffset
  const chartWidthRef = useRef(0)
  const barDataRef = useRef([])
  const chartTouchActiveRef = useRef(false)
  const pressXRef = useRef(0)

  const triggerSwipe = useCallback((direction) => {
    const newOffset = offsetRef.current + direction
    if (newOffset < STREAK_MAX_BACK || newOffset > 0) return
    isAnimating.current = true
    const slideOut = direction > 0 ? -screenWidth : screenWidth
    Animated.timing(translateX, { toValue: slideOut, duration: design.slideAnimDuration, useNativeDriver: true }).start(() => {
      setCycleOffset(newOffset)
      offsetRef.current = newOffset
      translateX.setValue(-slideOut)
      Animated.timing(translateX, { toValue: 0, duration: design.slideAnimDuration, useNativeDriver: true }).start(() => {
        isAnimating.current = false
      })
    })
  }, [screenWidth, translateX, setCycleOffset])

  const handleTouchStart = (e) => {
    if (isAnimating.current) return
    touchStartX.current = e.nativeEvent.pageX
  }

  const handleTouchEnd = (e) => {
    if (isAnimating.current) return
    if (chartTouchActiveRef.current) {
      chartTouchActiveRef.current = false
      return
    }
    const diff = e.nativeEvent.pageX - touchStartX.current
    if (Math.abs(diff) < SWIPE_THRESHOLD) return
    triggerSwipe(diff > 0 ? -1 : 1)
  }

  const { streak } = goal
  const { chartData, chartMax, emptyBarValue, dateRangeLabel, progress, isRest, toggleViewedRest } = useViewedTrainingCycle(goal, cycleOffset, { translate: t, locale: i18n.language })

  const barIndexFromX = (x) => {
    const w = chartWidthRef.current
    const data = barDataRef.current
    if (!w || !data.length) return -1
    const slot = w / data.length
    return Math.max(0, Math.min(data.length - 1, Math.floor(x / slot)))
  }

  const chartPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      chartTouchActiveRef.current = true
      pressXRef.current = e.nativeEvent.locationX
    },
    // A tap however long the finger stays down: only the distance tells it from a swipe (like web)
    onPanResponderRelease: (e, gs) => {
      const dx = Math.abs(gs.dx)
      const dy = Math.abs(gs.dy)
      if (dx < TAP_MAX_DISTANCE_PX && dy < TAP_MAX_DISTANCE_PX) {
        const idx = barIndexFromX(pressXRef.current)
        const item = barDataRef.current[idx]
        if (item?.durationMinutes > 0 && item.dateStr) {
          navigation.navigate('History', { date: item.dateStr })
        }
        return
      }
      if (Math.abs(gs.dx) >= SWIPE_THRESHOLD) {
        triggerSwipe(gs.dx > 0 ? -1 : 1)
      }
    },
    onPanResponderTerminate: () => {
      chartTouchActiveRef.current = false
    },
  }), [navigation, triggerSwipe])

  if (goal.isLoading) {
    return (
      <View className="mb-4">
        <Card className="p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Skeleton width={140} height={20} />
            <Skeleton width={80} height={28} borderRadius={14} />
          </View>
          <Skeleton width="100%" height={32} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={design.chartHeight.native} borderRadius={6} />
        </Card>
      </View>
    )
  }
  // Sin sesiones no hay nada fiable que pintar: ni barras (vacías parecerían "no has entrenado") ni
  // racha ("Sin racha aún" sería falso). Solo el error.
  if (goal.sessionsError) {
    return (
      <View className="mb-4">
        <Card className="p-4">
          <StreakErrorState onRetry={goal.retry} />
        </Card>
      </View>
    )
  }
  const showStreakInfo = goal.isConfigured && goal.showWidget

  const todayStr = getTodayDateStr()

  const axisMax = getChartMaxWithLabelRoom(chartMax, design.chartHeight.native, design.chartBarLabelHeight)

  const barData = chartData.map(d => {
    const showLime = !isRest && d.durationMinutes > 0
    return {
      value: d.durationMinutes > 0 ? d.durationMinutes : emptyBarValue,
      label: d.label,
      durationMinutes: d.durationMinutes,
      dateStr: d.dateStr,
      disablePress: true,
      frontColor: showLime ? gradients.lime[1] : colors.borderSubtle,
      gradientColor: showLime ? gradients.lime[0] : colors.borderSubtle,
      labelTextStyle: {
        color: d.dateStr <= todayStr ? colors.success : colors.textMuted,
        fontSize: design.labelSize,
        fontWeight: d.dateStr <= todayStr ? '600' : '500',
      },
      // An empty day's bar is a placeholder (`emptyBarValue`), not minutes: no label. The library
      // stacks the label at the bottom of a box over the bar, so it sits right on top of it.
      topLabelComponent: d.durationMinutes > 0
        ? () => (
          <Text style={{ color: colors.textMuted, fontSize: design.labelSize, fontWeight: '500' }}>
            {d.durationMinutes}
          </Text>
        )
        : null,
    }
  })
  barDataRef.current = barData

  return (
    <View className="mb-4">
      <Card className="p-4 overflow-hidden">
        {/* Sin objetivo, el banner para configurarlo. Con las preferencias caídas no se sabe si lo hay
            (`isConfigured` null): el error en su sitio, y la gráfica sigue como sin objetivo. */}
        {goal.isConfigured === false && <SetupBanner />}
        {goal.preferencesError && <View className="mb-3"><StreakErrorState onRetry={goal.retry} /></View>}

        {/* Header: streak + pause (only when enabled). The toggle is a 44pt box around its pill:
            marginTop -8 (into the card's padding) and no bottom margin keep the title where it was. */}
        {showStreakInfo && (
          <View className="flex-row items-center justify-between" style={{ marginTop: -8 }}>
            <View className="flex-row items-center gap-1.5">
              <Zap size={16} color={streak > 0 ? colors.orange : colors.textMuted} />
              <Text style={{ color: streak > 0 ? colors.textPrimary : colors.textSecondary, fontSize: design.streakTitleSize, fontWeight: '700', letterSpacing: -0.3 }}>
                {streak > 0
                  ? t('common:preferences.streak', { count: streak })
                  : t('common:home.noStreakYet')
                }
              </Text>
            </View>
            <Pressable
              onPress={toggleViewedRest}
              accessibilityRole="button"
              style={{ minHeight: design.minTouchTarget, justifyContent: 'center' }}
            >
              <View
                className="flex-row items-center gap-1 px-3 py-1.5 rounded-full"
                style={{ borderWidth: 1, borderColor: colors.border }}
              >
                {isRest
                  ? <X size={12} color={colors.textSecondary} />
                  : <Pause size={12} color={colors.textSecondary} />
                }
                <Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                  {isRest ? t('common:preferences.removeRest') : t('common:preferences.rest')}
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Swipeable content */}
        <Animated.View
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ transform: [{ translateX }] }}
        >
          {showStreakInfo && (<>
          {/* Progress */}
          <View className="flex-row items-center gap-3 mb-3">
            <Text style={{ color: isRest ? colors.textMuted : colors.textPrimary, fontSize: design.progressLabelSize, fontWeight: '800', letterSpacing: -1 }}>
              {isRest ? '—' : `${progress.completed}/${progress.target}`}
            </Text>
            <View className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: colors.borderSubtle, height: design.progressBarHeight }}>
              {!isRest && (
                <LinearGradient
                  colors={gradients.lime}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    width: `${progress.percent}%`,
                  }}
                />
              )}
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500' }}>
              {isRest ? t('common:home.paused') : t('common:home.days')}
            </Text>
          </View>
          </>)}

          {/* Date range + chart label */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[11px]" style={{ color: colors.textMuted }}>
              {dateRangeLabel}
            </Text>
            <View className="flex-row items-center gap-1">
              <Timer size={10} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>{t('common:home.workoutDuration')}</Text>
            </View>
          </View>

          {/* Chart */}
          <View
            style={{ marginLeft: -10 }}
            onLayout={(e) => { chartWidthRef.current = e.nativeEvent.layout.width }}
            {...chartPanResponder.panHandlers}
          >
            <BarChart
              data={barData}
              maxValue={axisMax}
              height={design.chartHeight.native}
              barWidth={36}
              spacing={8}
              initialSpacing={8}
              endSpacing={8}
              barBorderTopLeftRadius={design.barRadius}
              barBorderTopRightRadius={design.barRadius}
              barBorderBottomLeftRadius={design.barRadius}
              barBorderBottomRightRadius={design.barRadius}
              yAxisColor="transparent"
              xAxisColor="transparent"
              hideYAxisText
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: design.labelSize, fontWeight: '500' }}
              hideRules
              noOfSections={3}
              adjustToWidth
              showGradient={!isRest}
            />
          </View>
        </Animated.View>

        {/* Dot pagination */}
        <PaginationDots current={cycleOffset} min={STREAK_MAX_BACK} max={0} />
      </Card>
    </View>
  )
}

export default StreakCard
