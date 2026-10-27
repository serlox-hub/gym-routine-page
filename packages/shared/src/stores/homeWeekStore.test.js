import { describe, it, expect, beforeEach } from 'vitest'
import { useHomeWeekStore } from './homeWeekStore.js'
import { HOME_WEEK_RESET_MS } from '../lib/homeUtils.js'

// Wednesday 2026-10-14 12:00 local: the monday and sunday weeks both start days before
const WEDNESDAY_NOON = new Date(2026, 9, 14, 12, 0, 0).getTime()

describe('useHomeWeekStore', () => {
  beforeEach(() => {
    useHomeWeekStore.setState({ cycleOffset: 0, leftAt: null })
  })

  it('starts on the current week, never having left Home', () => {
    expect(useHomeWeekStore.getState()).toMatchObject({ cycleOffset: 0, leftAt: null })
  })

  it('setCycleOffset writes the offset', () => {
    useHomeWeekStore.getState().setCycleOffset(-3)

    expect(useHomeWeekStore.getState().cycleOffset).toBe(-3)
  })

  it('leaveHome records when the user left', () => {
    useHomeWeekStore.getState().leaveHome(WEDNESDAY_NOON)

    expect(useHomeWeekStore.getState().leftAt).toBe(WEDNESDAY_NOON)
  })

  it('a second leaveHome keeps the first one, so the window does not restart', () => {
    const { leaveHome } = useHomeWeekStore.getState()
    leaveHome(WEDNESDAY_NOON)

    leaveHome(WEDNESDAY_NOON + HOME_WEEK_RESET_MS - 1000)

    expect(useHomeWeekStore.getState().leftAt).toBe(WEDNESDAY_NOON)
  })

  it('counts the window from the first leave: a late second leave does not save the offset', () => {
    const { setCycleOffset, leaveHome, enterHome } = useHomeWeekStore.getState()
    setCycleOffset(-2)
    leaveHome(WEDNESDAY_NOON)
    leaveHome(WEDNESDAY_NOON + HOME_WEEK_RESET_MS - 1000)

    enterHome(WEDNESDAY_NOON + HOME_WEEK_RESET_MS + 1000, 'monday')

    expect(useHomeWeekStore.getState()).toMatchObject({ cycleOffset: 0, leftAt: null })
  })

  it('enterHome between two leaves lets the next leave record its own time', () => {
    const { setCycleOffset, leaveHome, enterHome } = useHomeWeekStore.getState()
    setCycleOffset(-2)
    const secondLeave = WEDNESDAY_NOON + HOME_WEEK_RESET_MS + 5000
    leaveHome(WEDNESDAY_NOON)
    enterHome(WEDNESDAY_NOON + 1000, 'monday')

    leaveHome(secondLeave)

    expect(useHomeWeekStore.getState().leftAt).toBe(secondLeave)

    // 1s after the second leave is inside the window, even though the first leave is long past
    enterHome(secondLeave + 1000, 'monday')

    expect(useHomeWeekStore.getState()).toMatchObject({ cycleOffset: -2, leftAt: null })
  })

  it('enterHome within the window keeps the offset and clears leftAt', () => {
    const { setCycleOffset, leaveHome, enterHome } = useHomeWeekStore.getState()
    setCycleOffset(-2)
    leaveHome(WEDNESDAY_NOON)

    enterHome(WEDNESDAY_NOON + HOME_WEEK_RESET_MS - 1000, 'monday')

    expect(useHomeWeekStore.getState()).toMatchObject({ cycleOffset: -2, leftAt: null })
  })

  it('enterHome after the window goes back to the current week and clears leftAt', () => {
    const { setCycleOffset, leaveHome, enterHome } = useHomeWeekStore.getState()
    setCycleOffset(-2)
    leaveHome(WEDNESDAY_NOON)

    enterHome(WEDNESDAY_NOON + HOME_WEEK_RESET_MS + 1000, 'monday')

    expect(useHomeWeekStore.getState()).toMatchObject({ cycleOffset: 0, leftAt: null })
  })

  it('enterHome without having left keeps the offset', () => {
    useHomeWeekStore.getState().setCycleOffset(-1)

    useHomeWeekStore.getState().enterHome(WEDNESDAY_NOON, 'monday')

    expect(useHomeWeekStore.getState()).toMatchObject({ cycleOffset: -1, leftAt: null })
  })
})
