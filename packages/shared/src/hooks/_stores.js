let _authStore = null
let _workoutStore = null
let _initialized = false

export function initStores({ authStore, workoutStore }) {
  if (_initialized) throw new Error('[gym/shared] initStores() must only be called once')
  _authStore = authStore
  _workoutStore = workoutStore
  _initialized = true
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
