import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSelectedDaySessions } from './useSelectedDaySessions.js'

const DAY_15 = '2024-01-15T10:00:00Z'
const DAY_16 = '2024-01-16T10:00:00Z'
const DAY_20 = '2024-01-20T09:00:00Z'
const dateKey = (iso) => new Date(iso).toDateString()

function setup(initialSessions) {
  return renderHook(({ sessions }) => useSelectedDaySessions(sessions), {
    initialProps: { sessions: initialSessions },
  })
}

describe('useSelectedDaySessions', () => {
  it('arranca sin día ni sesión seleccionados, y selectedSessions vacío', () => {
    const { result } = setup([{ id: 1, started_at: DAY_15 }])
    expect(result.current.selectedDateKey).toBeNull()
    expect(result.current.selectedSessionId).toBeNull()
    expect(result.current.selectedSessions).toEqual([])
  })

  it('selectedSessions deriva del día seleccionado', () => {
    const sessions = [
      { id: 1, started_at: DAY_15 },
      { id: 2, started_at: DAY_15 },
      { id: 3, started_at: DAY_16 },
    ]
    const { result } = setup(sessions)

    act(() => result.current.setSelectedDateKey(dateKey(DAY_15)))

    expect(result.current.selectedSessions.map(s => s.id)).toEqual([1, 2])
  })

  it('selectedSessions se actualiza si la lista del mes cambia sin tocar la selección', () => {
    const sessions = [{ id: 1, started_at: DAY_15 }]
    const { result, rerender } = setup(sessions)

    act(() => result.current.setSelectedDateKey(dateKey(DAY_15)))
    expect(result.current.selectedSessions.map(s => s.id)).toEqual([1])

    rerender({ sessions: [...sessions, { id: 2, started_at: DAY_15 }] })
    expect(result.current.selectedSessions.map(s => s.id)).toEqual([1, 2])
  })

  it('sigue a la sesión seleccionada cuando se mueve a otro día dentro del mes cargado', () => {
    const sessions = [
      { id: 1, started_at: DAY_15 },
      { id: 2, started_at: DAY_16 },
    ]
    const { result, rerender } = setup(sessions)

    act(() => {
      result.current.setSelectedDateKey(dateKey(DAY_15))
      result.current.setSelectedSessionId(1)
    })
    expect(result.current.selectedSessions.map(s => s.id)).toEqual([1])

    // La sesión 1 se reprograma fuera del día 15, pero sigue en el mes cargado.
    const moved = sessions.map(s => (s.id === 1 ? { ...s, started_at: DAY_20 } : s))
    rerender({ sessions: moved })

    expect(result.current.selectedDateKey).toBe(dateKey(DAY_20))
    expect(result.current.selectedSessionId).toBe(1)
    expect(result.current.selectedSessions.map(s => s.id)).toEqual([1])
  })

  it('cierra la selección de sesión (sin tocar el día) cuando la sesión sale del mes cargado', () => {
    const sessions = [
      { id: 1, started_at: DAY_15 },
      { id: 2, started_at: DAY_16 },
    ]
    const { result, rerender } = setup(sessions)

    act(() => {
      result.current.setSelectedDateKey(dateKey(DAY_15))
      result.current.setSelectedSessionId(1)
    })

    // La sesión 1 ya no está en la lista del mes (se movió a otro mes).
    rerender({ sessions: sessions.filter(s => s.id !== 1) })

    expect(result.current.selectedSessionId).toBeNull()
    expect(result.current.selectedDateKey).toBe(dateKey(DAY_15))
    expect(result.current.selectedSessions).toEqual([])
  })

  it('no toca la selección mientras no haya sessions cargadas (undefined)', () => {
    const { result, rerender } = setup([{ id: 1, started_at: DAY_15 }])

    act(() => {
      result.current.setSelectedDateKey(dateKey(DAY_15))
      result.current.setSelectedSessionId(1)
    })

    rerender({ sessions: undefined })

    expect(result.current.selectedSessionId).toBe(1)
    expect(result.current.selectedDateKey).toBe(dateKey(DAY_15))
  })
})
