import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { colors, design } from '../../lib/styles.js'
import {
  FIELD_ORDER,
  MAX_TRACKED_FIELDS,
  formatTrackedFieldConflict,
  formatTrackedFieldsLabel,
  getBlockingTrackedField,
  getFieldName,
  toggleTrackedField,
} from '@gym/shared'

// Qué mide un ejercicio: chips de campo en el orden canónico de columnas (FIELD_ORDER), con la
// etiqueta resultante ("Nivel × Distancia × Tiempo") derivada de lo marcado. Sustituye al
// desplegable de 12 combinaciones fijas, que no cubría casos de tres métricas como la bici.
// Al llegar al máximo los no marcados se deshabilitan, en vez de dejar pulsar y no pasar nada.
// Weight and assistance exclude each other: the other's chip is BLOCKED (dimmed but it answers) and
// says why when pressed, inline (the form can live inside a modal).
function TrackedFieldsPicker({ value, onChange, required = true }) {
  const { t } = useTranslation()
  const [conflictNotice, setConflictNotice] = useState(null)
  const selected = value || []
  const atMax = selected.length >= MAX_TRACKED_FIELDS

  const handlePress = (field, blocker) => {
    if (blocker) {
      setConflictNotice(formatTrackedFieldConflict(field, blocker))
      return
    }
    setConflictNotice(null)
    onChange(toggleTrackedField(selected, field))
  }

  return (
    <div>
      <label className="text-sm text-secondary block">
        {t('exercise:trackedFields')}{required && <span style={{ color: colors.danger }}> *</span>}
      </label>

      {/* Altura reservada aunque no haya nada marcado: si apareciera y desapareciera, los chips
          saltarían al desmarcar el último. */}
      <p className="text-sm font-semibold mb-2" style={{ color: colors.success, minHeight: 20 }}>
        {formatTrackedFieldsLabel(selected)}
      </p>

      <div className="flex flex-wrap gap-2">
        {FIELD_ORDER.map(field => {
          const isSelected = selected.includes(field)
          const blocker = getBlockingTrackedField(selected, field)
          const isDisabled = !isSelected && !blocker && atMax
          return (
            <button
              key={field}
              type="button"
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-disabled={blocker ? true : undefined}
              onClick={() => handlePress(field, blocker)}
              className="min-h-11 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: isSelected ? colors.successBg : colors.bgTertiary,
                border: `1px solid ${isSelected ? colors.success : colors.border}`,
                color: isSelected ? colors.success : colors.textPrimary,
                opacity: isDisabled ? 0.4 : blocker ? design.blockedOpacity : 1,
                cursor: isDisabled ? 'default' : 'pointer',
              }}
            >
              {getFieldName(field)}
            </button>
          )
        })}
      </div>

      {conflictNotice && (
        <p role="status" className="text-xs mt-2" style={{ color: colors.warning }}>
          {conflictNotice}
        </p>
      )}

      <p className="text-xs mt-2" style={{ color: colors.textSecondary }}>
        {t('exercise:trackedFieldsHelp')}
      </p>
    </div>
  )
}

export default TrackedFieldsPicker
