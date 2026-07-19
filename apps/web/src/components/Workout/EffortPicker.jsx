import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles.js'
import { getEffortOptions, getEffortLabel, getEffortInfo, formatEffortBadge, measurementTypeUsesReps } from '@gym/shared'

/**
 * Chip de esfuerzo (RIR/RPE) inline en la fila de serie + popover de selección.
 * Un toque abre el popover sobre el chip; elegir un valor lo guarda y cierra.
 * Reutilizar el mismo valor lo deselecciona (null). Sustituye a la sección de
 * esfuerzo del antiguo modal-al-completar (ver issue #8).
 * El popover es una COLUMNA: RIR muestra «código · palabra» (F · Fallo…) con cabecera
 * explicativa; RPE muestra la palabra directa (issue #10, punto 6 — RIR autoexplicable).
 */
export default function EffortPicker({ value, onChange, measurementType, emptyDash = false, active = false }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(true)
  const containerRef = useRef(null)
  const chipRef = useRef(null)
  const options = getEffortOptions(measurementType)
  const usesReps = measurementTypeUsesReps(measurementType)
  const hasValue = value != null
  // Borde ("rellena esto") solo en el vacío de la fila ACTIVA; en completadas sin RIR queda
  // apagado (tocable pero sin gritar). Con valor, texto normal sin borde.
  const inviteBorder = !hasValue && active
  const textColor = (hasValue || active) ? colors.textSecondary : colors.textMuted
  // Valor compacto para la columna: RIR «@2», RPE el número (1-5); la palabra va en el popover.
  // Vacío: «–» cuando hay cabecera de columna (emptyDash, grid weight_reps) o la etiqueta si no.
  const compactValue = usesReps ? formatEffortBadge(value, measurementType) : String(value)
  const label = hasValue ? compactValue : (emptyDash ? '–' : getEffortLabel(measurementType))

  useEffect(() => {
    if (!open) return
    const onDocDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  const toggleOpen = () => {
    // Abrir hacia el lado con más espacio, descontando el header sticky de la sesión
    // (~96px: título + barra de progreso) del hueco superior para que no tape la 1ª opción.
    const rect = chipRef.current?.getBoundingClientRect()
    const HEADER = 96
    setDropUp(!rect || rect.top - HEADER > window.innerHeight - rect.bottom)
    setOpen(o => !o)
  }

  const handleSelect = (optionValue) => {
    onChange(value === optionValue ? null : optionValue)
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Botón transparente a 44×44 = área táctil (issue #10); el pill visual (fondo, borde) va en
          el span interior para no agrandarse. Así se toca fácil sin convertir el chip en un cajón.
          No crece la fila: el check ya la fija a ~52px. */}
      <button
        ref={chipRef}
        onClick={toggleOpen}
        title={getEffortLabel(measurementType)}
        aria-label={getEffortLabel(measurementType)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          minWidth: 44,
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            backgroundColor: colors.bgTertiary,
            borderRadius: 6,
            padding: '3px 7px',
            border: `1px solid ${inviteBorder ? colors.border : 'transparent'}`,
            color: textColor,
            fontSize: 11,
            fontWeight: 600,
            minWidth: 34,
            textAlign: 'center',
          }}
        >
          {label}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            ...(dropUp ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
            right: 0,
            zIndex: 20,
            backgroundColor: colors.bgSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            width: usesReps ? 208 : 160,
          }}
        >
          {usesReps && (
            <div style={{ padding: '2px 8px 6px' }}>
              <div style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 700 }}>{t('workout:set.rirTitle')}</div>
              <div style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, lineHeight: 1.3 }}>{t('workout:set.rirHelp')}</div>
            </div>
          )}
          {options.map(option => {
            const selected = value === option.value
            // RIR: info.label es el código (F/0/1/2/3+), info.description la palabra (Fallo…).
            // RPE: no aplica → se pinta option.label (la palabra ya descriptiva).
            const info = usesReps ? getEffortInfo(option.value, measurementType) : null
            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                aria-pressed={selected}
                aria-label={usesReps ? `${info.label} ${info.description}` : undefined}
                style={{
                  backgroundColor: selected ? colors.success : colors.bgTertiary,
                  color: selected ? colors.bgPrimary : colors.textPrimary,
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  padding: '9px 10px',
                  width: '100%',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {usesReps ? (
                  <>
                    <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{info.label}</span>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{info.description}</span>
                  </>
                ) : (
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{option.label}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
