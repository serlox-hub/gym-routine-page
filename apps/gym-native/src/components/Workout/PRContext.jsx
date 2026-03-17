import { createContext, useContext } from 'react'

const PRContext = createContext(new Set())

export const PRProvider = PRContext.Provider

export function useIsPRSet(sessionExerciseId, setNumber) {
  const prSets = useContext(PRContext)
  return prSets.has(`${sessionExerciseId}-${setNumber}`)
}
