import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles.js'
import { DISTANCE_UNITS } from '@gym/shared'

// La distancia se guarda SIEMPRE en metros: esto elige en qué unidad se lee y se teclea, no
// convierte nada de lo guardado. Un remo se mide en metros y una cinta en kilómetros, así que la
// escala es del ejercicio y no una preferencia global (ver migración 060).
function DistanceUnitPicker({ value, onChange, label }) {
  const { t } = useTranslation()

  return (
    <div>
      <h4 className="text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
        {label || t('exercise:distanceUnit')}
      </h4>
      <div className="flex gap-2">
        {DISTANCE_UNITS.map(unit => {
          const isActive = value === unit
          return (
            <button
              key={unit}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(unit)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? colors.successBg : colors.bgTertiary,
                border: `1px solid ${isActive ? colors.success : colors.border}`,
                color: isActive ? colors.success : colors.textPrimary,
              }}
            >
              {unit}
            </button>
          )
        })}
      </div>
      <p className="text-xs mt-2" style={{ color: colors.textSecondary }}>
        {t('exercise:distanceUnitHelp')}
      </p>
    </div>
  )
}

export default DistanceUnitPicker
