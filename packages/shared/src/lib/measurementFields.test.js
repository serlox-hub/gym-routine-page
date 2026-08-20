import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TRACKED_FIELDS,
  FIELD_ORDER,
  MAX_TRACKED_FIELDS,
  SetField,
  distanceToMeters,
  formatFieldValue,
  formatTrackedFieldsLabel,
  getDefaultTarget,
  getFieldHeader,
  getFieldName,
  getFieldUnit,
  getPrimaryChartField,
  getPrimaryTargetField,
  getTargetLabel,
  getTargetPlaceholder,
  isTrackedFieldsSelectionValid,
  isValidField,
  metersToDistanceUnit,
  normalizeTrackedFields,
  parseFieldValue,
  resolveTrackedFields,
  sameTrackedFields,
  sortTrackedFields,
  toggleTrackedField,
  trackedFieldsFromLegacyType,
  tracksDistance,
  tracksLevel,
  tracksPace,
  tracksReps,
  tracksTime,
  tracksWeight,
} from './measurementFields.js'

const BIKE = [SetField.LEVEL, SetField.DISTANCE, SetField.TIME]

describe('normalizeTrackedFields', () => {
  it('ordena por FIELD_ORDER, sin importar cómo llegue de BD', () => {
    expect(normalizeTrackedFields(['time', 'level', 'distance'])).toEqual(BIKE)
    expect(normalizeTrackedFields(['reps', 'weight'])).toEqual(['weight', 'reps'])
  })

  it('descarta campos inválidos y duplicados', () => {
    expect(normalizeTrackedFields(['weight', 'weight', 'nope'])).toEqual(['weight'])
  })

  it('recorta al máximo de campos', () => {
    const all = normalizeTrackedFields(FIELD_ORDER)
    expect(all).toHaveLength(MAX_TRACKED_FIELDS)
    expect(all).toEqual(FIELD_ORDER.slice(0, MAX_TRACKED_FIELDS))
  })

  it('sin nada usable cae al default (peso × reps)', () => {
    expect(normalizeTrackedFields(null)).toEqual(DEFAULT_TRACKED_FIELDS)
    expect(normalizeTrackedFields(undefined)).toEqual(DEFAULT_TRACKED_FIELDS)
    expect(normalizeTrackedFields([])).toEqual(DEFAULT_TRACKED_FIELDS)
    expect(normalizeTrackedFields(['nope'])).toEqual(DEFAULT_TRACKED_FIELDS)
    // Un string suelto NO es una lista de campos: 'distance' no debe colar como ['distance']
    expect(normalizeTrackedFields('distance')).toEqual(DEFAULT_TRACKED_FIELDS)
  })

  it('devuelve una copia del default (mutarla no contamina al resto de ejercicios)', () => {
    const fields = normalizeTrackedFields(null)
    fields.push('time')
    expect(DEFAULT_TRACKED_FIELDS).toEqual(['weight', 'reps'])
  })
})

describe('sortTrackedFields', () => {
  it('permite la lista vacía (estado intermedio del selector)', () => {
    expect(sortTrackedFields([])).toEqual([])
    expect(sortTrackedFields(null)).toEqual([])
  })
})

describe('resolveTrackedFields', () => {
  it('lee del ejercicio y normaliza', () => {
    expect(resolveTrackedFields({ tracked_fields: ['time', 'level'] })).toEqual(['level', 'time'])
  })

  it('ejercicio nulo o sin columna cae al default', () => {
    expect(resolveTrackedFields(null)).toEqual(DEFAULT_TRACKED_FIELDS)
    expect(resolveTrackedFields({})).toEqual(DEFAULT_TRACKED_FIELDS)
  })
})

describe('sameTrackedFields', () => {
  it('compara por valor, no por referencia', () => {
    expect(sameTrackedFields(['weight', 'reps'], ['reps', 'weight'])).toBe(true)
    expect(sameTrackedFields(['weight', 'reps'], ['reps'])).toBe(false)
    expect(sameTrackedFields(null, ['weight', 'reps'])).toBe(true)
  })
})

describe('predicados', () => {
  it('responden a lo que mide el ejercicio', () => {
    expect(tracksLevel(BIKE)).toBe(true)
    expect(tracksDistance(BIKE)).toBe(true)
    expect(tracksTime(BIKE)).toBe(true)
    expect(tracksReps(BIKE)).toBe(false)
    expect(tracksWeight(BIKE)).toBe(false)
    expect(tracksPace(BIKE)).toBe(false)
  })
})

describe('toggleTrackedField', () => {
  it('marca y desmarca manteniendo el orden canónico', () => {
    expect(toggleTrackedField(['level', 'time'], 'distance')).toEqual(BIKE)
    expect(toggleTrackedField(BIKE, 'distance')).toEqual(['level', 'time'])
  })

  it('al llegar al máximo, marcar otro no hace nada', () => {
    expect(toggleTrackedField(BIKE, 'calories')).toEqual(BIKE)
  })

  it('desmarcar el último deja la selección vacía (el formulario lo señala)', () => {
    expect(toggleTrackedField(['reps'], 'reps')).toEqual([])
  })

  it('ignora campos inválidos', () => {
    expect(toggleTrackedField(['reps'], 'nope')).toEqual(['reps'])
  })
})

describe('isTrackedFieldsSelectionValid', () => {
  it('exige entre 1 y el máximo de campos', () => {
    expect(isTrackedFieldsSelectionValid([])).toBe(false)
    expect(isTrackedFieldsSelectionValid(null)).toBe(false)
    expect(isTrackedFieldsSelectionValid(['nope'])).toBe(false)
    expect(isTrackedFieldsSelectionValid(['reps'])).toBe(true)
    expect(isTrackedFieldsSelectionValid(BIKE)).toBe(true)
  })
})

describe('isValidField', () => {
  it('acepta los 7 campos y nada más', () => {
    FIELD_ORDER.forEach(field => expect(isValidField(field)).toBe(true))
    expect(isValidField('level_time')).toBe(false)
    expect(isValidField(undefined)).toBe(false)
  })
})

describe('formatTrackedFieldsLabel', () => {
  it('deriva la etiqueta de los campos, en orden de columnas', () => {
    expect(formatTrackedFieldsLabel(BIKE)).toBe('Nivel × Distancia × Tiempo')
    expect(formatTrackedFieldsLabel(['reps', 'weight'])).toBe('Peso × Reps')
  })

  it('sin campos devuelve cadena vacía (no la etiqueta del default)', () => {
    expect(formatTrackedFieldsLabel([])).toBe('')
  })
})

describe('cabeceras y unidades', () => {
  it('el peso y la distancia usan la unidad recibida', () => {
    expect(getFieldHeader(SetField.WEIGHT, { weightUnit: 'lb' })).toBe('LB')
    expect(getFieldHeader(SetField.WEIGHT)).toBe('KG')
    expect(getFieldHeader(SetField.DISTANCE, { distanceUnit: 'km' })).toBe('KM')
  })

  it('la cabecera de tiempo anuncia el FORMATO y su unidad dice la magnitud', () => {
    expect(getFieldHeader(SetField.TIME)).toBe('MM:SS')
    expect(getFieldUnit(SetField.TIME)).toBe('min')
  })

  it('todos los campos tienen nombre, cabecera y unidad', () => {
    FIELD_ORDER.forEach(field => {
      expect(getFieldName(field)).not.toBe('')
      expect(getFieldHeader(field)).not.toBe('')
      expect(getFieldUnit(field)).not.toBe('')
    })
  })
})

describe('parseFieldValue', () => {
  it('acepta coma decimal en peso', () => {
    expect(parseFieldValue(SetField.WEIGHT, '82,5')).toBe(82.5)
  })

  it('convierte la distancia a metros según la unidad de display', () => {
    expect(parseFieldValue(SetField.DISTANCE, '5', { distanceUnit: 'km' })).toBe(5000)
    expect(parseFieldValue(SetField.DISTANCE, '400')).toBe(400)
  })

  it('el resto son enteros', () => {
    expect(parseFieldValue(SetField.REPS, '10')).toBe(10)
    expect(parseFieldValue(SetField.TIME, '1200')).toBe(1200)
  })
})

describe('distanceToMeters / metersToDistanceUnit', () => {
  it('van y vuelven en km', () => {
    expect(distanceToMeters('5', 'km')).toBe(5000)
    expect(metersToDistanceUnit(5000, 'km')).toBe(5)
  })

  it('en metros no tocan el valor', () => {
    expect(distanceToMeters('400', 'm')).toBe(400)
    expect(metersToDistanceUnit(400, 'm')).toBe(400)
  })

  it('vacío o nulo cuentan como 0', () => {
    expect(distanceToMeters('', 'm')).toBe(0)
    expect(metersToDistanceUnit(null, 'm')).toBe(0)
  })
})

describe('formatFieldValue', () => {
  it('las reps llevan unidad solo cuando se pide', () => {
    expect(formatFieldValue(SetField.REPS, 12)).toBe('12')
    expect(formatFieldValue(SetField.REPS, 12, { repsUnit: true })).toBe('12 reps')
  })

  it('cada campo lleva su unidad o prefijo', () => {
    expect(formatFieldValue(SetField.WEIGHT, 80)).toBe('80kg')
    expect(formatFieldValue(SetField.WEIGHT, 80, { weightUnit: 'lb' })).toBe('80lb')
    expect(formatFieldValue(SetField.LEVEL, 12)).toBe('Nv12')
    expect(formatFieldValue(SetField.CALORIES, 300)).toBe('300kcal')
    expect(formatFieldValue(SetField.PACE, 300, { distanceUnit: 'km' })).toBe('5:00/km')
  })

  it('la duración nunca sale en segundos crudos', () => {
    expect(formatFieldValue(SetField.TIME, 1200)).toBe('20:00 min')
    expect(formatFieldValue(SetField.TIME, 45)).toBe('45s')
  })
})

describe('campo primario del objetivo', () => {
  it('ignora peso, nivel y ritmo (no son objetivo, son cómo se hace)', () => {
    expect(getPrimaryTargetField(['weight', 'reps'])).toBe(SetField.REPS)
    expect(getPrimaryTargetField(['level', 'time'])).toBe(SetField.TIME)
    expect(getPrimaryTargetField(['distance', 'pace'])).toBe(SetField.DISTANCE)
    expect(getPrimaryTargetField(['weight'])).toBeNull()
  })

  it('la distancia manda sobre el tiempo (cardio de recorrido)', () => {
    expect(getPrimaryTargetField(['distance', 'time'])).toBe(SetField.DISTANCE)
    expect(getPrimaryTargetField(BIKE)).toBe(SetField.DISTANCE)
  })
})

describe('getDefaultTarget', () => {
  it('la distancia sola se escribe en metros y la de recorrido en kilómetros', () => {
    expect(getDefaultTarget(['distance'])).toBe('40m')
    expect(getDefaultTarget(['distance', 'time'])).toBe('5km')
    expect(getDefaultTarget(['distance', 'pace'])).toBe('5km')
    expect(getDefaultTarget(BIKE)).toBe('5km')
  })
})

describe('getPrimaryChartField', () => {
  it('el peso manda, luego el nivel, luego la magnitud del trabajo', () => {
    expect(getPrimaryChartField(['weight', 'time'])).toBe(SetField.WEIGHT)
    expect(getPrimaryChartField(['level', 'time'])).toBe(SetField.LEVEL)
    expect(getPrimaryChartField(['distance', 'time'])).toBe(SetField.DISTANCE)
    expect(getPrimaryChartField(['reps'])).toBe(SetField.REPS)
  })
})

// Los 12 tipos del enum anterior (measurement_type) siguen existiendo como datos: los trae
// cualquier JSON de rutina exportado con el esquema v6 o anterior. Esta tabla es el contrato de
// esa traducción y la base del test de paridad de legacyParity.test.js.
describe('trackedFieldsFromLegacyType', () => {
  it.each([
    ['weight_reps', ['weight', 'reps']],
    ['reps_only', ['reps']],
    ['time', ['time']],
    ['weight_time', ['weight', 'time']],
    ['distance', ['distance']],
    ['weight_distance', ['weight', 'distance']],
    ['calories', ['calories']],
    ['level_time', ['level', 'time']],
    ['level_distance', ['level', 'distance']],
    ['level_calories', ['level', 'calories']],
    ['distance_time', ['distance', 'time']],
    ['distance_pace', ['distance', 'pace']],
  ])('%s → %s', (legacyType, expected) => {
    expect(trackedFieldsFromLegacyType(legacyType)).toEqual(expected)
  })

  it('tipo desconocido o ausente cae al default, como hacía el import antiguo', () => {
    expect(trackedFieldsFromLegacyType(null)).toEqual(DEFAULT_TRACKED_FIELDS)
    expect(trackedFieldsFromLegacyType('lo_que_sea')).toEqual(DEFAULT_TRACKED_FIELDS)
  })
})

describe('etiquetas del objetivo', () => {
  it('describen el campo primario', () => {
    expect(getTargetLabel(['weight', 'reps'])).toBe('Repeticiones')
    expect(getTargetLabel(['level', 'time'])).toBe('Tiempo')
    expect(getTargetLabel(BIKE)).toBe('Distancia')
  })

  it('el placeholder de distancia distingue metros de kilómetros', () => {
    expect(getTargetPlaceholder(['distance'])).toBe('Ej: 40m')
    expect(getTargetPlaceholder(BIKE)).toBe('Ej: 5km')
  })
})
