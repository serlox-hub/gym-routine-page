import { useMemo, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Zap, Pause, X, Target, ChevronRight, Timer } from 'lucide-react'
import {
  useTrainingGoal, useUpdateTrainingGoal,
  getCurrentCycleDays, getCurrentCycleProgress, getCurrentCycleKey,
  countSessionsByCycle, getCycleDateRange, formatShortDate,
  transformSessionsToCycleDurationChart,
  calculateChartMetrics, getTodayDateStr,
} from '@gym/shared'
import { Card } from '../ui/index.js'
import { colors, gradients, design } from '../../lib/styles.js'

const CYCLE_LENGTH = 7
const MAX_BACK = -12

function SetupBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      className="flex items-center cursor-pointer mb-3"
      onClick={() => navigate('/preferences', { state: { scrollTo: 'training-goal' } })}
      style={{
        backgroundColor: colors.successBg,
        borderRadius: 12,
        padding: '12px 14px',
        gap: 12,
      }}
    >
      <Target size={20} style={{ color: colors.success }} />
      <div className="flex-1">
        <span style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 600 }}>
          {t('common:home.setWeeklyGoal')}
        </span>
        <p style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>
          {t('common:preferences.trackConsistency')}
        </p>
      </div>
      <ChevronRight size={18} style={{ color: colors.textMuted }} />
    </div>
  )
}
const SWIPE_THRESHOLD = design.swipeThreshold
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
    <div className="flex items-center justify-center gap-1.5 mt-3">
      {[...Array(visibleCount)].map((_, i) => {
        const dotIndex = windowStart + i
        const isActive = dotIndex === index
        const distFromEdge = Math.min(i, visibleCount - 1 - i)
        const isEdge = total > MAX_DOTS && distFromEdge === 0 && !isActive
        const size = isActive ? 8 : isEdge ? 4 : 6

        return (
          <div
            key={dotIndex}
            className="rounded-full"
            style={{
              width: size,
              height: size,
              backgroundColor: isActive ? colors.success : colors.textMuted,
              opacity: isEdge ? 0.5 : 1,
              transition: 'all 200ms ease',
            }}
          />
        )
      })}
    </div>
  )
}

function StreakCard() {
  const { t } = useTranslation()
  const goal = useTrainingGoal()
  const updatePreference = useUpdateTrainingGoal()
  const [cycleOffset, setCycleOffset] = useState(0)
  const [slideClass, setSlideClass] = useState('')
  const pointerStart = useRef(null)
  const dragOffset = useRef(0)
  const contentRef = useRef(null)
  const isAnimating = useRef(false)

  const changeCycle = useCallback((direction) => {
    const newOffset = cycleOffset + direction
    if (newOffset < MAX_BACK || newOffset > 0) return

    isAnimating.current = true
    const outClass = direction > 0 ? 'streak-slide-out-left' : 'streak-slide-out-right'
    setSlideClass(outClass)

    setTimeout(() => {
      setCycleOffset(newOffset)
      const inClass = direction > 0 ? 'streak-slide-in-right' : 'streak-slide-in-left'
      setSlideClass(inClass)
      setTimeout(() => {
        setSlideClass('')
        isAnimating.current = false
      }, design.slideAnimDuration)
    }, design.slideAnimDuration)
  }, [cycleOffset])

  const handlePointerDown = (e) => {
    if (isAnimating.current) return
    pointerStart.current = e.clientX
    dragOffset.current = 0
    if (contentRef.current) {
      contentRef.current.style.transition = 'none'
    }
  }

  const handlePointerMove = (e) => {
    if (pointerStart.current === null) return
    dragOffset.current = e.clientX - pointerStart.current
    if (contentRef.current) {
      contentRef.current.style.transform = `translateX(${dragOffset.current}px)`
    }
  }

  const handlePointerUp = () => {
    if (pointerStart.current === null) return
    pointerStart.current = null

    if (contentRef.current) {
      contentRef.current.style.transition = ''
      contentRef.current.style.transform = ''
    }

    if (dragOffset.current > SWIPE_THRESHOLD) {
      changeCycle(-1)
    } else if (dragOffset.current < -SWIPE_THRESHOLD) {
      changeCycle(1)
    }
    dragOffset.current = 0
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

  const todayStr = getTodayDateStr()
  const { chartMax, emptyBarValue } = calculateChartMetrics(chartData)

  const webChartData = chartData.map(d => ({
    ...d,
    barValue: d.durationMinutes > 0 ? d.durationMinutes : emptyBarValue,
  }))

  const restChartData = chartData.map(d => ({
    ...d,
    durationMinutes: 0,
    barValue: emptyBarValue,
  }))

  const handleToggleRestCycle = () => {
    const newRestCycles = viewedIsRest
      ? restCycles.filter(k => k !== viewedCycleKey)
      : [...restCycles, viewedCycleKey]
    updatePreference.mutate({ key: 'training_rest_weeks', value: newRestCycles })
  }

  return (
    <section className="mb-4">
      <style>{`
        .streak-slide-out-left { animation: slideOutLeft 150ms ease-in forwards; }
        .streak-slide-out-right { animation: slideOutRight 150ms ease-in forwards; }
        .streak-slide-in-left { animation: slideInLeft 150ms ease-out forwards; }
        .streak-slide-in-right { animation: slideInRight 150ms ease-out forwards; }
        @keyframes slideOutLeft { to { transform: translateX(-100%); opacity: 0; } }
        @keyframes slideOutRight { to { transform: translateX(100%); opacity: 0; } }
        @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
      <Card className="p-4 overflow-hidden">
        {/* Setup banner when not configured */}
        {!goal.isConfigured && <SetupBanner />}

        {/* Header: streak + pause (only when enabled) */}
        {showStreakInfo && (
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Zap size={16} style={{ color: streak > 0 ? colors.orange : colors.textMuted }} />
              <span style={{ color: streak > 0 ? colors.textPrimary : colors.textSecondary, fontSize: design.streakTitleSize, fontWeight: 700, letterSpacing: -0.3 }}>
                {streak > 0
                  ? t('common:preferences.streak', { count: streak })
                  : t('common:home.noStreakYet')
                }
              </span>
            </div>
            <button
              onClick={handleToggleRestCycle}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
            >
              {viewedIsRest ? <X size={12} /> : <Pause size={12} />}
              {viewedIsRest ? t('common:preferences.removeRest') : t('common:preferences.rest')}
            </button>
          </div>
        )}

        {/* Swipeable content */}
        <div
          ref={contentRef}
          className={slideClass}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'pan-y', userSelect: 'none' }}
        >
          {showStreakInfo && (<>
          {/* Progress */}
          <div className="flex items-center gap-3 mb-3">
            <span className="font-extrabold" style={{ color: viewedIsRest ? colors.textMuted : colors.textPrimary, fontSize: design.progressLabelSize, letterSpacing: -1 }}>
              {viewedIsRest ? '—' : `${viewedProgress.completed}/${viewedProgress.target}`}
            </span>
            <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: colors.borderSubtle, height: design.progressBarHeight }}>
              {!viewedIsRest && (
                <div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${gradients.lime[0]}, ${gradients.lime[1]})`,
                    width: `${Math.min((viewedProgress.completed / viewedProgress.target) * 100, 100)}%`,
                  }}
                />
              )}
            </div>
            <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 500 }}>
              {viewedIsRest ? t('common:home.paused') : t('common:home.days')}
            </span>
          </div>
          </>)}

          {/* Date range + chart label */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px]" style={{ color: colors.textMuted }}>
              {dateRangeLabel}
            </span>
            <span className="flex items-center gap-1" style={{ color: colors.textMuted }}>
              <Timer size={10} />
              <span style={{ fontSize: 10 }}>{t('common:home.workoutDuration')}</span>
            </span>
          </div>

          {/* Chart */}
          <div style={{ height: design.chartHeight.web }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={viewedIsRest ? restChartData : webChartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barGap={4}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={gradients.lime[0]} />
                    <stop offset="100%" stopColor={gradients.lime[1]} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={({ x, y, payload, index }) => {
                    const entry = chartData[index]
                    const isPastOrToday = entry && entry.dateStr <= todayStr
                    return (
                      <text x={x} y={y + 12} textAnchor="middle" fill={isPastOrToday ? colors.success : colors.textMuted} fontSize={11} fontWeight={isPastOrToday ? 600 : 500}>
                        {payload.value}
                      </text>
                    )
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={[0, chartMax]} hide />
                <Tooltip
                  cursor={false}
                  position={{ y: design.chartHeight.web - 20 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const mins = payload[0].payload.durationMinutes
                    if (!mins) return null
                    return (
                      <div className="rounded px-2 py-1" style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}>
                        <span style={{ color: colors.textPrimary, fontSize: 11 }}>{mins} min</span>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="barValue" radius={[design.barRadius, design.barRadius, design.barRadius, design.barRadius]} maxBarSize={40}>
                  {(viewedIsRest ? restChartData : webChartData).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={!viewedIsRest && entry.durationMinutes > 0 ? 'url(#barGradient)' : colors.borderSubtle}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dot pagination */}
        <PaginationDots current={cycleOffset} min={MAX_BACK} max={0} />
      </Card>
    </section>
  )
}

export default StreakCard
