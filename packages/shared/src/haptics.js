let _haptics = null

export function initHaptics(handlers) {
  _haptics = handlers
}

export function getHaptics() {
  return _haptics
}
