import { describe, it, expect, vi } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver ExerciseCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'
import { colors } from '../../lib/styles.js'
import HistorySetRow from './HistorySetRow.jsx'

const buildSet = (overrides) => ({
  id: 1,
  set_number: 1,
  weight: 80,
  reps_completed: 8,
  notes: null,
  video_url: null,
  ...overrides,
})

function renderRow(setOverrides, props) {
  return render(
    <HistorySetRow
      set={buildSet(setOverrides)}
      weightUnit="kg"
      distanceUnit="m"
      trackedFields={['weight', 'reps']}
      onSelectSet={vi.fn()}
      {...props}
    />
  )
}

// The row is the text's parent: the value span sits directly inside it.
const rowOf = (text) => screen.getByText(text).parentElement

describe('HistorySetRow — height (issues 185 and 187)', () => {
  // jsdom does not lay anything out: this guards the class that gives the 44px floor, and
  // e2e/touchTargets.spec.js measures the rendered rows.
  it.each([
    ['neither a note nor a video', {}],
    ['a note', { notes: 'Costó' }],
    ['a video', { video_url: 'v/abc.mp4' }],
    ['a note, a video and an effort badge', { notes: 'Costó', video_url: 'v/abc.mp4', rir_actual: 2 }],
  ])('a set with %s has the 44px minimum', (_, overrides) => {
    renderRow(overrides)

    expect(rowOf('80kg × 8 reps')).toHaveClass('min-h-11')
  })
})

describe('HistorySetRow — value', () => {
  it('writes the value in the weight unit it receives, not a fixed kg', () => {
    renderRow({ weight: 135 }, { weightUnit: 'lb' })

    expect(screen.getByText('135lb × 8 reps')).toBeInTheDocument()
  })

  it('writes a distance in the distance unit it receives', () => {
    renderRow({ weight: null, reps_completed: null, distance_meters: 1500 }, { distanceUnit: 'km', trackedFields: ['distance'] })

    expect(screen.getByText('1,5km')).toBeInTheDocument()
  })

  it('a weight of 0 is a value, not a missing one', () => {
    renderRow({ weight: 0 })

    expect(screen.getByText('0kg × 8 reps')).toBeInTheDocument()
  })
})

describe('HistorySetRow — number and record', () => {
  it('shows the set number, and «D» instead of it for a dropset', () => {
    renderRow({ set_number: 3, set_type: 'dropset' })

    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })

  it('a set that is not a record has no badge and a muted number', () => {
    renderRow({ set_number: 2 })

    expect(screen.queryByText('Récord')).not.toBeInTheDocument()
    expect(screen.getByText('2')).toHaveStyle({ color: colors.textMuted })
  })

  it('a record set shows the «Récord» badge and a warning-coloured number', () => {
    renderRow({ set_number: 2 }, { isPR: true })

    expect(screen.getByText('Récord')).toBeInTheDocument()
    expect(screen.getByText('2')).toHaveStyle({ color: colors.warning, fontWeight: '700' })
  })
})

describe('HistorySetRow — effort', () => {
  it('shows nothing when the set has no effort, whether null or absent', () => {
    const { unmount } = renderRow({ rir_actual: null })
    expect(screen.queryByText(/^@/)).not.toBeInTheDocument()
    unmount()

    renderRow({ rir_actual: undefined })
    expect(screen.queryByText(/^@/)).not.toBeInTheDocument()
  })

  it('an effort of 0 (to failure in reps) is a value, not a missing one', () => {
    renderRow({ rir_actual: 0 })

    expect(screen.getByText('@0')).toBeInTheDocument()
  })

  it('a set that measures reps shows its effort as RIR', () => {
    renderRow({ rir_actual: 2 })

    expect(screen.getByText('@2')).toBeInTheDocument()
  })

  it('a set that does not measure reps shows its effort as the word, never the stored number', () => {
    renderRow({ weight: null, reps_completed: null, time_seconds: 60, rir_actual: 2 }, { trackedFields: ['time'] })

    expect(screen.getByText('Moderado')).toBeInTheDocument()
    expect(screen.queryByText('2')).not.toBeInTheDocument()
    expect(screen.queryByText('@2')).not.toBeInTheDocument()
  })
})

describe('HistorySetRow — note and video buttons', () => {
  it('without a note or a video there are no icon buttons', () => {
    renderRow()

    expect(screen.queryByRole('button', { name: 'Notas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vídeo' })).not.toBeInTheDocument()
  })

  it('a note and a video each get a named 44px button', () => {
    renderRow({ notes: 'Costó', video_url: 'v/abc.mp4' })

    expect(screen.getByRole('button', { name: 'Notas' })).toHaveClass('w-11', 'h-11')
    expect(screen.getByRole('button', { name: 'Vídeo' })).toHaveClass('w-11', 'h-11')
  })

  it('each button opens that set, with the set it was given', () => {
    const onSelectSet = vi.fn()
    const set = buildSet({ notes: 'Costó', video_url: 'v/abc.mp4' })
    render(<HistorySetRow set={set} weightUnit="kg" distanceUnit="m" trackedFields={['weight', 'reps']} onSelectSet={onSelectSet} />)

    fireEvent.click(screen.getByRole('button', { name: 'Notas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vídeo' }))

    expect(onSelectSet).toHaveBeenCalledTimes(2)
    expect(onSelectSet).toHaveBeenNthCalledWith(1, set)
    expect(onSelectSet).toHaveBeenNthCalledWith(2, set)
  })

  it('the tap does not reach the card around the row, nor follow a link around it', () => {
    // In the exercise history the row sits inside the session's clickable card (and a link).
    const onCardClick = vi.fn()
    render(
      <div onClick={onCardClick}>
        <HistorySetRow set={buildSet({ notes: 'Costó' })} weightUnit="kg" distanceUnit="m" trackedFields={['weight', 'reps']} onSelectSet={vi.fn()} />
      </div>
    )

    // fireEvent returns false when something called preventDefault on the event.
    const notCancelled = fireEvent.click(screen.getByRole('button', { name: 'Notas' }))

    expect(onCardClick).not.toHaveBeenCalled()
    expect(notCancelled).toBe(false)
  })
})
