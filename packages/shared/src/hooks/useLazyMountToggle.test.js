import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLazyMountToggle } from './useLazyMountToggle.js'

describe('useLazyMountToggle', () => {
  it('arranca cerrado y sin montar', () => {
    const { result } = renderHook(() => useLazyMountToggle(false))
    expect(result.current.open).toBe(false)
    expect(result.current.mounted).toBe(false)
  })

  it('abrir monta y hace visible', () => {
    const { result } = renderHook(() => useLazyMountToggle(false))
    act(() => { result.current.toggle() })
    expect(result.current.open).toBe(true)
    expect(result.current.mounted).toBe(true)
  })

  it('cerrar oculta pero MANTIENE montado (no re-pedir el contenido al reabrir)', () => {
    const { result } = renderHook(() => useLazyMountToggle(false))
    act(() => { result.current.toggle() }) // abrir
    act(() => { result.current.toggle() }) // cerrar
    expect(result.current.open).toBe(false)
    expect(result.current.mounted).toBe(true)
  })

  it('colapsar olvida la apertura: al reexpandir con la sección cerrada no se monta', () => {
    const { result, rerender } = renderHook(({ collapsed }) => useLazyMountToggle(collapsed), {
      initialProps: { collapsed: false },
    })
    act(() => { result.current.toggle() }) // abrir
    act(() => { result.current.toggle() }) // cerrar (sigue montado)
    expect(result.current.mounted).toBe(true)

    rerender({ collapsed: true }) // colapsar la tarjeta
    rerender({ collapsed: false }) // reexpandir con la sección cerrada
    expect(result.current.open).toBe(false)
    expect(result.current.mounted).toBe(false)
  })

  it('tras colapsar+reexpandir con la sección cerrada, reabrir vuelve a montar', () => {
    const { result, rerender } = renderHook(({ collapsed }) => useLazyMountToggle(collapsed), {
      initialProps: { collapsed: false },
    })
    act(() => { result.current.toggle() }) // abrir
    act(() => { result.current.toggle() }) // cerrar
    rerender({ collapsed: true })
    rerender({ collapsed: false })
    expect(result.current.mounted).toBe(false)

    act(() => { result.current.toggle() }) // reabrir
    expect(result.current.open).toBe(true)
    expect(result.current.mounted).toBe(true)
  })

  it('si estaba abierta al colapsar, sigue visible al reexpandir', () => {
    const { result, rerender } = renderHook(({ collapsed }) => useLazyMountToggle(collapsed), {
      initialProps: { collapsed: false },
    })
    act(() => { result.current.toggle() }) // abrir (queda abierta)
    rerender({ collapsed: true })
    rerender({ collapsed: false })
    expect(result.current.open).toBe(true)
    expect(result.current.mounted).toBe(true)
  })
})
