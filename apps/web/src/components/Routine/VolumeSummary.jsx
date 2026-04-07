import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { countSetsByMuscleGroup, normalizeToWeekly, buildVolumeSummary, getMuscleGroupColor, getMuscleGroupName, useMuscleGroups, VOLUME_LANDMARKS, VOLUME_ZONE_COLORS, VOLUME_BAR_COLORS, VOLUME_LEGEND_ITEMS } from '@gym/shared'
import { useRoutineBlocks } from '../../hooks/useRoutines.js'
import { colors } from '../../lib/styles.js'

function VolumeSummary({ days, cycleDays = 7 }) {
  const { t } = useTranslation()
  const [allDaysBlocks, setAllDaysBlocks] = useState([])

  if (!days?.length) return null

  return (
    <section className="mt-4">
      <h3 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
        {t('routine:volumeSummary')}
      </h3>
      {days.map((day, i) => (
        <DayBlocksCollector key={day.id} dayId={day.id} index={i} onBlocks={setAllDaysBlocks} />
      ))}
      <VolumeBars allDaysBlocks={allDaysBlocks} cycleDays={cycleDays} totalDays={days.length} />
    </section>
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
  const { data: muscleGroups } = useMuscleGroups()

  const mgByName = useMemo(() => {
    const map = {}
    for (const mg of muscleGroups || []) map[mg.name] = mg
    return map
  }, [muscleGroups])

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
      return {
        ...(existing || { name, sets: 0, zone: 'below_mv', landmarks: VOLUME_LANDMARKS[name] }),
        muscleGroup: mgByName[name] || { name },
      }
    })
  }, [summary, mgByName])

  if (allGroups.length === 0) return null

  return (
    <div>
      <div className="space-y-2.5">
        {allGroups.map(({ name, muscleGroup, sets, zone, landmarks }) => (
          <VolumeRow key={name} name={name} muscleGroup={muscleGroup} sets={sets} zone={zone} landmarks={landmarks} />
        ))}
      </div>
      <VolumeLegend />
    </div>
  )
}


function VolumeRow({ name, muscleGroup, sets, zone, landmarks }) {
  const color = getMuscleGroupColor(name)
  if (!landmarks) return null

  const mrv = landmarks.mrv
  const maxScale = mrv * 1.15
  const toPercent = (v) => `${(v / maxScale) * 100}%`

  return (
    <div className="flex items-center gap-3">
      <div className="w-28 flex-shrink-0">
        <span className="text-xs font-medium" style={{ color }}>{getMuscleGroupName(muscleGroup)}</span>
      </div>
      <div className="flex-1 relative h-4">
        {/* Fondo con zonas coloreadas */}
        <div className="absolute inset-0 flex rounded-full overflow-hidden">
          <div style={{ width: toPercent(landmarks.mv), backgroundColor: VOLUME_BAR_COLORS.mv }} />
          <div style={{ width: toPercent(landmarks.mev - landmarks.mv), backgroundColor: VOLUME_BAR_COLORS.mev }} />
          <div style={{ width: toPercent(landmarks.mav - landmarks.mev), backgroundColor: VOLUME_BAR_COLORS.mav }} />
          <div style={{ width: toPercent(mrv - landmarks.mav), backgroundColor: VOLUME_BAR_COLORS.mrv }} />
          <div style={{ flex: 1, backgroundColor: VOLUME_BAR_COLORS.over }} />
        </div>
        {/* Marcadores de referencia (omitir los que estan en 0) */}
        {[landmarks.mv, landmarks.mev, landmarks.mav, mrv].filter(v => v > 0).map((val, i) => (
          <div
            key={i}
            className="absolute top-0 h-4 border-l"
            style={{ left: toPercent(val), borderColor: 'rgba(255,255,255,0.15)' }}
          />
        ))}
        {/* Indicador de series actuales */}
        {sets > 0 && (
          <div
            className="absolute top-0 h-4 w-1 rounded-full"
            style={{
              left: `min(${(sets / maxScale) * 100}%, calc(100% - 4px))`,
              backgroundColor: zone ? VOLUME_ZONE_COLORS[zone] : color,
            }}
          />
        )}
      </div>
      <div className="w-24 flex-shrink-0 text-right">
        <span className="text-xs font-bold" style={{ color: zone ? VOLUME_ZONE_COLORS[zone] : colors.textPrimary }}>
          {Number.isInteger(sets) ? sets : sets.toFixed(1)}
        </span>
        <span className="text-xs ml-0.5" style={{ color: colors.textMuted }}>
          /{mrv}
        </span>
      </div>
    </div>
  )
}

function VolumeLegend() {
  const { t } = useTranslation()
  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {VOLUME_LEGEND_ITEMS.map(({ label, description, color: bgColor }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: bgColor }} />
            <span className="text-xs" style={{ color: colors.textMuted }}>
              <span className="font-medium" style={{ color: colors.textSecondary }}>{label}</span> {description}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs mt-2" style={{ color: colors.textMuted }}>
        {t('routine:volumeReference')}
      </p>
    </div>
  )
}

export default VolumeSummary
