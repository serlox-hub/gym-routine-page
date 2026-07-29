import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createElement } from 'react'
import { renderHook, act } from '@testing-library/react'
import { ExpandedExerciseProvider, useExpandedExercise } from './useExpandedExercise.js'
import { createJSONStorage } from 'zustand/middleware'
import { initStores } from './_stores.js'
import { createWorkoutStore } from '../stores/createWorkoutStore.js'

// Storage en memoria aislado por test (no comparte el localStorage de jsdom entre tests).
function makeMemStorage() {
  const raw = new Map()
  const stringStore = {
    getItem: (k) => (raw.has(k) ? raw.get(k) : null),
    setItem: (k, v) => { raw.set(k, v) },
    removeItem: (k) => { raw.delete(k) },
  }
  return createJSONStorage(() => stringStore)
}

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

  describe('con store persistido (reabre la card al volver a la sesión)', () => {
    let store
    beforeEach(() => {
      store = createWorkoutStore(makeMemStorage())
      initStores({ authStore: () => ({}), workoutStore: store })
    })
    afterEach(() => {
      initStores({ authStore: null, workoutStore: null })
    })

    it('inicializa desde el store: la key guardada gana sobre defaultKey', () => {
      act(() => { store.getState().setExpandedExerciseKey('B') })
      const { result } = renderHook(() => ({
        a: useExpandedExercise('A'),
        b: useExpandedExercise('B'),
      }), { wrapper: wrapperWith('A') })
      expect(result.current.a.expanded).toBe(false)
      expect(result.current.b.expanded).toBe(true)
    })

    it('toggle escribe en el store (write-through) y sobrevive al remount', () => {
      const { result, unmount } = renderHook(() => useExpandedExercise('A'), { wrapper: wrapperWith(null) })
      act(() => { result.current.toggle() })
      expect(store.getState().expandedExerciseKey).toBe('A')
      unmount()
      const { result: result2 } = renderHook(() => useExpandedExercise('A'), { wrapper: wrapperWith(null) })
      expect(result2.current.expanded).toBe(true)
    })

    it('respeta "todo colapsado" (null) al remontar: no reabre el default', () => {
      act(() => { store.getState().setExpandedExerciseKey(null) })
      const { result } = renderHook(() => useExpandedExercise('A'), { wrapper: wrapperWith('A') })
      expect(result.current.expanded).toBe(false)
    })
  })
})
