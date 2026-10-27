import { describe, it, expect } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver ExerciseCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen } from '@testing-library/react'
import PreviousSetLine from './PreviousSetLine.jsx'

const TRACKED_FIELDS = ['weight', 'reps']
const previousSet = { setNumber: 2, weight: 80, reps: 8, rir: null, notes: null, videoUrl: null }

describe('PreviousSetLine — dropset mark', () => {
  it('a dropset gets the «D» before its value', () => {
    render(<PreviousSetLine previousSet={{ ...previousSet, setType: 'dropset' }} trackedFields={TRACKED_FIELDS} />)

    const mark = screen.getByText('D')
    const value = screen.getByText('80kg × 8')
    expect(mark.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each([
    ['normal', 'normal'],
    ['no set type (older rows)', undefined],
  ])('a %s set has no «D»', (_, setType) => {
    render(<PreviousSetLine previousSet={{ ...previousSet, setType }} trackedFields={TRACKED_FIELDS} />)

    expect(screen.getByText('80kg × 8')).toBeInTheDocument()
    expect(screen.queryByText('D')).not.toBeInTheDocument()
  })

  it('a dropset with none of the fields the exercise measures now still renders nothing', () => {
    const { container } = render(
      <PreviousSetLine previousSet={{ setNumber: 2, setType: 'dropset', timeSeconds: 60 }} trackedFields={TRACKED_FIELDS} />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
