import { colors } from '../../lib/styles.js'

function Card({ children, className = '', onClick, style = {}, noHover = false }) {
  const clickableClasses = onClick ? 'cursor-pointer transition-colors' : ''
  const enableHover = onClick && !noHover

  return (
    <div
      className={`rounded-lg ${clickableClasses} ${className}`}
      style={{
        backgroundColor: colors.bgSecondary,
        borderWidth: '1px',
        borderColor: colors.border,
        ...style,
      }}
      onMouseEnter={enableHover ? (e) => e.currentTarget.style.backgroundColor = colors.bgAlt : undefined}
      onMouseLeave={enableHover ? (e) => e.currentTarget.style.backgroundColor = colors.bgSecondary : undefined}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export default Card
