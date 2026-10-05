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

const TOUCH_TARGET = 44
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
    renderSummary(1)

    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ir a la tarjeta/ })).not.toBeInTheDocument()
  })

  it('has one named dot per card, marking the current one', () => {
    renderSummary(3)

    const dots = screen.getAllByRole('button', { name: /Ir a la tarjeta/ })
    expect(dots.map((dot) => dot.getAttribute('aria-label'))).toEqual([
      'Ir a la tarjeta 1',
      'Ir a la tarjeta 2',
      'Ir a la tarjeta 3',
    ])
    expect(dots.map((dot) => dot.getAttribute('aria-current'))).toEqual(['true', 'false', 'false'])
    dots.forEach((dot) => expect(dot).toHaveClass('w-11', 'h-11'))
  })

  it('on the first card the previous arrow is disabled and the next one is not', () => {
    renderSummary(3)

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  it('a dot scrolls the carousel to its card', () => {
    const { container } = renderSummary(3)
    const cardStep = previewWidth(container) + 16 // card width plus the gap between cards

    fireEvent.click(screen.getByRole('button', { name: 'Ir a la tarjeta 3' }))

    expect(scrollTo).toHaveBeenCalledWith({ left: 2 * cardStep, behavior: 'smooth' })
  })

  it('the next arrow scrolls to the second card', () => {
    const { container } = renderSummary(3)
    const cardStep = previewWidth(container) + 16

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(scrollTo).toHaveBeenCalledWith({ left: cardStep, behavior: 'smooth' })
  })
})

describe('WorkoutSummary — room for the dots', () => {
  // At 390px, 294px are left for dots once the two arrows are in: six 44px boxes per line.
  function widthWith(cardCount) {
    const { container, unmount } = renderSummary(cardCount)
    const width = previewWidth(container)
    unmount()
    return width
  }

  it('reserves one more 44px line for the dots each time they wrap, so the card is not cut', () => {
    const oneLine = widthWith(6)
    const twoLines = widthWith(7)
    const threeLines = widthWith(13)

    // The height is what limits the card here, not the width.
    expect(oneLine).toBeLessThan(360)
    expect(oneLine - twoLines).toBeCloseTo(TOUCH_TARGET * SUMMARY_ASPECT)
    expect(twoLines - threeLines).toBeCloseTo(TOUCH_TARGET * SUMMARY_ASPECT)
  })

  it('does not reserve more while the extra dots still fit in the same line', () => {
    expect(widthWith(2)).toBe(widthWith(6))
    expect(widthWith(7)).toBe(widthWith(12))
  })

  it('never makes the card smaller than the 120px floor', () => {
    carouselSize.current = { width: 390, height: 200 }

    expect(widthWith(13)).toBe(120)
  })
})
