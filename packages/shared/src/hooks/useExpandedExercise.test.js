import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderHook, act } from '@testing-library/react'
import { ExpandedExerciseProvider, useExpandedExercise } from './useExpandedExercise.js'

function wrapperWith(defaultKey) {
  return ({ children }) => createElement(ExpandedExerciseProvider, { defaultKey }, children)
}

describe('useExpandedExercise', () => {
  it('sin Provider devuelve estado neutro siempre expandido', () => {
    const { result } = renderHook(() => useExpandedExercise('A'))
    expect(result.current.expanded).toBe(true)
    expect(typeof result.current.toggle).toBe('function')
  })

  it('sin defaultKey ninguna card aparece expandida', () => {
    const { result } = renderHook(() => useExpandedExercise('A'), { wrapper: wrapperWith(null) })
    expect(result.current.expanded).toBe(false)
  })

  it('con defaultKey expande solo esa card', () => {
    const { result } = renderHook(() => ({
      a: useExpandedExercise('A'),
      b: useExpandedExercise('B'),
    }), { wrapper: wrapperWith('A') })
    expect(result.current.a.expanded).toBe(true)
    expect(result.current.b.expanded).toBe(false)
  })

  it('toggle abre y cierra la misma card', () => {
    const { result } = renderHook(() => useExpandedExercise('A'), { wrapper: wrapperWith(null) })
    expect(result.current.expanded).toBe(false)
    act(() => { result.current.toggle() })
    expect(result.current.expanded).toBe(true)
    act(() => { result.current.toggle() })
    expect(result.current.expanded).toBe(false)
  })

  it('comportamiento accordion: expandir B colapsa A', () => {
    const { result } = renderHook(() => ({
      a: useExpandedExercise('A'),
      b: useExpandedExercise('B'),
    }), { wrapper: wrapperWith('A') })
    expect(result.current.a.expanded).toBe(true)
    expect(result.current.b.expanded).toBe(false)
    act(() => { result.current.b.toggle() })
    expect(result.current.a.expanded).toBe(false)
    expect(result.current.b.expanded).toBe(true)
  })
})
