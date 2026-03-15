import { colors } from '../../lib/styles.js'

function Card({ children, className = '', onClick, style = {} }) {
  const clickableClasses = onClick ? 'cursor-pointer transition-colors' : ''

  return (
    <div
      className={`rounded-lg ${clickableClasses} ${className}`}
      style={{
        backgroundColor: colors.bgSecondary,
        borderWidth: '1px',
        borderColor: colors.border,
        ...style,
      }}
      onMouseEnter={onClick ? (e) => e.currentTarget.style.backgroundColor = colors.bgAlt : undefined}
      onMouseLeave={onClick ? (e) => e.currentTarget.style.backgroundColor = colors.bgSecondary : undefined}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export default Card
