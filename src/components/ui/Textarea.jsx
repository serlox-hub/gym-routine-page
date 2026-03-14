import { inputStyle } from '../../lib/styles.js'

function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="text-sm text-secondary mb-1 block">
          {label}
        </label>
      )}
      <textarea
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-colors resize-none"
        style={inputStyle}
        {...props}
      />
      {error && (
        <p className="text-xs mt-1 text-danger">{error}</p>
      )}
    </div>
  )
}

export default Textarea
