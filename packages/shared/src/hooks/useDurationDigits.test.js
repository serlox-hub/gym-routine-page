import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDurationDigits } from './useDurationDigits.js'

describe('useDurationDigits', () => {
  it('siembra el texto desde los segundos que recibe', () => {
    expect(renderHook(() => useDurationDigits(1200, vi.fn())).result.current.text).toBe('20:00')
    expect(renderHook(() => useDurationDigits(45, vi.fn())).result.current.text).toBe('0:45')
    expect(renderHook(() => useDurationDigits(12240, vi.fn())).result.current.text).toBe('3:24:00')
  })

  it('sin valor el campo queda vacío (que el input enseñe su placeholder)', () => {
    expect(renderHook(() => useDurationDigits('', vi.fn())).result.current.text).toBe('')
    expect(renderHook(() => useDurationDigits(null, vi.fn())).result.current.text).toBe('')
    expect(renderHook(() => useDurationDigits('abc', vi.fn())).result.current.text).toBe('')
  })

  it('al teclear emite SEGUNDOS y pinta el relleno por dígitos', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useDurationDigits('', onChange))

    act(() => result.current.setFromInput('2000'))
    expect(onChange).toHaveBeenLastCalledWith(1200)
    expect(result.current.text).toBe('20:00')

    act(() => result.current.setFromInput('20000'))
    expect(onChange).toHaveBeenLastCalledWith(7200)
    expect(result.current.text).toBe('2:00:00')
  })

  it('borrar hasta el último dígito vacía el campo (no se queda en 0:00)', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useDurationDigits(5, onChange))
    expect(result.current.text).toBe('0:05')

    act(() => result.current.setFromInput('0:0'))
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(result.current.text).toBe('')
  })

  // El caso que hace correcto el resembrado: mientras se teclea, el valor externo vuelve con
  // los mismos segundos → NO debe reescribir los dígitos o se pisaría lo que el usuario escribe.
  it('un valor externo equivalente no pisa lo tecleado', () => {
    const onChange = vi.fn()
    const { result, rerender } = renderHook(({ seconds }) => useDurationDigits(seconds, onChange), {
      initialProps: { seconds: '' },
    })

    act(() => result.current.setFromInput('75'))
    expect(result.current.text).toBe('0:75')

    rerender({ seconds: 75 })
    expect(result.current.text).toBe('0:75')
  })

  it('un valor externo distinto sí entra (prefill de la sesión anterior)', () => {
    const { result, rerender } = renderHook(({ seconds }) => useDurationDigits(seconds, vi.fn()), {
      initialProps: { seconds: '' },
    })
    expect(result.current.text).toBe('')

    rerender({ seconds: 1800 })
    expect(result.current.text).toBe('30:00')
  })

  it('normalize reordena mm:ss al salir del campo sin volver a emitir el valor', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useDurationDigits('', onChange))

    act(() => result.current.setFromInput('75'))
    expect(result.current.text).toBe('0:75')
    onChange.mockClear()

    act(() => result.current.normalize())
    expect(result.current.text).toBe('1:15')
    expect(onChange).not.toHaveBeenCalled()
  })
})
