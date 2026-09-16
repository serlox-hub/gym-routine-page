import { describe, it, expect } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto (ver BodyWeightModal.test.jsx).
i18n.use(initReactI18next)
initI18n()

import { render, screen } from '@testing-library/react'
import EffortPicker from './EffortPicker.jsx'

// Con RIR (showEffortScale) y notas (showSetNotes) ambos apagados, "Notas" prometería una sección
// que la hoja de detalles no tiene (issue de revisión rc-6): la etiqueta y el icono deben caer a
// un fallback genérico en vez de seguir hablando de notas.
describe('EffortPicker — fallback de etiqueta/icono cuando la escala de esfuerzo está apagada', () => {
  const TRACKED_FIELDS = ['weight', 'reps']

  it('con notas activadas: icono de nota y etiqueta "Notas"', () => {
    const { container } = render(
      <EffortPicker
        trackedFields={TRACKED_FIELDS}
        value={null}
        note={null}
        hasVideo={false}
        showEffortScale={false}
        showSetNotes
        onOpenDetails={() => {}}
      />
    )

    expect(container.querySelector('.lucide-sticky-note')).toBeTruthy()
    expect(container.querySelector('.lucide-sliders-horizontal')).toBeFalsy()
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Notas')
  })

  it('con notas TAMBIÉN apagadas: icono genérico y etiqueta "Detalles" (no "Notas")', () => {
    const { container } = render(
      <EffortPicker
        trackedFields={TRACKED_FIELDS}
        value={null}
        note={null}
        hasVideo={false}
        showEffortScale={false}
        showSetNotes={false}
        onOpenDetails={() => {}}
      />
    )

    expect(container.querySelector('.lucide-sliders-horizontal')).toBeTruthy()
    expect(container.querySelector('.lucide-sticky-note')).toBeFalsy()
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Detalles')
  })

  it('con nota o vídeo ya guardados, el icono principal prevalece sobre el fallback genérico', () => {
    const { container } = render(
      <EffortPicker
        trackedFields={TRACKED_FIELDS}
        value={null}
        note="alguna nota"
        hasVideo={false}
        showEffortScale={false}
        showSetNotes={false}
        onOpenDetails={() => {}}
      />
    )

    // Hay una nota real: se pinta el glifo de nota, no el fallback "sin nada que mostrar".
    expect(container.querySelector('.lucide-sticky-note')).toBeTruthy()
    expect(container.querySelector('.lucide-sliders-horizontal')).toBeFalsy()
  })
})
