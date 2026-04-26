import { createContext, useContext, useState, useMemo, createElement } from 'react'

const ExpandedExerciseContext = createContext(null)

/**
 * Provider para gestionar qué ejercicio está expandido en una sesión (accordion behavior).
 * Solo una card puede estar abierta simultáneamente. Pasar `defaultKey` para abrir uno por defecto.
 */
export function ExpandedExerciseProvider({ children, defaultKey = null }) {
  const [expandedKey, setExpandedKey] = useState(defaultKey)
  const value = useMemo(() => ({ expandedKey, setExpandedKey }), [expandedKey])
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
