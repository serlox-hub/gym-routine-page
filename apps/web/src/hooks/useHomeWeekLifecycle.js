import { useHomeWeekLifecycle as _useHomeWeekLifecycle } from '@gym/shared'

// Home mounted counts as visible (the shared hook enters on mount and leaves on unmount); a hidden
// browser tab counts as away.
function subscribe(onEnter, onLeave) {
  const handler = () => (document.visibilityState === 'visible' ? onEnter() : onLeave())
  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}

export function useHomeWeekLifecycle() {
  _useHomeWeekLifecycle({ subscribe })
}
