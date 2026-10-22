import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n, formatShortDate } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver ExerciseCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'
import HistoryTable from './HistoryTable.jsx'

const plainSet = { id: 1, set_number: 1, weight: 80, reps_completed: 8, notes: null, video_url: null }
const noteSet = { id: 2, set_number: 2, weight: 80, reps_completed: 7, notes: 'Costó', video_url: null }
const noteAndVideoSet = { id: 3, set_number: 3, weight: 80, reps_completed: 6, notes: 'Tembló', video_url: 'v/abc.mp4' }

const sessionWith = (...sets) => [{ sessionId: 10, date: '2026-09-01', sets }]

function renderTable(sets, props) {
  return render(
    <HistoryTable
      sessions={sessionWith(...sets)}
      onSelectSet={vi.fn()}
      onSessionClick={vi.fn()}
      {...props}
    />
  )
}

describe('HistoryTable — note and video buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('a set with neither a note nor a video has no icon buttons', () => {
    renderTable([plainSet])

    expect(screen.queryByRole('button', { name: 'Notas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vídeo' })).not.toBeInTheDocument()
  })

  it('a note and a video each get a named 44px button that opens that set, not the session', () => {
    const onSelectSet = vi.fn()
    const onSessionClick = vi.fn()
    renderTable([noteSet, noteAndVideoSet], { onSelectSet, onSessionClick })

    // Set 2 has a note only; set 3 has both, so there are two note buttons and one video button.
    const noteButtons = screen.getAllByRole('button', { name: 'Notas' })
    const videoButton = screen.getByRole('button', { name: 'Vídeo' })
    expect(noteButtons).toHaveLength(2)
    expect(videoButton).toHaveClass('w-11', 'h-11')

    fireEvent.click(noteButtons[0])
    expect(onSelectSet).toHaveBeenLastCalledWith(noteSet)
    fireEvent.click(videoButton)
    expect(onSelectSet).toHaveBeenLastCalledWith(noteAndVideoSet)

    expect(onSelectSet).toHaveBeenCalledTimes(2)
    expect(onSessionClick).not.toHaveBeenCalled()
  })
})

describe('HistoryTable — set row height', () => {
  // jsdom does not lay anything out: this guards the class that gives the 44px floor,
  // and e2e/touchTargets.spec.js measures the rendered heights (issue #185).
  const rowOf = (text) => screen.getByText(text).parentElement

  it('every set row has the 44px minimum, whether or not it carries a note or a video', () => {
    renderTable([plainSet, noteSet, noteAndVideoSet])

    for (const set of [plainSet, noteSet, noteAndVideoSet]) {
      expect(rowOf(`80kg × ${set.reps_completed} reps`)).toHaveClass('min-h-11')
    }
  })
})

describe('HistoryTable — routine marks', () => {
  const sessions = [
    { sessionId: 1, date: '2026-09-03', routineDayId: 1, sets: [plainSet] },
    { sessionId: 2, date: '2026-09-02', routineDayId: 2, sets: [plainSet] },
    { sessionId: 3, date: '2026-09-01', routineDayId: null, sets: [plainSet] },
  ]
  const MEMBERSHIP = { 1: 'day', 2: 'routine', 3: 'other' }

  it('marks the same day and another day of the routine, and leaves the rest unmarked', () => {
    render(<HistoryTable sessions={sessions} onSelectSet={vi.fn()} onSessionClick={vi.fn()}
      membershipOf={(session) => MEMBERSHIP[session.sessionId]} />)

    expect(screen.getAllByText('Este día')).toHaveLength(1)
    expect(screen.getAllByText('Otro día')).toHaveLength(1)
  })

  it('without membership (no routine day) nothing is marked', () => {
    render(<HistoryTable sessions={sessions} onSelectSet={vi.fn()} onSessionClick={vi.fn()} membershipOf={() => null} />)

    expect(screen.queryByText('Este día')).not.toBeInTheDocument()
    expect(screen.queryByText('Otro día')).not.toBeInTheDocument()
  })
})

describe('HistoryTable — see more', () => {
  const manySessions = (count) => Array.from({ length: count }, (_, i) => ({
    sessionId: i + 1,
    date: '2026-09-01',
    sets: [{ ...plainSet, id: i + 1 }],
  }))
  // Every session has the same date: counting it counts the rendered sessions.
  const renderedSessions = () => screen.getAllByText(formatShortDate('2026-09-01')).length

  it('shows 30 sessions and reveals 30 more per tap, from what it already has', () => {
    render(<HistoryTable sessions={manySessions(65)} onSelectSet={vi.fn()} onSessionClick={vi.fn()} />)
    expect(renderedSessions()).toBe(30)

    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }))
    expect(renderedSessions()).toBe(60)

    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }))
    expect(renderedSessions()).toBe(65)
    expect(screen.queryByRole('button', { name: 'Ver más' })).not.toBeInTheDocument()
  })

  it('no "see more" with exactly 30 sessions', () => {
    render(<HistoryTable sessions={manySessions(30)} onSelectSet={vi.fn()} onSessionClick={vi.fn()} />)
    expect(renderedSessions()).toBe(30)
    expect(screen.queryByRole('button', { name: 'Ver más' })).not.toBeInTheDocument()
  })
})
