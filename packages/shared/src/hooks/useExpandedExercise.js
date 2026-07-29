import { createContext, useContext, useState, useMemo, useCallback, createElement } from 'react'
import { peekWorkoutStore } from './_stores.js'

const ExpandedExerciseContext = createContext(null)

/**
 * Provider para gestionar qué ejercicio está expandido en una sesión (accordion behavior).
 * Solo una card puede estar abierta simultáneamente. Pasar `defaultKey` para abrir uno por defecto.
 *
 * El estado se respalda en el workout store (persistido) con write-through: al montar se
 * inicializa desde `expandedExerciseKey` del store, así al salir y volver a la sesión (o en
 * cold start) reabre la card que estaba abierta en vez de resetear a la primera. El Context
 * sigue siendo la fuente "viva" para los consumidores; el store es solo la capa de persistencia
 * (se escribe en cada cambio), sin doble fuente mutable que pueda desincronizarse.
 *
 * Sentinela del store: `undefined` = "auto" → usa `defaultKey`; `null` = "todo colapsado"
 * (elección explícita, se respeta); string = key concreta. Si no hay store (tests sin
 * initStores), degrada a estado puramente local con el comportamiento previo.
 */
export function ExpandedExerciseProvider({ children, defaultKey = null }) {
  const [expandedKey, setExpandedKeyLocal] = useState(() => {
    const stored = peekWorkoutStore()?.getState().expandedExerciseKey
    return stored !== undefined ? stored : defaultKey
  })

  const setExpandedKey = useCallback((key) => {
    setExpandedKeyLocal(key)
    peekWorkoutStore()?.getState().setExpandedExerciseKey?.(key)
  }, [])

  const value = useMemo(() => ({ expandedKey, setExpandedKey }), [expandedKey, setExpandedKey])
  return createElement(ExpandedExerciseContext.Provider, { value }, children)
}

/**
 * Hook que devuelve si esta card debe estar expandida y un toggle.
 * Si no hay Provider, devuelve estado neutro (siempre expandido) sin romper.
 */
export function useExpandedExercise(myKey) {
  const ctx = useContext(ExpandedExerciseContext)
  if (!ctx) return { expanded: true, toggle: () => {} }
  const expanded = ctx.expandedKey === myKey
  const toggle = () => ctx.setExpandedKey(expanded ? null : myKey)
  return { expanded, toggle }
}
