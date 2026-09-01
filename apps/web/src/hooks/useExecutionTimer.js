import { useExecutionTimer as _useExecutionTimer } from '@gym/shared'
import { playSound, vibrateDevice, isSoundEnabled } from './useRestTimer.js'

// Thin wrapper: inyecta los mismos callbacks de sonido/vibración/preferencia
// que usa el rest timer, para que la cuenta atrás de una serie por tiempo
// avise igual que el descanso entre series.
export function useExecutionTimer(seconds) {
  return _useExecutionTimer(seconds, { playSound, vibrateDevice, isSoundEnabled })
}
