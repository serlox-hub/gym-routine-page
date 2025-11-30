const VARIANTS = {
  default: {
    backgroundColor: '#21262d',
    color: '#8b949e'
  },
  accent: {
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    color: '#58a6ff'
  },
  purple: {
    backgroundColor: 'rgba(163, 113, 247, 0.15)',
    color: '#a371f7'
  },
  success: {
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    color: '#3fb950'
  },
  warning: {
    backgroundColor: 'rgba(210, 153, 34, 0.15)',
    color: '#d29922'
  },
  danger: {
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    color: '#f85149'
  },
}

function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded ${className}`}
      style={VARIANTS[variant]}
    >
      {children}
    </span>
  )
}

export default Badge
