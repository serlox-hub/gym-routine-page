import { t } from '../i18n/index.js'

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

// Order for display
const MEASUREMENT_ORDER = {
  cintura: 1,
  pecho: 2,
  cadera: 3,
  brazo_izquierdo: 4,
  brazo_derecho: 5,
  muslo_izquierdo: 6,
  muslo_derecho: 7,
  pantorrilla_izquierda: 8,
  pantorrilla_derecha: 9,
  cuello: 10,
  hombros: 11,
}

// Metadatos para UI — labels are translated dynamically
export const BODY_MEASUREMENT_INFO = Object.fromEntries(
  Object.entries(MEASUREMENT_ORDER).map(([key, order]) => [
    key,
    { get label() { return t(`body:measurements.types.${key}`) }, order },
  ])
)

export function getOrderedMeasurementTypes() {
  return Object.entries(BODY_MEASUREMENT_INFO)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key]) => key)
}

export function getMeasurementLabel(type) {
  if (!type) return type
  return t(`body:measurements.types.${type}`, { defaultValue: type })
}
