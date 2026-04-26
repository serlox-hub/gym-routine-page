import { createContext, useContext, useState, useMemo } from 'react'

const ExpandedExerciseContext = createContext(null)

export function ExpandedExerciseProvider({ children, defaultKey = null }) {
  const [expandedKey, setExpandedKey] = useState(defaultKey)
  const value = useMemo(() => ({ expandedKey, setExpandedKey }), [expandedKey])
  return (
    <ExpandedExerciseContext.Provider value={value}>
      {children}
    </ExpandedExerciseContext.Provider>
  )
}

export function useExpandedExercise(myKey) {
  const ctx = useContext(ExpandedExerciseContext)
  if (!ctx) return { expanded: true, toggle: () => {} }
  const expanded = ctx.expandedKey === myKey
  const toggle = () => ctx.setExpandedKey(expanded ? null : myKey)
  return { expanded, toggle }
}
