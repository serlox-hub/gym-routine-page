// Tipos de medidas corporales disponibles
export const BODY_MEASUREMENT_TYPES = {
  WAIST: 'cintura',
  CHEST: 'pecho',
  HIPS: 'cadera',
  ARM_LEFT: 'brazo_izquierdo',
  ARM_RIGHT: 'brazo_derecho',
  THIGH_LEFT: 'muslo_izquierdo',
  THIGH_RIGHT: 'muslo_derecho',
  CALF_LEFT: 'pantorrilla_izquierda',
  CALF_RIGHT: 'pantorrilla_derecha',
  NECK: 'cuello',
  SHOULDERS: 'hombros',
}

// Metadatos para UI
export const BODY_MEASUREMENT_INFO = {
  cintura: { label: 'Cintura', order: 1 },
  pecho: { label: 'Pecho', order: 2 },
  cadera: { label: 'Cadera', order: 3 },
  brazo_izquierdo: { label: 'Brazo izq.', order: 4 },
  brazo_derecho: { label: 'Brazo der.', order: 5 },
  muslo_izquierdo: { label: 'Muslo izq.', order: 6 },
  muslo_derecho: { label: 'Muslo der.', order: 7 },
  pantorrilla_izquierda: { label: 'Pantorrilla izq.', order: 8 },
  pantorrilla_derecha: { label: 'Pantorrilla der.', order: 9 },
  cuello: { label: 'Cuello', order: 10 },
  hombros: { label: 'Hombros', order: 11 },
}

/**
 * Obtiene los tipos de medidas ordenados por su orden definido
 * @returns {string[]} Array de keys de medidas ordenadas
 */
export function getOrderedMeasurementTypes() {
  return Object.entries(BODY_MEASUREMENT_INFO)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key]) => key)
}

/**
 * Obtiene el label de una medida
 * @param {string} type - Tipo de medida
 * @returns {string} Label para mostrar en UI
 */
export function getMeasurementLabel(type) {
  return BODY_MEASUREMENT_INFO[type]?.label || type
}
