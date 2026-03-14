import { selectStyle } from '../../lib/styles.js'

function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="text-sm text-secondary mb-1 block">
          {label}
        </label>
      )}
      <select
        className="w-full px-3 py-2 rounded-lg text-sm appearance-none focus:outline-none transition-colors"
        style={selectStyle}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-xs mt-1 text-danger">{error}</p>
      )}
    </div>
  )
}

export default Select
