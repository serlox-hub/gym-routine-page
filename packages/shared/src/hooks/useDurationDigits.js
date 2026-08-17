import { useState, useEffect } from 'react'
import {
  clampDurationDigits,
  durationDigitsToSeconds,
  secondsToDurationDigits,
  formatDurationDigits,
} from '../lib/durationInput.js'

/**
 * Estado del input de duración (dígitos tecleados ↔ segundos), compartido web/native: lo único
 * con estado del campo, y la parte sutil es el resembrado (ver abajo). Los componentes solo ponen
 * el envoltorio de su plataforma.
 *
 * @param {number|string|''} seconds - valor externo, SIEMPRE en segundos
 * @param {(seconds: number|'') => void} onChange
 * @returns {{text: string, setFromInput: (raw: string) => void, normalize: () => void}}
 *   text: lo que se pinta ("20:00"); setFromInput: al teclear; normalize: al salir del campo
 *   (0:75 → 1:15; el ss > 59 se admite mientras se teclea).
 */
export function useDurationDigits(seconds, onChange) {
  const [digits, setDigits] = useState(() => secondsToDurationDigits(seconds))

  // El valor puede cambiar por fuera (prefill de la sesión anterior, conversión de unidad):
  // resembrar los dígitos salvo que ya representen ese mismo valor, o pisaría lo que se teclea.
  useEffect(() => {
    setDigits(prev => (durationDigitsToSeconds(prev) === (seconds === '' || seconds == null ? '' : Number(seconds))
      ? prev
      : secondsToDurationDigits(seconds)))
  }, [seconds])

  const setFromInput = (raw) => {
    const next = clampDurationDigits(raw)
    setDigits(next)
    onChange(durationDigitsToSeconds(next))
  }

  const normalize = () => {
    setDigits(secondsToDurationDigits(durationDigitsToSeconds(digits)))
  }

  return { text: formatDurationDigits(digits), setFromInput, normalize }
}
