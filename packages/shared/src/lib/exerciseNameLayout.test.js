import { describe, it, expect } from 'vitest'
import {
  EXERCISE_NAME_MAX_LINES,
  EXERCISE_NAME_LINE_HEIGHT,
  getExerciseNameLineHeight,
  getExerciseNameLinesHeight,
} from './exerciseNameLayout.js'

describe('exercise name layout constants', () => {
  it('clamps to two lines at a 1.3 line height', () => {
    expect(EXERCISE_NAME_MAX_LINES).toBe(2)
    expect(EXERCISE_NAME_LINE_HEIGHT).toBe(1.3)
  })
})

describe('getExerciseNameLineHeight', () => {
  it('rounds to whole pixels at every font size the call sites use', () => {
    expect(getExerciseNameLineHeight(14)).toBe(18) // 18.2
    expect(getExerciseNameLineHeight(15)).toBe(20) // 19.5 rounds up
    expect(getExerciseNameLineHeight(16)).toBe(21) // 20.8
  })

  it('returns 0 for a 0 font size', () => {
    expect(getExerciseNameLineHeight(0)).toBe(0)
  })
})

describe('getExerciseNameLinesHeight', () => {
  it('reserves two lines by default', () => {
    expect(getExerciseNameLinesHeight(14)).toBe(36)
    expect(getExerciseNameLinesHeight(15)).toBe(40)
  })

  it('scales with the system text size, which React Native applies to lineHeight but not to minHeight', () => {
    expect(getExerciseNameLinesHeight(14, 2)).toBe(72)
    expect(getExerciseNameLinesHeight(15, 1.5)).toBe(60)
  })

  it('measures a single line when asked, for aligning something to the first line', () => {
    expect(getExerciseNameLinesHeight(15, 1, 1)).toBe(20)
    expect(getExerciseNameLinesHeight(15, 1.5, 1)).toBe(30)
  })

  it('treats an explicit fontScale of 1 the same as the default', () => {
    expect(getExerciseNameLinesHeight(16, 1)).toBe(getExerciseNameLinesHeight(16))
  })
})
