import { savePendingSharedRoutine, takePendingSharedRoutine } from '@gym/shared'

// Reading `window.localStorage` itself throws when site data is blocked: the visitor then only
// loses the way back to the shared routine, never the page.
function storage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function savePendingSharedRoutinePath(path) {
  savePendingSharedRoutine(storage(), path, Date.now())
}

export function takePendingSharedRoutinePath() {
  return takePendingSharedRoutine(storage(), Date.now())
}
