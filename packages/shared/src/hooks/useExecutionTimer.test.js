import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExecutionTimer } from './useExecutionTimer.js'

async function tick(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('useExecutionTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('arranca en el valor objetivo, sin correr', () => {
    const { result } = renderHook(() => useExecutionTimer(5))
    expect(result.current.remaining).toBe(5)
    expect(result.current.isRunning).toBe(false)
  })

  it('cuenta atrás cada segundo al arrancar', async () => {
    const { result } = renderHook(() => useExecutionTimer(5))

    act(() => result.current.start())
    expect(result.current.isRunning).toBe(true)

    await tick(1000)
    expect(result.current.remaining).toBe(4)
  })

  it('pita en los últimos TIMER_BEEP_WINDOW_SECONDS segundos, respetando isSoundEnabled', async () => {
    const playSound = vi.fn()
    const vibrateDevice = vi.fn()
    const { result } = renderHook(() =>
      useExecutionTimer(3, { playSound, vibrateDevice, isSoundEnabled: () => true })
    )

    act(() => result.current.start())
    await tick(1000) // 3 -> 2 (dentro de la ventana)
    expect(playSound).toHaveBeenCalledTimes(1)

    await tick(1000) // 2 -> 1
    expect(playSound).toHaveBeenCalledTimes(2)

    await tick(1000) // 1 -> 0, termina
    expect(result.current.remaining).toBe(0)
    expect(result.current.isRunning).toBe(false)
    expect(playSound).toHaveBeenCalledTimes(3)
    expect(vibrateDevice).toHaveBeenCalledTimes(1)
  })

  it('no pita si isSoundEnabled devuelve false', async () => {
    const playSound = vi.fn()
    const vibrateDevice = vi.fn()
    const { result } = renderHook(() =>
      useExecutionTimer(1, { playSound, vibrateDevice, isSoundEnabled: () => false })
    )

    act(() => result.current.start())
    await tick(1000)

    expect(result.current.remaining).toBe(0)
    expect(playSound).not.toHaveBeenCalled()
    expect(vibrateDevice).not.toHaveBeenCalled()
  })

  it('parar antes de terminar no dispara el beep de finalización', async () => {
    const playSound = vi.fn()
    const { result } = renderHook(() =>
      useExecutionTimer(5, { playSound, isSoundEnabled: () => true })
    )

    act(() => result.current.start())
    await tick(1000)
    act(() => result.current.stop())

    expect(result.current.remaining).toBe(5)
    expect(result.current.isRunning).toBe(false)
    expect(playSound).not.toHaveBeenCalled()
  })

  it('reiniciar tras terminar vuelve a pitar en la nueva cuenta atrás', async () => {
    const playSound = vi.fn()
    // seconds=1 ya cae dentro de la ventana de aviso: arrancar pita de entrada
    // (cuenta atrás) y el único tick pita otra vez al llegar a 0 (finalización).
    const { result } = renderHook(() =>
      useExecutionTimer(1, { playSound, isSoundEnabled: () => true })
    )

    act(() => result.current.start())
    await tick(1000)
    expect(result.current.remaining).toBe(0)
    expect(playSound).toHaveBeenCalledTimes(2)

    act(() => result.current.start())
    await tick(1000)
    expect(result.current.remaining).toBe(0)
    expect(playSound).toHaveBeenCalledTimes(4)
  })

  it('un cambio de seconds MIENTRAS corre no resincroniza remaining (regresión: reabrir el efecto por isRunning pisaba el 0 final)', async () => {
    const { result, rerender } = renderHook(
      ({ seconds }) => useExecutionTimer(seconds),
      { initialProps: { seconds: 60 } }
    )

    act(() => result.current.start())
    await tick(5000)
    expect(result.current.remaining).toBe(55)

    rerender({ seconds: 30 })
    expect(result.current.remaining).toBe(55)
    expect(result.current.isRunning).toBe(true)
  })

  it('un cambio de seconds ESTANDO parado sí resincroniza remaining al nuevo objetivo', () => {
    const { result, rerender } = renderHook(
      ({ seconds }) => useExecutionTimer(seconds),
      { initialProps: { seconds: 60 } }
    )

    expect(result.current.remaining).toBe(60)

    rerender({ seconds: 30 })
    expect(result.current.remaining).toBe(30)
  })

  it('un intervalo retrasado (throttling en segundo plano) se autocorrige al valor real anclado a Date.now(), no al número de ticks disparados', async () => {
    const { result } = renderHook(() => useExecutionTimer(10))

    act(() => result.current.start())
    await tick(2000)
    expect(result.current.remaining).toBe(8)

    // Simula el intervalo suspendido (pestaña/app en background): el reloj avanza
    // 5s de golpe sin que el setInterval llegue a dispararse mientras tanto.
    act(() => {
      vi.setSystemTime(Date.now() + 5000)
    })
    // Al reanudarse, el primer tick debe saltar directo al remaining real
    // (2s), no limitarse a restar 1 como haría un contador por número de ticks.
    await tick(1000)

    expect(result.current.remaining).toBe(2)
  })

  it('start() no arranca la cuenta atrás ni llama a onStart si seconds es 0', () => {
    const onStart = vi.fn()
    const { result } = renderHook(() => useExecutionTimer(0, { onStart }))

    act(() => result.current.start())

    expect(result.current.isRunning).toBe(false)
    expect(onStart).not.toHaveBeenCalled()
  })

  it('start() llama a onStart (usado por el wrapper native para refrescar la preferencia de sonido antes de correr)', () => {
    const onStart = vi.fn()
    const { result } = renderHook(() => useExecutionTimer(5, { onStart }))

    act(() => result.current.start())

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(result.current.isRunning).toBe(true)
  })
})
