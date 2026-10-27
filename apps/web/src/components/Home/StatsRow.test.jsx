import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n, useHomeWeekStore } from '@gym/shared'

// Per file, not in setup.js: see BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()
import { render, screen, fireEvent } from '@testing-library/react'

const navigate = vi.fn()
const useWeeklyStats = vi.fn()
const useWeeklyPRs = vi.fn()

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('@gym/shared', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // The real one also reads the week start preference, which needs a query client
    useHomeCycleOffset: () => actual.useHomeWeekStore(state => actual.selectViewedCycleOffset(state)),
    useWeeklyStats: (cycleOffset) => useWeeklyStats(cycleOffset),
    useWeeklyPRs: (cycleOffset) => useWeeklyPRs(cycleOffset),
  }
})
vi.mock('./WeeklyPRsModal.jsx', () => ({ default: () => null }))

import StatsRow from './StatsRow.jsx'

describe('StatsRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T09:30:00.000Z'))
    useHomeWeekStore.setState({ cycleOffset: 0, leftAt: null })
    useWeeklyStats.mockReturnValue({ totalMinutes: 90, isLoading: false, isError: false })
    useWeeklyPRs.mockReturnValue({ sessions: [], count: 2, isLoading: false, detailsLoading: false, isError: false })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tapping the weekly time card opens history on today', () => {
    render(<StatsRow />)

    fireEvent.click(screen.getByText('1').closest('div'))

    expect(navigate).toHaveBeenCalledWith('/history', { state: { date: '2026-10-10T09:30:00.000Z' } })
  })

  it('tapping the records card does not navigate', () => {
    render(<StatsRow />)

    fireEvent.click(screen.getByText('2'))

    expect(navigate).not.toHaveBeenCalled()
  })

  it('on the current week asks for the current week and labels it "this week"', () => {
    render(<StatsRow />)

    expect(useWeeklyStats).toHaveBeenCalledWith(0)
    expect(useWeeklyPRs).toHaveBeenCalledWith(0)
    expect(screen.getByText('esta semana')).toBeInTheDocument()
    expect(screen.getByText('Récords esta semana')).toBeInTheDocument()
  })

  it('on last week asks for last week, labels it and opens history one week back', () => {
    useHomeWeekStore.setState({ cycleOffset: -1 })
    render(<StatsRow />)

    expect(useWeeklyStats).toHaveBeenCalledWith(-1)
    expect(useWeeklyPRs).toHaveBeenCalledWith(-1)
    expect(screen.getByText('semana pasada')).toBeInTheDocument()
    expect(screen.getByText('Récords semana pasada')).toBeInTheDocument()

    fireEvent.click(screen.getByText('1').closest('div'))

    expect(navigate).toHaveBeenCalledWith('/history', { state: { date: '2026-10-03T09:30:00.000Z' } })
  })

  it('three weeks back reads "3 weeks ago"', () => {
    useHomeWeekStore.setState({ cycleOffset: -3 })
    render(<StatsRow />)

    expect(screen.getByText('hace 3 semanas')).toBeInTheDocument()
    expect(screen.getByText('Récords hace 3 semanas')).toBeInTheDocument()
  })

  it('shows "—" for the records while the viewed week loads', () => {
    useHomeWeekStore.setState({ cycleOffset: -1 })
    useWeeklyPRs.mockReturnValue({ sessions: [], count: 0, isLoading: true, detailsLoading: true, isError: false })
    render(<StatsRow />)

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
