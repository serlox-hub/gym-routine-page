import { useState } from 'react'
import { CaretEndInput, DecimalInput } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { SetField, useDurationDigits } from '@gym/shared'

const inputStyle = {
  backgroundColor: colors.bgSecondary,
  border: `1px solid ${colors.border}`,
  color: colors.textPrimary,
}

// Ghost: sin caja en reposo (borde transparente → sin salto de layout al enfocar);
// la caja aparece al enfocar, o de forma persistente en la fila sugerida (active, borde lima).
const ghostStyle = {
  backgroundColor: 'transparent',
  border: '1px solid transparent',
  color: colors.textPrimary,
}

// Todos los inputs de valor son w-full: la columna del grid (1fr, min-w-0) manda el ancho, así
// que la fila nunca desborda por muy estrecha que sea la pantalla. Nada de anchos fijos aquí.
const INPUT_CLASS = 'w-full min-w-0 px-0.5 py-1 rounded text-center text-[13px]'

// `boxed`: caja siempre visible (edición desde el historial, donde nada más indica que la fila
// es editable). En la sesión manda el ghost: son 3-5 filas seguidas y las cajas hacen ruido.
function useFocusStyle(active = false, boxed = false) {
  const [focused, setFocused] = useState(false)
  const style = active
    ? { ...inputStyle, borderColor: colors.success }
    : (focused || boxed) ? inputStyle : ghostStyle
  return { style, focused, onFocus: () => setFocused(true), onBlur: () => setFocused(false) }
}

function NumberInput({ value, onChange, onCommit, disabled, inputMode = 'numeric', active = false, boxed = false, placeholder = '—' }) {
  const { style, onFocus, onBlur } = useFocusStyle(active, boxed)
  const handleChange = (e) => {
    const raw = e.target.value
    if (raw === '') {
      onChange('')
      return
    }
    const num = Number(raw)
    if (!isNaN(num) && num >= 0) {
      onChange(raw)
    }
  }

  // Peso y distancia van por DecimalInput (type=text): con type="number" el navegador en un
  // locale de punto se come la coma y "82,5" se guardaría como 825. El resto son enteros.
  const decimal = inputMode === 'decimal'
  const Field = decimal ? DecimalInput : CaretEndInput
  const numberProps = decimal ? {} : { type: 'number', inputMode, min: '0', step: 1 }

  return (
    <Field
      {...numberProps}
      value={value}
      onChange={handleChange}
      onFocus={onFocus}
      onBlur={(e) => { onBlur(e); onCommit?.() }}
      disabled={disabled}
      placeholder={placeholder}
      className={INPUT_CLASS}
      style={style}
    />
  )
}

/**
 * Duración en UNA sola caja, tecleando dígitos que se rellenan desde la derecha
 * ("130" → 1:30). La lógica pura vive en `durationInput.js` (compartida con native).
 * El valor que sale por onChange son SEGUNDOS; al salir del campo se normaliza (0:75 → 1:15).
 */
function DurationInput({ seconds, onChange, onCommit, disabled, active = false, boxed = false, placeholder = '—' }) {
  const { style, onFocus, onBlur } = useFocusStyle(active, boxed)
  const { text, setFromInput, normalize } = useDurationDigits(seconds, onChange)

  const handleBlur = () => {
    onBlur()
    normalize()
    onCommit?.()
  }

  return (
    <CaretEndInput
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => setFromInput(e.target.value)}
      onFocus={onFocus}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      className={INPUT_CLASS}
      style={style}
    />
  )
}

/**
 * Input de UNA columna de valor de la fila de serie. Qué columnas hay (y con qué cabecera)
 * lo decide `getSetColumns(measurementType)` en @gym/shared; aquí solo se pinta la que toque.
 * `onCommit` se dispara al salir del campo (ya normalizado): lo usa la edición desde el
 * historial, que guarda en blur en vez de con el check de la sesión.
 */
export default function SetValueInput({ field, decimal = false, value, onChange, onCommit, disabled, active = false, boxed = false, placeholder }) {
  if (field === SetField.TIME || field === SetField.PACE) {
    return <DurationInput seconds={value} onChange={onChange} onCommit={onCommit} disabled={disabled} active={active} boxed={boxed} placeholder={placeholder} />
  }
  return (
    <NumberInput
      value={value}
      onChange={onChange}
      onCommit={onCommit}
      disabled={disabled}
      active={active}
      boxed={boxed}
      inputMode={decimal ? 'decimal' : 'numeric'}
      placeholder={placeholder}
    />
  )
}
