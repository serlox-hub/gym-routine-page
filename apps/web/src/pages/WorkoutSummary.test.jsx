import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

const { locationState, carouselSize, scrollTo } = vi.hoisted(() => ({
  locationState: { current: null },
  // What the ResizeObserver reports for the carousel area (a 390px wide phone, plenty of height).
  carouselSize: { current: { width: 390, height: 640 } },
  scrollTo: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ state: locationState.current }),
  useNavigate: () => vi.fn(),
  Navigate: () => null,
}))

vi.mock('@gym/shared', async () => {
  const actual = await vi.importActual('@gym/shared')
  return { ...actual, useCompletedSessionCount: () => ({ data: 12 }) }
})

vi.mock('../hooks/useShareWorkoutSummary.js', () => ({
  useShareWorkoutSummary: () => ({
    generateAndShare: vi.fn(),
    generateAndDownload: vi.fn(),
    isGenerating: false,
  }),
}))

// The real cards are fixed-size images. A stub that only reports the width the page gives it is
// enough, and the aspects make the height (not the width) the limit, which is the case under test.
// The on-screen preview gets a `width`; the off-screen capture copies do not.
vi.mock('../components/Workout/WorkoutSummaryCard.jsx', async () => {
  const React = await import('react')
  return {
    default: React.forwardRef(function WorkoutSummaryCardStub({ width }, ref) {
      return React.createElement('div', { ref, 'data-width': width })
    }),
    SUMMARY_CARD_ASPECT: 0.5,
  }
})

vi.mock('../components/Workout/PRCard.jsx', async () => {
  const React = await import('react')
  return {
    default: React.forwardRef(function PRCardStub({ width }, ref) {
      return React.createElement('div', { ref, 'data-width': width })
    }),
    PR_CARD_ASPECT: 0.75,
  }
})

import WorkoutSummary from './WorkoutSummary.jsx'

const SUMMARY_ASPECT = 0.5

// One summary card plus `count - 1` rep-PR cards.
function summaryWithCards(count) {
  return {
    date: '2026-10-04',
    prs: count > 1
      ? [{
          exerciseName: 'Press banca',
          details: Array.from({ length: count - 1 }, () => ({ type: 'repPR' })),
        }]
      : [],
  }
}

function renderSummary(cardCount) {
  locationState.current = { summaryData: summaryWithCards(cardCount) }
  return render(<WorkoutSummary />)
}

function previewWidth(container) {
  return parseFloat(container.querySelector('[data-width]').getAttribute('data-width'))
}

beforeEach(() => {
  vi.clearAllMocks()
  carouselSize.current = { width: 390, height: 640 }
  Element.prototype.scrollTo = scrollTo
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { this.callback = callback }
    observe() { this.callback([{ contentRect: carouselSize.current }]) }
    disconnect() {}
  })
})

describe('WorkoutSummary — carousel controls', () => {
  it('a single card has no arrows or dots', () => {
    const { container } = renderSummary(1)

    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"] > span')).toBeNull()
  })

  it('has one dot per card, as decoration and not as buttons', () => {
    const { container } = renderSummary(3)

    expect(container.querySelectorAll('[aria-hidden="true"] > span')).toHaveLength(3)
    // Only the two arrows can be tapped: the dots are not tap controls.
    expect(screen.getAllByRole('button', { name: /Anterior|Siguiente/ })).toHaveLength(2)
  })

  it('on the first card the previous arrow is disabled and the next one is not', () => {
    renderSummary(3)

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  it('the next arrow scrolls to the second card', () => {
    const { container } = renderSummary(3)
    const cardStep = previewWidth(container) + 16 // card width plus the gap between cards

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(scrollTo).toHaveBeenCalledWith({ left: cardStep, behavior: 'smooth' })
  })
})

describe('WorkoutSummary — card size', () => {
  function widthWith(cardCount) {
    const { container, unmount } = renderSummary(cardCount)
    const width = previewWidth(container)
    unmount()
    return width
  }

  it('does not depend on how many cards there are: the dots stay on one line', () => {
    expect(widthWith(2)).toBe(widthWith(13))
  })

  it('is limited by the height left under the 70px controls row', () => {
    // 640 tall at 390 wide: (640 - 70) * 0.5 = 285, under the 360 cap.
    expect(widthWith(3)).toBeCloseTo((640 - 70) * SUMMARY_ASPECT)
  })

  it('never makes the card smaller than the 120px floor', () => {
    carouselSize.current = { width: 390, height: 200 }

    expect(widthWith(13)).toBe(120)
  })
})
