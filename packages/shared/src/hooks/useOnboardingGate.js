import { usePreference, useUpdatePreference } from './usePreferences.js'
import { useRoutines } from './useRoutines.js'
import { useCompletedSessionCount } from './useWorkoutHistory.js'

const ONBOARDING_KEY = 'onboarding_completed'

/**
 * Decide si mostrar el onboarding de primer uso.
 *
 * Se muestra solo a usuarios realmente nuevos: sin el flag marcado, sin rutinas
 * y sin sesiones completadas. Los usuarios existentes (que ya tienen rutinas o
 * historial) nunca lo ven, aunque el flag no exista todavía.
 *
 * `isLoading` es true mientras cualquiera de las tres fuentes carga: el consumidor
 * NO debe decidir mostrar/ocultar hasta que sea false, para evitar el parpadeo del
 * wizard sobre un usuario existente antes de que resuelvan las queries.
 *
 * @returns {{ isLoading: boolean, shouldShow: boolean, complete: () => void }}
 */
export function useOnboardingGate() {
  const { value: completed, isLoading: prefLoading } = usePreference(ONBOARDING_KEY)
  const { data: routines, isLoading: routinesLoading } = useRoutines()
  const { data: sessionCount, isLoading: countLoading } = useCompletedSessionCount()
  const updatePreference = useUpdatePreference()

  const isLoading = prefLoading || routinesLoading || countLoading
  const shouldShow =
    !isLoading &&
    !completed &&
    (routines?.length ?? 0) === 0 &&
    (sessionCount ?? 0) === 0

  const complete = () => updatePreference.mutate({ key: ONBOARDING_KEY, value: true })

  return { isLoading, shouldShow, complete }
}
