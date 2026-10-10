import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Per file, not in setup.js: see BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()
import { render, screen, fireEvent } from '@testing-library/react'

const navigate = vi.fn()

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('@gym/shared', async (importOriginal) => ({
  ...(await importOriginal()),
  useWeeklyStats: () => ({ totalMinutes: 90, isLoading: false, isError: false }),
  useWeeklyPRs: () => ({ sessions: [], count: 2, isLoading: false, detailsLoading: false, isError: false }),
}))
vi.mock('./WeeklyPRsModal.jsx', () => ({ default: () => null }))

import StatsRow from './StatsRow.jsx'

describe('StatsRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T09:30:00.000Z'))
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
})
