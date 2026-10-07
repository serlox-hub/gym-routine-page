import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n, PROMPT_CATALOG_STATUS } from '@gym/shared'

// Per file, not in setup.js: see BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()
import { render, screen, fireEvent } from '@testing-library/react'
import CopyPromptButton from './CopyPromptButton.jsx'

describe('CopyPromptButton', () => {
  const onCopy = vi.fn()
  const onRetry = vi.fn()
  const renderButton = (status, props = {}) => render(<CopyPromptButton status={status} onCopy={onCopy} onRetry={onRetry} {...props} />)
  const button = () => screen.getByRole('button', { name: /copiar prompt/i })
  const errorText = /no se ha podido cargar la lista de ejercicios/i

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('copies once the catalog has loaded', () => {
    renderButton(PROMPT_CATALOG_STATUS.READY)

    fireEvent.click(button())

    expect(onCopy).toHaveBeenCalledTimes(1)
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('is busy while the catalog loads: disabled, and a press copies nothing', () => {
    renderButton(PROMPT_CATALOG_STATUS.LOADING)

    expect(button()).toBeDisabled()
    fireEvent.click(button())

    expect(onCopy).not.toHaveBeenCalled()
  })

  it('when the catalog failed it still answers: retries and says why, without copying', () => {
    renderButton(PROMPT_CATALOG_STATUS.ERROR)

    expect(button()).toBeEnabled()
    expect(screen.queryByText(errorText)).not.toBeInTheDocument()

    fireEvent.click(button())

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onCopy).not.toHaveBeenCalled()
    expect(screen.getByText(errorText)).toBeInTheDocument()
  })

  it('hides the error while the retry runs and once the catalog loads', () => {
    const { rerender } = renderButton(PROMPT_CATALOG_STATUS.ERROR)
    fireEvent.click(button())

    rerender(<CopyPromptButton status={PROMPT_CATALOG_STATUS.LOADING} onCopy={onCopy} onRetry={onRetry} />)
    expect(screen.queryByText(errorText)).not.toBeInTheDocument()

    rerender(<CopyPromptButton status={PROMPT_CATALOG_STATUS.ERROR} onCopy={onCopy} onRetry={onRetry} />)
    expect(screen.getByText(errorText)).toBeInTheDocument()

    rerender(<CopyPromptButton status={PROMPT_CATALOG_STATUS.READY} onCopy={onCopy} onRetry={onRetry} />)
    expect(screen.queryByText(errorText)).not.toBeInTheDocument()
  })
})
