import { describe, it, expect } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n, SET_SYNC_STATUS } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver ExerciseCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen } from '@testing-library/react'
import SetRowMeta from './SetRowMeta.jsx'

const TRACKED_FIELDS = ['weight', 'reps']
const previousSet = { setNumber: 1, weight: 80, reps: 8, rir: null, notes: null, videoUrl: null }

function renderMeta(props) {
  return render(<SetRowMeta trackedFields={TRACKED_FIELDS} previousSet={previousSet} {...props} />)
}

describe('SetRowMeta — sync line (issue 210)', () => {
  it('a set slow to save says so, with the grey cloud', () => {
    const { container } = renderMeta({ syncStatus: SET_SYNC_STATUS.SLOW })

    expect(screen.getByText('Sin guardar todavía')).toBeInTheDocument()
    expect(container.querySelector('svg.lucide-cloud-off')).not.toBeNull()
    expect(screen.queryByText('No se pudo guardar')).not.toBeInTheDocument()
  })

  it('a rejected set says so, with the red alert', () => {
    const { container } = renderMeta({ syncStatus: SET_SYNC_STATUS.REJECTED })

    expect(screen.getByText('No se pudo guardar')).toBeInTheDocument()
    expect(container.querySelector('svg.lucide-circle-alert')).not.toBeNull()
    expect(screen.queryByText('Sin guardar todavía')).not.toBeInTheDocument()
  })

  it('a set that saves normally shows no sync line', () => {
    const { container } = renderMeta({ syncStatus: SET_SYNC_STATUS.NONE })

    expect(screen.getByText('80kg × 8')).toBeInTheDocument()
    expect(screen.queryByText('Sin guardar todavía')).not.toBeInTheDocument()
    expect(screen.queryByText('No se pudo guardar')).not.toBeInTheDocument()
    expect(container.querySelector('svg.lucide-cloud-off, svg.lucide-circle-alert')).toBeNull()
  })

  it('the sub-row renders when the sync line is its only content', () => {
    const { container } = renderMeta({ previousSet: null, syncStatus: SET_SYNC_STATUS.REJECTED })

    expect(container).not.toBeEmptyDOMElement()
    expect(screen.getByText('No se pudo guardar')).toBeInTheDocument()
  })

  it('with nothing to show, there is no sub-row', () => {
    const { container } = renderMeta({ previousSet: null })

    expect(container).toBeEmptyDOMElement()
  })
})
