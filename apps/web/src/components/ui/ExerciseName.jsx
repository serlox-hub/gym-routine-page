import { EXERCISE_NAME_MAX_LINES, EXERCISE_NAME_LINE_HEIGHT } from '@gym/shared'
import { colors } from '../../lib/styles.js'

/**
 * Exercise name: up to two lines, then an ellipsis (issue #127). `reserveLines` makes it always take
 * two lines of height, so in a list a one-line name gives a row as tall as a two-line one. A title
 * that stands alone (a modal header) does not reserve: an empty second line would read as a layout
 * bug. `className` is for spacing only; the clamp lives here. `as` is the heading tag and is
 * required: each site keeps its own heading level (tests query it by role and level).
 *
 * The clamp is inline instead of `line-clamp-2` so its line count comes from the same constant as
 * the reserved height. `minHeight` goes in `em` so it follows the font size and browser zoom.
 */
function ExerciseName({
  children,
  as: Tag,
  fontSize,
  fontWeight = '600',
  color = colors.textPrimary,
  reserveLines = false,
  className = '',
}) {
  return (
    <Tag
      className={`break-words ${className}`}
      style={{
        color,
        fontSize,
        fontWeight,
        lineHeight: EXERCISE_NAME_LINE_HEIGHT,
        minHeight: reserveLines ? `${EXERCISE_NAME_MAX_LINES * EXERCISE_NAME_LINE_HEIGHT}em` : undefined,
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: EXERCISE_NAME_MAX_LINES,
        overflow: 'hidden',
      }}
    >
      {children}
    </Tag>
  )
}

export default ExerciseName
