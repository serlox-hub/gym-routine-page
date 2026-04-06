import { useState, useEffect, useMemo } from 'react'
import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { countSetsByMuscleGroup, normalizeToWeekly, buildVolumeSummary, getMuscleGroupColor, translateMuscleGroup, VOLUME_LANDMARKS, VOLUME_ZONE_COLORS, VOLUME_BAR_COLORS, VOLUME_LEGEND_ITEMS } from '@gym/shared'
import { useRoutineBlocks } from '../../hooks/useRoutines'
import { colors } from '../../lib/styles'

function VolumeSummary({ days, cycleDays = 7 }) {
  const { t } = useTranslation()
  const [allDaysBlocks, setAllDaysBlocks] = useState([])

  if (!days?.length) return null

  return (
    <View className="mt-4 px-4 mb-4">
      <Text className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
        {t('routine:volumeSummary')}
      </Text>
      {days.map((day, i) => (
        <DayBlocksCollector key={day.id} dayId={day.id} index={i} onBlocks={setAllDaysBlocks} />
      ))}
      <VolumeBars allDaysBlocks={allDaysBlocks} cycleDays={cycleDays} totalDays={days.length} />
    </View>
  )
}

function DayBlocksCollector({ dayId, index, onBlocks }) {
  const { data: blocks } = useRoutineBlocks(dayId)

  useEffect(() => {
    onBlocks(prev => {
      const next = [...prev]
      next[index] = blocks || []
      return next
    })
  }, [blocks, index, onBlocks])

  return null
}

function VolumeBars({ allDaysBlocks, cycleDays, totalDays }) {
  const summary = useMemo(() => {
    if (allDaysBlocks.length < totalDays) return []
    const cycleSets = countSetsByMuscleGroup(allDaysBlocks)
    const weeklySets = normalizeToWeekly(cycleSets, cycleDays)
    return buildVolumeSummary(weeklySets)
  }, [allDaysBlocks, cycleDays, totalDays])

  const allGroups = useMemo(() => {
    const summaryMap = new Map(summary.map(s => [s.name, s]))
    return Object.keys(VOLUME_LANDMARKS).map(name => {
      const existing = summaryMap.get(name)
      return existing || {
        name,
        sets: 0,
        zone: 'below_mv',
        landmarks: VOLUME_LANDMARKS[name],
      }
    })
  }, [summary])

  if (allGroups.length === 0) return null

  return (
    <View>
      <View className="gap-2.5">
        {allGroups.map(({ name, sets, zone, landmarks }) => (
          <VolumeRow key={name} name={name} sets={sets} zone={zone} landmarks={landmarks} />
        ))}
      </View>
      <VolumeLegend />
    </View>
  )
}


function VolumeRow({ name, sets, zone, landmarks }) {
  const color = getMuscleGroupColor(name)
  if (!landmarks) return null

  const mrv = landmarks.mrv
  const maxScale = mrv * 1.15
  const toPercent = (v) => (v / maxScale) * 100

  return (
    <View className="flex-row items-center gap-3">
      <View style={{ width: 112 }}>
        <Text className="text-xs font-medium" style={{ color }}>{translateMuscleGroup(name)}</Text>
      </View>
      <View className="flex-1 h-4">
        {/* Fondo con zonas coloreadas */}
        <View className="absolute inset-0 flex-row rounded-full overflow-hidden">
          <View style={{ width: `${toPercent(landmarks.mv)}%`, backgroundColor: VOLUME_BAR_COLORS.mv }} />
          <View style={{ width: `${toPercent(landmarks.mev - landmarks.mv)}%`, backgroundColor: VOLUME_BAR_COLORS.mev }} />
          <View style={{ width: `${toPercent(landmarks.mav - landmarks.mev)}%`, backgroundColor: VOLUME_BAR_COLORS.mav }} />
          <View style={{ width: `${toPercent(mrv - landmarks.mav)}%`, backgroundColor: VOLUME_BAR_COLORS.mrv }} />
          <View style={{ flex: 1, backgroundColor: VOLUME_BAR_COLORS.over }} />
        </View>
        {/* Marcadores de referencia (omitir los que estan en 0) */}
        {[landmarks.mv, landmarks.mev, landmarks.mav, mrv].filter(v => v > 0).map((val, i) => (
          <View
            key={i}
            className="absolute h-4"
            style={{ left: `${toPercent(val)}%`, width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }}
          />
        ))}
        {/* Indicador de series actuales */}
        {sets > 0 && (
          <View
            className="absolute h-4 rounded-full"
            style={{
              left: `${Math.min(toPercent(sets), 96)}%`,
              width: 4,
              backgroundColor: zone ? VOLUME_ZONE_COLORS[zone] : color,
            }}
          />
        )}
      </View>
      <View style={{ width: 80 }} className="items-end">
        <View className="flex-row items-center">
          <Text className="text-xs font-bold" style={{ color: zone ? VOLUME_ZONE_COLORS[zone] : colors.textPrimary }}>
            {Number.isInteger(sets) ? sets : sets.toFixed(1)}
          </Text>
          <Text className="text-xs" style={{ color: colors.textSecondary }}>
            /{mrv}
          </Text>
        </View>
      </View>
    </View>
  )
}

function VolumeLegend() {
  const { t } = useTranslation()
  return (
    <View
      className="mt-3 pt-3"
      style={{ borderTopWidth: 1, borderTopColor: colors.border }}
    >
      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        {VOLUME_LEGEND_ITEMS.map(({ label, description, color: bgColor }) => (
          <View key={label} className="flex-row items-center gap-1.5">
            <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: bgColor }} />
            <Text className="text-xs" style={{ color: colors.textSecondary }}>
              <Text className="font-medium">{label}</Text> {description}
            </Text>
          </View>
        ))}
      </View>
      <Text className="text-xs mt-2" style={{ color: colors.textSecondary }}>
        {t('routine:volumeReference')}
      </Text>
    </View>
  )
}

export default VolumeSummary
