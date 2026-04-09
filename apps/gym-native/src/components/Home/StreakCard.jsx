import { useMemo, useState, useRef } from 'react'
import { View, Text, Pressable, Animated, useWindowDimensions } from 'react-native'
import { useTranslation } from 'react-i18next'
import { BarChart } from 'react-native-gifted-charts'
import LinearGradient from 'react-native-linear-gradient'
import { Zap, Pause, X, Target, ChevronRight, Timer } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import {
  useTrainingGoal, useUpdateTrainingGoal,
  getCurrentCycleDays, getCurrentCycleProgress, getCurrentCycleKey,
  countSessionsByCycle, getCycleDateRange, formatShortDate,
  transformSessionsToCycleDurationChart,
  calculateChartMetrics, getTodayDateStr,
} from '@gym/shared'
import { Card } from '../ui'
import { colors, gradients, design } from '../../lib/styles'

const CYCLE_LENGTH = 7
const MAX_BACK = -12
const SWIPE_THRESHOLD = design.swipeThreshold

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
const MAX_DOTS = 5

function PaginationDots({ current, min, max }) {
  const total = max - min + 1
  const index = current - min

  let windowStart
  if (total <= MAX_DOTS) {
    windowStart = 0
  } else if (index <= 1) {
    windowStart = 0
  } else if (index >= total - 2) {
    windowStart = total - MAX_DOTS
  } else {
    windowStart = index - 2
  }

  const visibleCount = Math.min(total, MAX_DOTS)

  return (
    <View className="flex-row items-center justify-center gap-1.5 mt-3">
      {[...Array(visibleCount)].map((_, i) => {
        const dotIndex = windowStart + i
        const isActive = dotIndex === index
        const distFromEdge = Math.min(i, visibleCount - 1 - i)
        const isEdge = total > MAX_DOTS && distFromEdge === 0 && !isActive
        const size = isActive ? 8 : isEdge ? 4 : 6

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
  const { t } = useTranslation()
  const { width: screenWidth } = useWindowDimensions()
  const goal = useTrainingGoal()
  const updatePreference = useUpdateTrainingGoal()
  const [cycleOffset, setCycleOffset] = useState(0)
  const translateX = useRef(new Animated.Value(0)).current
  const touchStartX = useRef(0)
  const isAnimating = useRef(false)
  const offsetRef = useRef(cycleOffset)
  offsetRef.current = cycleOffset

  const handleTouchStart = (e) => {
    if (isAnimating.current) return
    touchStartX.current = e.nativeEvent.pageX
  }

  const handleTouchEnd = (e) => {
    if (isAnimating.current) return
    const diff = e.nativeEvent.pageX - touchStartX.current
    if (Math.abs(diff) < SWIPE_THRESHOLD) return

    const direction = diff > 0 ? -1 : 1
    const newOffset = offsetRef.current + direction
    if (newOffset < MAX_BACK || newOffset > 0) return

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
  }

  const { streak, restCycles = [], sessions = [], daysPerCycle, weekStartDay = 'monday' } = goal.isConfigured ? goal : {}
  const referenceDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + cycleOffset * CYCLE_LENGTH)
    return d
  }, [cycleOffset])

  const sessionsByCycle = useMemo(
    () => sessions.length ? countSessionsByCycle(sessions, CYCLE_LENGTH, weekStartDay) : {},
    [sessions, weekStartDay]
  )

  const viewedCycleDays = useMemo(
    () => getCurrentCycleDays(sessions, CYCLE_LENGTH, referenceDate, weekStartDay),
    [sessions, referenceDate, weekStartDay]
  )

  const chartData = useMemo(
    () => transformSessionsToCycleDurationChart(viewedCycleDays, sessions),
    [viewedCycleDays, sessions]
  )

  const dateRangeLabel = useMemo(() => {
    const { start, end } = getCycleDateRange(CYCLE_LENGTH, referenceDate, weekStartDay)
    return `${formatShortDate(start)} – ${formatShortDate(end)}`
  }, [referenceDate, weekStartDay])

  if (goal.isLoading) return null
  const showStreakInfo = goal.isConfigured && goal.showWidget

  const viewedCycleKey = getCurrentCycleKey(CYCLE_LENGTH, referenceDate, weekStartDay)
  const viewedProgress = getCurrentCycleProgress(sessionsByCycle, daysPerCycle, CYCLE_LENGTH, referenceDate, weekStartDay)
  const viewedIsRest = restCycles.includes(viewedCycleKey)

  const handleToggleRestCycle = () => {
    const newRestCycles = viewedIsRest
      ? restCycles.filter(k => k !== viewedCycleKey)
      : [...restCycles, viewedCycleKey]
    updatePreference.mutate({ key: 'training_rest_weeks', value: newRestCycles })
  }

  const todayStr = getTodayDateStr()
  const { chartMax, emptyBarValue } = calculateChartMetrics(chartData)

  const restBarData = chartData.map(d => ({
    value: emptyBarValue,
    label: d.label,
    frontColor: colors.borderSubtle,
    gradientColor: colors.borderSubtle,
    labelTextStyle: {
      color: d.dateStr <= todayStr ? colors.success : colors.textMuted,
      fontSize: design.labelSize,
      fontWeight: d.dateStr <= todayStr ? '600' : '500',
    },
  }))

  const barData = chartData.map(d => ({
    value: d.durationMinutes > 0 ? d.durationMinutes : emptyBarValue,
    label: d.label,
    durationMinutes: d.durationMinutes,
    frontColor: d.durationMinutes > 0 ? gradients.lime[1] : colors.borderSubtle,
    gradientColor: d.durationMinutes > 0 ? gradients.lime[0] : colors.borderSubtle,
    labelTextStyle: {
      color: d.dateStr <= todayStr ? colors.success : colors.textMuted,
      fontSize: design.labelSize,
      fontWeight: d.dateStr <= todayStr ? '600' : '500',
    },
  }))

  return (
    <View className="mb-4">
      <Card className="p-4 overflow-hidden">
        {/* Setup banner when not configured */}
        {!goal.isConfigured && <SetupBanner />}

        {/* Header: streak + pause (only when enabled) */}
        {showStreakInfo && (
          <View className="flex-row items-center justify-between mb-1">
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
              onPress={handleToggleRestCycle}
              className="flex-row items-center gap-1 px-3 py-1.5 rounded-full"
              style={{ borderWidth: 1, borderColor: colors.border }}
            >
              {viewedIsRest
                ? <X size={12} color={colors.textSecondary} />
                : <Pause size={12} color={colors.textSecondary} />
              }
              <Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                {viewedIsRest ? t('common:preferences.removeRest') : t('common:preferences.rest')}
              </Text>
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
            <Text style={{ color: viewedIsRest ? colors.textMuted : colors.textPrimary, fontSize: design.progressLabelSize, fontWeight: '800', letterSpacing: -1 }}>
              {viewedIsRest ? '—' : `${viewedProgress.completed}/${viewedProgress.target}`}
            </Text>
            <View className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: colors.borderSubtle, height: design.progressBarHeight }}>
              {!viewedIsRest && (
                <LinearGradient
                  colors={gradients.lime}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    width: `${Math.min((viewedProgress.completed / viewedProgress.target) * 100, 100)}%`,
                  }}
                />
              )}
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500' }}>
              {viewedIsRest ? t('common:home.paused') : t('common:home.days')}
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
          <View style={{ marginLeft: -10 }}>
            <BarChart
              data={viewedIsRest ? restBarData : barData}
              maxValue={chartMax}
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
              showGradient={!viewedIsRest}
              renderTooltip={(item) => {
                if (!item.durationMinutes) return null
                return (
                  <View style={{ backgroundColor: colors.bgTertiary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.border, position: 'absolute', bottom: -30 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 11 }}>{item.durationMinutes} min</Text>
                  </View>
                )
              }}
            />
          </View>
        </Animated.View>

        {/* Dot pagination */}
        <PaginationDots current={cycleOffset} min={MAX_BACK} max={0} />
      </Card>
    </View>
  )
}

export default StreakCard
