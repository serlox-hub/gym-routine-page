import { useExecutionTimer as _useExecutionTimer } from '@gym/shared'
import { playSound, vibrateDevice, isSoundEnabled, refreshSoundPreference } from './useRestTimer'

// Thin wrapper: inyecta los mismos callbacks de sonido/vibración/preferencia
// que usa el rest timer, para que la cuenta atrás de una serie por tiempo
// avise igual que el descanso entre series. `onStart` sigue el mismo patrón
// que `onTimerStart` de useTimerEngine, en vez de envolver el `start` que
// devuelve el hook — así queda memoizado igual que en la versión web.
export function useExecutionTimer(seconds) {
  return _useExecutionTimer(seconds, {
    playSound,
    vibrateDevice,
    isSoundEnabled,
    onStart: refreshSoundPreference,
  })
}
