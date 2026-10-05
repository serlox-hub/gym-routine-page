import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

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
