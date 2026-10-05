import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto (ver BodyWeightModal.test.jsx).
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

// What useHistorySetEditor returns for the set row. The hook owns the upload and save logic and is
// tested on its own: here it is only the source of the flags the row paints (note, failed upload).
const { editorState, session } = vi.hoisted(() => ({
  editorState: {},
  session: {
    id: 1,
    started_at: '2026-09-01T10:00:00.000Z',
    completed_at: '2026-09-01T11:00:00.000Z',
    duration_minutes: 60,
    day_name: 'Push',
    notes: null,
    overall_feeling: null,
    gym_id: null,
    gym: null,
    routine_name: null,
    routine_day: null,
    exercises: [],
  },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../../hooks/useWorkout.js', () => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false, isError: false })
  return {
    useSessionDetail: () => ({ data: session, isLoading: false, error: null }),
    useSessionPRs: () => ({ data: undefined }),
    useDeleteSession: mutation,
    useUpdateSessionMetadata: mutation,
    useRescheduleSession: mutation,
    useUpsertCompletedSet: mutation,
    useDeleteCompletedSet: mutation,
    useStartSession: mutation,
  }
})

vi.mock('@gym/shared', async () => {
  const actual = await vi.importActual('@gym/shared')
  return {
    ...actual,
    useSelectedGym: () => ({ hasMultiple: false, gymId: null }),
    useReassignSessionGym: () => ({ mutate: vi.fn(), isPending: false }),
    usePreference: () => ({ value: 'kg' }),
    useResolvedWeightUnit: () => 'kg',
    useResolvedDistanceUnit: () => 'm',
    useHistorySetEditor: () => editorState,
  }
})

// Children with their own queries or charts: nothing under test lives in them.
vi.mock('../Workout/ExerciseHistoryModal.jsx', () => ({ default: () => null }))
vi.mock('../Workout/GymSelector.jsx', () => ({ default: () => null }))
vi.mock('../Workout/SetDetailsModal.jsx', () => ({ default: () => null }))
vi.mock('./MuscleGroupSetsChart.jsx', () => ({ default: () => null }))
vi.mock('./ConvertToRoutineDayModal.jsx', () => ({ default: () => null }))
vi.mock('../Workout/SetNotesView.jsx', () => ({
  default: ({ isOpen, notes }) => (isOpen ? <div data-testid="notes-view">{notes}</div> : null),
}))

import SessionInlineDetail from './SessionInlineDetail.jsx'

const buildSet = (overrides) => ({
  id: 9,
  set_number: 1,
  weight: 80,
  reps_completed: 8,
  notes: null,
  video_url: null,
  ...overrides,
})

function setSession(sets) {
  session.exercises = [{
    sessionExerciseId: 5,
    is_warmup: false,
    exercise: { id: 3, name_es: 'Press banca', name_en: 'Bench press', tracked_fields: ['weight', 'reps'] },
    sets,
  }]
}

function setEditor(overrides) {
  Object.keys(editorState).forEach(key => delete editorState[key])
  Object.assign(editorState, {
    values: { weight: '80', reps: '8' },
    setValues: vi.fn(),
    rir: null,
    setType: 'normal',
    videoUrl: null,
    notes: null,
    hasVideo: false,
    hasRir: false,
    hasNotes: false,
    isUploadingVideo: false,
    uploadProgress: 0,
    videoUploadError: false,
    handleSave: vi.fn(),
    handleRirChange: vi.fn(),
    handleSetTypeChange: vi.fn(),
    handleSelectVideo: vi.fn(),
    handleRetryVideoUpload: vi.fn(),
    handleRemoveVideo: vi.fn(),
    handleNotesSubmit: vi.fn(),
    ...overrides,
  })
}

// The session detail starts read-only: «···» → Editar is the way into edit mode.
function enterEditMode() {
  fireEvent.click(screen.getByRole('button', { name: 'Más opciones' }))
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
}

beforeEach(() => {
  setSession([buildSet()])
  setEditor()
})

describe('SessionInlineDetail: set row in edit mode', () => {
  it('a failed video upload shows the 44px retry button instead of the note badge', () => {
    setEditor({ hasNotes: true, notes: 'Costó', videoUploadError: true })
    render(<SessionInlineDetail sessionId={1} />)
    enterEditMode()

    const retryButton = screen.getByRole('button', { name: 'Reintentar' })
    expect(retryButton).toHaveClass('w-11', 'h-11')
    // The badge column is a fixed 150px: both at once would overflow onto the inputs.
    expect(screen.queryByRole('img', { name: 'Notas' })).not.toBeInTheDocument()

    fireEvent.click(retryButton)
    expect(editorState.handleRetryVideoUpload).toHaveBeenCalledTimes(1)
  })

  it('without a failed upload the note badge shows and there is no retry button', () => {
    setEditor({ hasNotes: true, notes: 'Costó' })
    render(<SessionInlineDetail sessionId={1} />)
    enterEditMode()

    expect(screen.getByRole('img', { name: 'Notas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('a failed upload on a set without a note still shows the retry button', () => {
    setEditor({ hasNotes: false, videoUploadError: true })
    render(<SessionInlineDetail sessionId={1} />)
    enterEditMode()

    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Notas' })).not.toBeInTheDocument()
  })

  it('both date-time inputs have an accessible name', () => {
    render(<SessionInlineDetail sessionId={1} />)
    enterEditMode()

    const startInput = screen.getByLabelText('Fecha y hora de inicio')
    const endInput = screen.getByLabelText('Fecha y hora de fin')
    expect(startInput).toHaveAttribute('type', 'datetime-local')
    expect(endInput).toHaveAttribute('type', 'datetime-local')
  })
})

describe('SessionInlineDetail: set row in read mode', () => {
  it('a set with a note and a video gets a named 44px button for each that opens that set', () => {
    setSession([buildSet({ notes: 'Costó', video_url: 'v/abc.mp4' })])
    render(<SessionInlineDetail sessionId={1} />)

    const noteButton = screen.getByRole('button', { name: 'Notas' })
    const videoButton = screen.getByRole('button', { name: 'Vídeo' })
    expect(noteButton).toHaveClass('w-11', 'h-11')
    expect(videoButton).toHaveClass('w-11', 'h-11')

    expect(screen.queryByTestId('notes-view')).not.toBeInTheDocument()
    fireEvent.click(noteButton)
    expect(screen.getByTestId('notes-view')).toHaveTextContent('Costó')
  })

  it('a set with neither a note nor a video has no icon buttons', () => {
    render(<SessionInlineDetail sessionId={1} />)

    expect(screen.queryByRole('button', { name: 'Notas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vídeo' })).not.toBeInTheDocument()
  })
})
