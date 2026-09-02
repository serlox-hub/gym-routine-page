import { useState } from 'react'
import { NumberTextInput } from '../ui'
import { colors } from '../../lib/styles'
import { SetField, useDurationDigits } from '@gym/shared'

const numericInputStyle = {
  backgroundColor: colors.bgSecondary,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.textPrimary,
  textAlign: 'center',
  fontSize: 13,
  paddingHorizontal: 2,
  paddingVertical: 4,
  borderRadius: 6,
  // Ancho de la columna del grid (flex: 1), nunca del contenido: la fila no puede desbordar.
  width: '100%',
}

// Ghost: sin caja en reposo (borde transparente → sin salto de layout al enfocar);
// la caja aparece al enfocar, o de forma persistente en la fila sugerida (active, borde lima).
const ghostStyle = { ...numericInputStyle, backgroundColor: 'transparent', borderColor: 'transparent' }

// `boxed`: caja siempre visible (edición desde el historial, donde nada más indica que la fila
// es editable). En la sesión manda el ghost: son 3-5 filas seguidas y las cajas hacen ruido.
// `suggested`: el valor todavía es la sugerencia sembrada de la última sesión, no un dato del
// usuario (ver isSuggestedValue). Se atenúa el TEXTO, no la caja: la fila sigue siendo editable
// y completable de un toque, solo deja de mentir sobre de dónde sale el número (issue #39).
function useFocusStyle(active = false, boxed = false, suggested = false) {
  const [focused, setFocused] = useState(false)
  const base = active
    ? { ...numericInputStyle, borderColor: colors.success }
    : (focused || boxed) ? numericInputStyle : ghostStyle
  const style = suggested ? { ...base, color: colors.textSecondary } : base
  return { style, onFocus: () => setFocused(true), onBlur: () => setFocused(false) }
}

function NumberInput({ value, onChange, onCommit, disabled, inputMode = 'numeric', active = false, boxed = false, suggested = false, placeholder = '—' }) {
  const { style, onFocus, onBlur } = useFocusStyle(active, boxed, suggested)
  const handleChange = (raw) => {
    if (raw === '') { onChange(''); return }
    const normalized = raw.replace(',', '.')
    const num = Number(normalized)
    if (!isNaN(num) && num >= 0) onChange(normalized)
  }

  return (
    <NumberTextInput
      value={String(value ?? '')}
      onChangeText={handleChange}
      onFocus={onFocus}
      onBlur={(e) => { onBlur(e); onCommit?.() }}
      editable={!disabled}
      keyboardType={inputMode === 'decimal' ? 'decimal-pad' : 'number-pad'}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={[style, { opacity: disabled ? 0.5 : 1 }]}
    />
  )
}

/**
 * Duración en UNA sola caja, tecleando dígitos que se rellenan desde la derecha
 * ("130" → 1:30). La lógica pura vive en `durationInput.js` (compartida con web).
 * El valor que sale por onChange son SEGUNDOS; al salir del campo se normaliza (0:75 → 1:15).
 */
function DurationInput({ seconds, onChange, onCommit, disabled, active = false, boxed = false, suggested = false, placeholder = '—' }) {
  const { style, onFocus, onBlur } = useFocusStyle(active, boxed, suggested)
  const { text, setFromInput, normalize } = useDurationDigits(seconds, onChange)

  const handleBlur = () => {
    onBlur()
    normalize()
    onCommit?.()
  }

  return (
    <NumberTextInput
      value={text}
      onChangeText={setFromInput}
      onFocus={onFocus}
      onBlur={handleBlur}
      editable={!disabled}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={[style, { opacity: disabled ? 0.5 : 1 }]}
    />
  )
}

/**
 * Input de UNA columna de valor de la fila de serie. Qué columnas hay (y con qué cabecera)
 * lo decide `getSetColumns(trackedFields)` en @gym/shared; aquí solo se pinta la que toque.
 * `onCommit` se dispara al salir del campo (ya normalizado): lo usa la edición desde el
 * historial, que guarda en blur en vez de con el check de la sesión.
 */
export default function SetValueInput({ field, decimal = false, value, onChange, onCommit, disabled, active = false, boxed = false, suggested = false, placeholder }) {
  if (field === SetField.TIME || field === SetField.PACE) {
    return <DurationInput seconds={value} onChange={onChange} onCommit={onCommit} disabled={disabled} active={active} boxed={boxed} suggested={suggested} placeholder={placeholder} />
  }
  return (
    <NumberInput
      value={value}
      onChange={onChange}
      onCommit={onCommit}
      disabled={disabled}
      active={active}
      boxed={boxed}
      suggested={suggested}
      inputMode={decimal ? 'decimal' : 'numeric'}
      placeholder={placeholder}
    />
  )
}
