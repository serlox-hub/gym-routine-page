import { describe, it, expect } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver ExerciseCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen } from '@testing-library/react'
import { colors } from '../../lib/styles.js'
import SetNumberMark from './SetNumberMark.jsx'

describe('SetNumberMark — what it shows', () => {
  it('a dropset shows «D» instead of its number', () => {
    render(<SetNumberMark setNumber={3} setType="dropset" />)

    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })

  it.each([
    ['normal', 'normal'],
    ['no set type (older rows)', undefined],
    ['null set type', null],
  ])('a %s set shows its number', (_, setType) => {
    render(<SetNumberMark setNumber={3} setType={setType} />)

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByText('D')).not.toBeInTheDocument()
  })
})

describe('SetNumberMark — colour and weight', () => {
  it('a plain set is muted and regular weight', () => {
    render(<SetNumberMark setNumber={1} setType="normal" />)

    expect(screen.getByText('1')).toHaveStyle({ color: colors.textMuted, fontWeight: '400' })
  })

  it('a dropset is orange and bold', () => {
    render(<SetNumberMark setNumber={1} setType="dropset" />)

    expect(screen.getByText('D')).toHaveStyle({ color: colors.orange, fontWeight: '700' })
  })

  it('a PR number is warning-coloured and bold', () => {
    render(<SetNumberMark setNumber={2} setType="normal" isPR />)

    expect(screen.getByText('2')).toHaveStyle({ color: colors.warning, fontWeight: '700' })
  })

  it('a dropset that is also a PR keeps the «D» but takes the PR colour', () => {
    render(<SetNumberMark setNumber={2} setType="dropset" isPR />)

    expect(screen.getByText('D')).toHaveStyle({ color: colors.warning, fontWeight: '700' })
  })
})

describe('SetNumberMark — layout props', () => {
  it('passes className through and lets the caller style add to (not replace) the colour', () => {
    render(<SetNumberMark setNumber={1} setType="dropset" className="shrink-0" style={{ width: 14, textAlign: 'right' }} />)

    const mark = screen.getByText('D')
    expect(mark).toHaveClass('shrink-0')
    expect(mark).toHaveStyle({ width: '14px', textAlign: 'right', color: colors.orange })
  })
})
