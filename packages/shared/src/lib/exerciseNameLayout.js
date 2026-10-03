// How an exercise name is laid out (issue #127): up to two lines, then an ellipsis, and a list row
// always reserves both lines so a one-line name and a two-line name give rows of the same height.
// The clamp and the reserved height are derived from the same line height, so they live here once
// and both apps' `ui/ExerciseName` read them: two copies would drift into rows that are uniform on
// one platform and not on the other.

export const EXERCISE_NAME_MAX_LINES = 2

// Unitless, so web uses it as is and the reserved height follows the font size and browser zoom.
// Tighter than the inherited 1.5: at 1.5, two reserved lines make every row noticeably taller.
export const EXERCISE_NAME_LINE_HEIGHT = 1.3

/**
 * Line height in px of a native exercise name at this font size. React Native has no unitless line
 * height, and a rounded value keeps the text on whole pixels.
 * @param {number} fontSize - px
 * @returns {number}
 */
export function getExerciseNameLineHeight(fontSize) {
  return Math.round(fontSize * EXERCISE_NAME_LINE_HEIGHT)
}

/**
 * Height in native layout units of `lines` lines of an exercise name.
 *
 * React Native scales a Text's `lineHeight` with the system text size but not a `minHeight` or a
 * `height`, so the caller passes `fontScale` (`useWindowDimensions().fontScale`). Without it the
 * box would fall short of the lines it reserves for users with large text, and rows would stop
 * being uniform.
 * @param {number} fontSize - px
 * @param {number} [fontScale=1]
 * @param {number} [lines=EXERCISE_NAME_MAX_LINES]
 * @returns {number}
 */
export function getExerciseNameLinesHeight(fontSize, fontScale = 1, lines = EXERCISE_NAME_MAX_LINES) {
  return lines * getExerciseNameLineHeight(fontSize) * fontScale
}
