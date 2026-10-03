import { Text, useWindowDimensions } from 'react-native'
import { EXERCISE_NAME_MAX_LINES, getExerciseNameLineHeight, getExerciseNameLinesHeight } from '@gym/shared'
import { colors } from '../../lib/styles'

/**
 * Exercise name: up to two lines, then an ellipsis (issue #127). `reserveLines` makes it always take
 * two lines of height, so in a list a one-line name gives a row as tall as a two-line one. A title
 * that stands alone (a modal header) does not reserve: an empty second line would read as a layout
 * bug. `className` is for spacing only; the clamp lives here.
 *
 * The reserved height is multiplied by `fontScale` because React Native scales the line height with
 * the system text size but not `minHeight` (see `getExerciseNameLinesHeight`).
 */
export default function ExerciseName({
  children,
  fontSize,
  fontWeight = '600',
  color = colors.textPrimary,
  reserveLines = false,
  className,
}) {
  const { fontScale } = useWindowDimensions()

  return (
    <Text
      className={className}
      numberOfLines={EXERCISE_NAME_MAX_LINES}
      style={{
        color,
        fontSize,
        fontWeight,
        lineHeight: getExerciseNameLineHeight(fontSize),
        minHeight: reserveLines ? getExerciseNameLinesHeight(fontSize, fontScale) : undefined,
      }}
    >
      {children}
    </Text>
  )
}
