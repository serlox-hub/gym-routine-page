import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Zap, Pause, X, Target, ChevronRight, Timer } from 'lucide-react'
import {
  useTrainingGoal, useViewedTrainingCycle, getTodayDateStr, getPaginationDots, STREAK_MAX_BACK,
} from '@gym/shared'
import { Card, Skeleton } from '../ui/index.js'
import { colors, gradients, design } from '../../lib/styles.js'
import StreakErrorState from './StreakErrorState.jsx'


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
// Más recorrido que esto ya es arrastre, no toque: al soltar no abre el día (mismo valor que native)
const TAP_MAX_DISTANCE_PX = 10
function PaginationDots({ current, min, max }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-3">
      {getPaginationDots(current, min, max).map(({ dotIndex, isActive, isEdge, size }) => {
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
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const goal = useTrainingGoal()
  const [cycleOffset, setCycleOffset] = useState(0)
  const [slideClass, setSlideClass] = useState('')
  const pointerStart = useRef(null)
  const dragOffset = useRef(0)
  const pressX = useRef(0)
  const moved = useRef(false)
  const contentRef = useRef(null)
  const isAnimating = useRef(false)

  // Devuelve false, sin animar nada, si la semana destino queda fuera del rango navegable
  const changeCycle = useCallback((direction) => {
    const newOffset = cycleOffset + direction
    if (newOffset < STREAK_MAX_BACK || newOffset > 0) return false

    isAnimating.current = true
    // El keyframe de salida no tiene `from`: arranca desde donde se soltó el dedo. Por eso el
    // contenido no se devuelve al centro antes de salir (se vería un salto atrás). El transform
    // inline se limpia al acabar la entrada, cuyos keyframes son explícitos y lo tapan mientras dura.
    const outClass = direction > 0 ? 'streak-slide-out-left' : 'streak-slide-out-right'
    setSlideClass(outClass)

    setTimeout(() => {
      setCycleOffset(newOffset)
      const inClass = direction > 0 ? 'streak-slide-in-right' : 'streak-slide-in-left'
      setSlideClass(inClass)
      setTimeout(() => {
        if (contentRef.current) contentRef.current.style.transform = ''
        setSlideClass('')
        isAnimating.current = false
      }, design.slideAnimDuration)
    }, design.slideAnimDuration)
    return true
  }, [cycleOffset])

  const handlePointerDown = (e) => {
    if (isAnimating.current) return
    const el = contentRef.current
    // Si se agarra mientras vuelve al centro, se sigue desde donde está: cortar la transición sin
    // más lo dejaría saltar a 0 bajo el dedo
    const base = el ? new DOMMatrixReadOnly(getComputedStyle(el).transform).m41 : 0
    if (el) {
      el.style.transition = 'none'
      el.style.transform = base ? `translateX(${base}px)` : ''
    }
    pointerStart.current = e.clientX - base
    dragOffset.current = base
    pressX.current = e.clientX
    moved.current = false
  }

  const handlePointerMove = (e) => {
    if (pointerStart.current === null) return
    if (Math.abs(e.clientX - pressX.current) > TAP_MAX_DISTANCE_PX) moved.current = true
    dragOffset.current = e.clientX - pointerStart.current
    if (contentRef.current) {
      contentRef.current.style.transform = `translateX(${dragOffset.current}px)`
    }
  }

  const handlePointerUp = () => {
    if (pointerStart.current === null) return
    pointerStart.current = null

    const offset = dragOffset.current
    dragOffset.current = 0
    const direction = offset > SWIPE_THRESHOLD ? -1 : offset < -SWIPE_THRESHOLD ? 1 : 0
    if (direction !== 0 && changeCycle(direction)) return

    // Sin cambio de semana (poco recorrido o en un extremo): vuelve al centro animado, no de golpe
    const el = contentRef.current
    if (el) {
      el.style.transition = `transform ${design.slideAnimDuration}ms ease-out`
      el.style.transform = ''
    }
  }

  const { streak } = goal
  const { chartData, chartMax, emptyBarValue, dateRangeLabel, progress, isRest, toggleViewedRest } = useViewedTrainingCycle(goal, cycleOffset, { translate: t, locale: i18n.language })

  if (goal.isLoading) {
    return (
      <section className="mb-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton width={140} height={20} />
            <Skeleton width={80} height={28} borderRadius={14} />
          </div>
          <Skeleton width="100%" height={32} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={design.chartHeight.web} borderRadius={6} />
        </Card>
      </section>
    )
  }
  // Sin sesiones no hay nada fiable que pintar: ni barras (vacías parecerían "no has entrenado") ni
  // racha ("Sin racha aún" sería falso). Solo el error.
  if (goal.sessionsError) {
    return (
      <section className="mb-4">
        <Card className="p-4">
          <StreakErrorState onRetry={goal.retry} />
        </Card>
      </section>
    )
  }
  const showStreakInfo = goal.isConfigured && goal.showWidget

  const todayStr = getTodayDateStr()

  const webChartData = chartData.map(d => ({
    ...d,
    barValue: d.durationMinutes > 0 ? d.durationMinutes : emptyBarValue,
  }))

  return (
    <section className="mb-4">
      <style>{`
        .streak-slide-out-left { animation: slideOutLeft 150ms ease-in forwards; }
        .streak-slide-out-right { animation: slideOutRight 150ms ease-in forwards; }
        .streak-slide-in-left { animation: slideInLeft 150ms ease-out forwards; }
        .streak-slide-in-right { animation: slideInRight 150ms ease-out forwards; }
        /* Sin from a propósito: la salida arranca desde el translateX inline donde se soltó el dedo (ver changeCycle) */
        @keyframes slideOutLeft { to { transform: translateX(-100%); opacity: 0; } }
        @keyframes slideOutRight { to { transform: translateX(100%); opacity: 0; } }
        @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
      <Card className="p-4 overflow-hidden">
        {/* Sin objetivo, el banner para configurarlo. Con las preferencias caídas no se sabe si lo hay
            (`isConfigured` null): el error en su sitio, y la gráfica sigue como sin objetivo. */}
        {goal.isConfigured === false && <SetupBanner />}
        {goal.preferencesError && <div className="mb-3"><StreakErrorState onRetry={goal.retry} /></div>}

        {/* Header: streak + pause (only when enabled). The toggle is a 44px box around its pill:
            -mt-2 (into the card's padding) and no bottom margin keep the title where it was. */}
        {showStreakInfo && (
          <div className="flex items-center justify-between -mt-2">
            <div className="flex items-center gap-1.5">
              <Zap size={16} style={{ color: streak > 0 ? colors.orange : colors.textMuted }} />
              <span style={{ color: streak > 0 ? colors.textPrimary : colors.textSecondary, fontSize: design.streakTitleSize, fontWeight: 700, letterSpacing: -0.3 }}>
                {streak > 0
                  ? t('common:preferences.streak', { count: streak })
                  : t('common:home.noStreakYet')
                }
              </span>
            </div>
            <button onClick={toggleViewedRest} className="min-h-11 flex items-center">
              <span
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
              >
                {isRest ? <X size={12} /> : <Pause size={12} />}
                {isRest ? t('common:preferences.removeRest') : t('common:preferences.rest')}
              </span>
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
            <span className="font-extrabold" style={{ color: isRest ? colors.textMuted : colors.textPrimary, fontSize: design.progressLabelSize, letterSpacing: -1 }}>
              {isRest ? '—' : `${progress.completed}/${progress.target}`}
            </span>
            <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: colors.borderSubtle, height: design.progressBarHeight }}>
              {!isRest && (
                <div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${gradients.lime[0]}, ${gradients.lime[1]})`,
                    width: `${progress.percent}%`,
                  }}
                />
              )}
            </div>
            <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 500 }}>
              {isRest ? t('common:home.paused') : t('common:home.days')}
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
          {/* La altura va en el ResponsiveContainer como número, no en un div padre con height
              en %: recharts mide -1x-1 en el primer render y avisa por consola en cada montaje.
              Con una altura fija ya resuelve sin esperar al ResizeObserver. */}
          <ResponsiveContainer width="100%" height={design.chartHeight.web}>
            <BarChart data={webChartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barGap={4}>
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
              <Bar
                dataKey="barValue"
                radius={[design.barRadius, design.barRadius, design.barRadius, design.barRadius]}
                maxBarSize={40}
                // Recharts anima cada cambio de datos desde las barras anteriores: al cambiar de semana,
                // las de la semana vieja entrarían deslizando y luego se transformarían en las nuevas.
                // Apagada del todo (tampoco crecen al cargar) por paridad: native no anima las barras
                isAnimationActive={false}
                onClick={(data) => {
                  if (moved.current) return
                  if (data?.durationMinutes > 0 && data.dateStr) {
                    navigate('/history', { state: { date: data.dateStr } })
                  }
                }}
              >
                {webChartData.map((entry, index) => {
                  const clickable = !isRest && entry.durationMinutes > 0
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={clickable ? 'url(#barGradient)' : colors.borderSubtle}
                      cursor={clickable ? 'pointer' : 'default'}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dot pagination */}
        <PaginationDots current={cycleOffset} min={STREAK_MAX_BACK} max={0} />
      </Card>
    </section>
  )
}

export default StreakCard
