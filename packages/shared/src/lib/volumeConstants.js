/**
 * Rangos de volumen semanal por grupo muscular (series/semana).
 * Basado en las recomendaciones de Renaissance Periodization.
 *
 * MV  = Volumen de Mantenimiento (mantener tamano/fuerza)
 * MEV = Volumen Minimo Efectivo (empezar a progresar)
 * MAV = Volumen Maximo Adaptativo (rango optimo)
 * MRV = Volumen Maximo Recuperable (limite antes de sobreentrenamiento)
 */

export const VOLUME_LANDMARKS = {
  'Pecho':          { mv: 4,  mev: 6,  mav: 16, mrv: 22 },
  'Espalda':        { mv: 8,  mev: 10, mav: 18, mrv: 25 },
  'Hombros':        { mv: 0,  mev: 8,  mav: 19, mrv: 26 },
  'Bíceps':         { mv: 5,  mev: 8,  mav: 17, mrv: 26 },
  'Tríceps':        { mv: 4,  mev: 6,  mav: 12, mrv: 18 },
  'Cuádriceps':     { mv: 6,  mev: 8,  mav: 15, mrv: 20 },
  'Isquiotibiales': { mv: 4,  mev: 6,  mav: 13, mrv: 20 },
  'Pantorrillas':   { mv: 6,  mev: 8,  mav: 14, mrv: 20 },
  'Abdominales':    { mv: 0,  mev: 0,  mav: 18, mrv: 25 },
  'Glúteos':        { mv: 0,  mev: 0,  mav: 8,  mrv: 16 },
}

/**
 * Devuelve los rangos de volumen para un grupo muscular.
 * @param {string} muscleGroupName
 * @returns {{ mv: number, mev: number, mav: number, mrv: number } | null}
 */
export function getVolumeLandmarks(muscleGroupName) {
  return VOLUME_LANDMARKS[muscleGroupName] || null
}

/**
 * Evalua en que rango cae un volumen semanal para un grupo muscular.
 * @param {string} muscleGroupName
 * @param {number} weeklySets
 * @returns {'below_mv' | 'mv_mev' | 'mev_mav' | 'above_mav' | 'above_mrv' | null}
 */
export function getVolumeZone(muscleGroupName, weeklySets) {
  const landmarks = VOLUME_LANDMARKS[muscleGroupName]
  if (!landmarks) return null

  if (weeklySets < landmarks.mv) return 'below_mv'
  if (weeklySets < landmarks.mev) return 'mv_mev'
  if (weeklySets <= landmarks.mav) return 'mev_mav'
  if (weeklySets <= landmarks.mrv) return 'above_mav'
  return 'above_mrv'
}

// Colores por zona de volumen (compartidos entre web y native)
export const VOLUME_ZONE_COLORS = {
  below_mv: '#8b949e',
  mv_mev: '#d29922',
  mev_mav: '#3fb950',
  above_mav: '#58a6ff',
  above_mrv: '#f85149',
}

// Colores de fondo de las secciones de la barra (rgba)
export const VOLUME_BAR_COLORS = {
  mv: 'rgba(139,148,158,0.15)',
  mev: 'rgba(210,153,34,0.15)',
  mav: 'rgba(63,185,80,0.15)',
  mrv: 'rgba(88,166,255,0.15)',
  over: 'rgba(248,81,73,0.15)',
}

// Items de la leyenda
export const VOLUME_LEGEND_ITEMS = [
  { label: '< MV', description: 'Insuficiente', color: 'rgba(139,148,158,0.4)' },
  { label: 'MV', description: 'Mantenimiento', color: 'rgba(210,153,34,0.4)' },
  { label: 'MEV', description: 'Minimo efectivo', color: 'rgba(63,185,80,0.4)' },
  { label: 'MAV', description: 'Maximo adaptativo', color: 'rgba(88,166,255,0.4)' },
  { label: 'MRV', description: 'Maximo recuperable', color: 'rgba(248,81,73,0.4)' },
]
