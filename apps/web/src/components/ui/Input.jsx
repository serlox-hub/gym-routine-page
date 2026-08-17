import { inputStyle } from '../../lib/styles.js'
import CaretEndInput from './CaretEndInput.jsx'
import DecimalInput from './DecimalInput.jsx'

function Input({ label, error, className = '', decimal = false, ...props }) {
  // En inputs numéricos, colocar el cursor al final al enfocar (edición cómoda de valores
  // prellenados). En texto/email se mantiene el comportamiento nativo (caret donde se toca).
  // `decimal`: número con decimales → DecimalInput (nunca type="number", ver ese archivo).
  const numeric = props.type === 'number' || props.inputMode === 'numeric' || props.inputMode === 'decimal'
  const Field = decimal ? DecimalInput : numeric ? CaretEndInput : 'input'
  return (
    <div className={className}>
      {label && (
        <label className="text-sm text-secondary mb-1 block">
          {label}
        </label>
      )}
      <Field
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-success transition-colors"
        style={inputStyle}
        {...props}
      />
      {error && (
        <p className="text-xs mt-1 text-danger">{error}</p>
      )}
    </div>
  )
}

export default Input
