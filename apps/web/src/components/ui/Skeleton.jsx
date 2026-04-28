import { colors } from '../../lib/styles.js'

function Skeleton({ width = '100%', height = 16, borderRadius = 8, className = '', style = {} }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: colors.bgTertiary,
        ...style,
      }}
    />
  )
}

export default Skeleton
