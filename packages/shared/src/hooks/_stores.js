let _authStore = null
let _workoutStore = null

export function initStores({ authStore, workoutStore }) {
  if (_authStore && process.env.NODE_ENV === 'production') {
    throw new Error('[gym/shared] initStores() must only be called once')
  }
  _authStore = authStore
  _workoutStore = workoutStore
}

export function useAuthStore(selector) {
  if (!_authStore) throw new Error('[gym/shared] initStores() must be called before using useAuthStore')
  return selector ? _authStore(selector) : _authStore()
}

export function useWorkoutStore(selector) {
  if (!_workoutStore) throw new Error('[gym/shared] initStores() must be called before using useWorkoutStore')
  return selector ? _workoutStore(selector) : _workoutStore()
}

export function getWorkoutStore() {
  if (!_workoutStore) throw new Error('[gym/shared] initStores() must be called before using getWorkoutStore')
  return _workoutStore
}

// Variante no-lanzante: devuelve el store o null si aún no se inyectó. Para código que
// puede correr sin store (p. ej. tests que montan un Provider sin initStores): degrada
// a no-op en vez de romper.
export function peekWorkoutStore() {
  return _workoutStore
}
