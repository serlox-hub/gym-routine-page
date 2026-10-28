import { describe, it, expect } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver ExerciseCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render } from '@testing-library/react'
import ProgressionHint from './ProgressionHint.jsx'

const previousSet = { setNumber: 1, weight: 30, reps: 12 }

function renderHint(trackedFields) {
  return render(
    <ProgressionHint previousSet={previousSet} target={null} targetField={null} trackedFields={trackedFields} />
  )
}

describe('ProgressionHint — arrow follows the direction', () => {
  it('assistance (better lower) shows the down arrow', () => {
    const { container } = renderHint(['assistance', 'reps'])

    expect(container.querySelector('svg.lucide-trending-down')).not.toBeNull()
    expect(container.querySelector('svg.lucide-trending-up')).toBeNull()
  })

  it.each([
    ['weight', ['weight', 'reps']],
    ['no tracked fields', undefined],
  ])('%s shows the up arrow', (_, trackedFields) => {
    const { container } = renderHint(trackedFields)

    expect(container.querySelector('svg.lucide-trending-up')).not.toBeNull()
    expect(container.querySelector('svg.lucide-trending-down')).toBeNull()
  })
})
