import { useState, useMemo, useEffect } from 'react'
import { getSessionsForDateKey, findSessionDateKey } from '../lib/calendarUtils.js'

/**
 * Día y sesión seleccionados en el historial, para la pantalla de calendario de ambas apps.
 *
 * Las sesiones del día se DERIVAN de la lista viva del mes en cada render, no se copian al
 * pulsar el día: una copia sigue pintando la sesión donde estaba después de moverla de fecha.
 *
 * Y cuando la sesión abierta cambia de día (reprogramar su inicio), la selección la SIGUE en
 * vez de cerrarse: mover el inicio y mover el fin son dos pasos, y cerrar el detalle entre
 * medias deja al usuario sin el sitio desde el que dar el segundo, sin decirle a dónde fue.
 * Solo se cierra si la sesión ya no está en el mes cargado.
 *
 * @param {Array|undefined} sessions - sesiones del mes (`useWorkoutHistory`)
 * @returns {{
 *   selectedDateKey: string|null,
 *   setSelectedDateKey: Function,
 *   selectedSessionId: string|number|null,
 *   setSelectedSessionId: Function,
 *   selectedSessions: Array,
 * }}
 */
export function useSelectedDaySessions(sessions) {
  const [selectedDateKey, setSelectedDateKey] = useState(null)
  const [selectedSessionId, setSelectedSessionId] = useState(null)

  const selectedSessions = useMemo(
    () => getSessionsForDateKey(sessions, selectedDateKey),
    [sessions, selectedDateKey]
  )

  useEffect(() => {
    if (!sessions || selectedSessionId == null) return
    if (selectedSessions.some(s => String(s.id) === String(selectedSessionId))) return

    const movedToDateKey = findSessionDateKey(sessions, selectedSessionId)
    if (movedToDateKey) setSelectedDateKey(movedToDateKey)
    else setSelectedSessionId(null)
  }, [sessions, selectedSessions, selectedSessionId])

  return {
    selectedDateKey,
    setSelectedDateKey,
    selectedSessionId,
    setSelectedSessionId,
    selectedSessions,
  }
}
