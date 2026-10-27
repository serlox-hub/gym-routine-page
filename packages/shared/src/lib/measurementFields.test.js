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
  getDefaultTargetField,
  getPrimaryChartField,
  getProgressableField,
  getTargetLabel,
  getTargetPlaceholder,
  getTargetableFields,
  resolveTargetField,
  isTrackedFieldsSelectionValid,
  isValidField,
  metersToDistanceUnit,
  normalizeTrackedFields,
  parseFieldValue,
  resolveTrackedFields,
  sameTrackedFields,
  sortTrackedFields,
  toggleTrackedField,
  getBlockingTrackedField,
  getTrackedFieldsSelectionError,
  formatTrackedFieldConflict,
  tracksAssistance,
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

  // FIELD_ORDER holds weight AND assistance: weight is dropped before the cut (see below).
  it('recorta al máximo de campos', () => {
    const all = normalizeTrackedFields(FIELD_ORDER)
    expect(all).toHaveLength(MAX_TRACKED_FIELDS)
    expect(all).toEqual([SetField.ASSISTANCE, SetField.LEVEL, SetField.DISTANCE])
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

describe('campos que pueden ser objetivo', () => {
  it('ignora peso, nivel y ritmo (no son objetivo, son cómo se hace)', () => {
    expect(getTargetableFields(['weight', 'reps'])).toEqual([SetField.REPS])
    expect(getTargetableFields(['level', 'time'])).toEqual([SetField.TIME])
    expect(getTargetableFields(['distance', 'pace'])).toEqual([SetField.DISTANCE])
    expect(getTargetableFields(['weight'])).toEqual([])
  })

  it('la bici ofrece elegir entre distancia y tiempo, en orden canónico', () => {
    expect(getTargetableFields(BIKE)).toEqual([SetField.DISTANCE, SetField.TIME])
  })
})

describe('getDefaultTargetField', () => {
  it('propone lo que la app venía asumiendo: reps > distancia > tiempo > calorías', () => {
    expect(getDefaultTargetField(['weight', 'reps'])).toBe(SetField.REPS)
    expect(getDefaultTargetField(['level', 'time'])).toBe(SetField.TIME)
    expect(getDefaultTargetField(['distance', 'time'])).toBe(SetField.DISTANCE)
    expect(getDefaultTargetField(BIKE)).toBe(SetField.DISTANCE)
    expect(getDefaultTargetField(['level', 'calories'])).toBe(SetField.CALORIES)
  })

  it('null si el ejercicio no mide nada prescribible', () => {
    expect(getDefaultTargetField(['weight'])).toBeNull()
    expect(getDefaultTargetField(['distance', 'pace'])).toBe(SetField.DISTANCE)
  })
})

describe('resolveTargetField', () => {
  it('respeta el campo guardado cuando el ejercicio lo mide', () => {
    expect(resolveTargetField(SetField.TIME, BIKE)).toBe(SetField.TIME)
    expect(resolveTargetField(SetField.DISTANCE, BIKE)).toBe(SetField.DISTANCE)
  })

  it('descarta el guardado si el ejercicio ya no mide ese campo', () => {
    expect(resolveTargetField(SetField.REPS, ['level', 'time'])).toBe(SetField.TIME)
    // El peso nunca es objetivo, ni guardado a mano en BD
    expect(resolveTargetField(SetField.WEIGHT, ['weight', 'reps'])).toBe(SetField.REPS)
  })

  it('sin campo guardado cae al default', () => {
    expect(resolveTargetField(null, BIKE)).toBe(SetField.DISTANCE)
    expect(resolveTargetField(undefined, ['time'])).toBe(SetField.TIME)
    expect(resolveTargetField(null, ['weight'])).toBeNull()
  })
})

describe('getProgressableField', () => {
  it('el peso cuando lo mide, y el nivel cuando no (el nivel es el peso del cardio)', () => {
    expect(getProgressableField(['weight', 'reps'])).toBe(SetField.WEIGHT)
    expect(getProgressableField(['weight', 'level'])).toBe(SetField.WEIGHT)
    expect(getProgressableField(BIKE)).toBe(SetField.LEVEL)
    expect(getProgressableField(['level', 'calories'])).toBe(SetField.LEVEL)
  })

  it('null si no hay nada que subir', () => {
    expect(getProgressableField(['distance', 'time'])).toBeNull()
    expect(getProgressableField(['reps'])).toBeNull()
  })
})

describe('getDefaultTarget', () => {
  it('la distancia sola se escribe en metros y la de recorrido en kilómetros', () => {
    expect(getDefaultTarget(SetField.DISTANCE, ['distance'])).toBe('40m')
    expect(getDefaultTarget(SetField.DISTANCE, ['distance', 'time'])).toBe('5km')
    expect(getDefaultTarget(SetField.DISTANCE, ['distance', 'pace'])).toBe('5km')
    expect(getDefaultTarget(SetField.DISTANCE, BIKE)).toBe('5km')
  })

  it('el resto sale del campo objetivo, siempre con unidad explícita', () => {
    expect(getDefaultTarget(SetField.REPS, ['weight', 'reps'])).toBe('8-12')
    expect(getDefaultTarget(SetField.TIME, ['level', 'time'])).toBe('30s')
    expect(getDefaultTarget(SetField.CALORIES, ['level', 'calories'])).toBe('100kcal')
  })

  it('vacío sin campo objetivo: no hay default que inventar', () => {
    expect(getDefaultTarget(null, ['weight'])).toBe('')
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
  it('describen el campo objetivo elegido', () => {
    expect(getTargetLabel(SetField.REPS)).toBe('Repeticiones')
    expect(getTargetLabel(SetField.TIME)).toBe('Tiempo')
    expect(getTargetLabel(SetField.DISTANCE)).toBe('Distancia')
  })

  it('sin campo objetivo, la etiqueta neutra', () => {
    expect(getTargetLabel(null)).toBe('Objetivo')
  })

  it('el placeholder de distancia distingue metros de kilómetros', () => {
    expect(getTargetPlaceholder(SetField.DISTANCE, ['distance'])).toBe('Ej: 40m')
    expect(getTargetPlaceholder(SetField.DISTANCE, BIKE)).toBe('Ej: 5km')
  })
})

// ============================================
// ASSISTANCE (issue #202)
// ============================================

describe('assistance field', () => {
  const ASSISTED = [SetField.ASSISTANCE, SetField.REPS]

  it('sits right after weight in FIELD_ORDER and is a valid field', () => {
    expect(FIELD_ORDER.indexOf(SetField.ASSISTANCE)).toBe(FIELD_ORDER.indexOf(SetField.WEIGHT) + 1)
    expect(isValidField('assistance')).toBe(true)
  })

  it('normalizeTrackedFields keeps assistance and drops weight when both come', () => {
    expect(normalizeTrackedFields(['reps', 'weight', 'assistance'])).toEqual(ASSISTED)
    expect(normalizeTrackedFields(['weight', 'assistance'])).toEqual([SetField.ASSISTANCE])
    expect(normalizeTrackedFields(['assistance', 'reps'])).toEqual(ASSISTED)
  })

  it('drops weight before the cut to the maximum, so a third field survives', () => {
    expect(normalizeTrackedFields(['weight', 'assistance', 'reps', 'time']))
      .toEqual([SetField.ASSISTANCE, SetField.REPS, SetField.TIME])
  })

  it('sortTrackedFields (the form) keeps the pair, so the form can reject it', () => {
    expect(sortTrackedFields(['assistance', 'weight'])).toEqual([SetField.WEIGHT, SetField.ASSISTANCE])
  })

  it('tracksAssistance answers on the normalized list', () => {
    expect(tracksAssistance(ASSISTED)).toBe(true)
    expect(tracksAssistance(['weight', 'reps'])).toBe(false)
    expect(tracksWeight(['weight', 'assistance', 'reps'])).toBe(false)
  })

  it('getBlockingTrackedField: weight and assistance block each other, nothing else blocks', () => {
    expect(getBlockingTrackedField(['assistance', 'reps'], 'weight')).toBe(SetField.ASSISTANCE)
    expect(getBlockingTrackedField(['weight', 'reps'], 'assistance')).toBe(SetField.WEIGHT)
    expect(getBlockingTrackedField(['reps'], 'weight')).toBeNull()
    expect(getBlockingTrackedField(['weight', 'reps'], 'time')).toBeNull()
    // A field already selected is never blocked: it can always be unselected.
    expect(getBlockingTrackedField(['weight', 'assistance'], 'weight')).toBeNull()
  })

  it('toggleTrackedField refuses to add the blocked one and still removes', () => {
    expect(toggleTrackedField(['assistance', 'reps'], 'weight')).toEqual(ASSISTED)
    expect(toggleTrackedField(['weight', 'reps'], 'assistance')).toEqual(['weight', 'reps'])
    expect(toggleTrackedField(ASSISTED, 'assistance')).toEqual(['reps'])
    expect(toggleTrackedField(['reps'], 'assistance')).toEqual(ASSISTED)
  })

  it('getTrackedFieldsSelectionError: none for a valid list, a message for empty or the pair', () => {
    expect(getTrackedFieldsSelectionError(ASSISTED)).toBeNull()
    expect(getTrackedFieldsSelectionError([])).toBe('Elige al menos una medida')
    expect(getTrackedFieldsSelectionError(['weight', 'assistance', 'reps']))
      .toBe(formatTrackedFieldConflict(SetField.WEIGHT, SetField.ASSISTANCE))
    expect(isTrackedFieldsSelectionValid(['weight', 'assistance'])).toBe(false)
    expect(isTrackedFieldsSelectionValid(ASSISTED)).toBe(true)
  })

  it('formatTrackedFieldConflict names both fields', () => {
    expect(formatTrackedFieldConflict(SetField.ASSISTANCE, SetField.WEIGHT))
      .toBe('No puedes medir asistencia y peso a la vez. Quita peso para marcar asistencia.')
  })

  it('is labelled and formatted in the weight unit, 0 included', () => {
    expect(getFieldName(SetField.ASSISTANCE)).toBe('Asistencia')
    expect(getFieldHeader(SetField.ASSISTANCE)).toBe('ASIST. KG')
    expect(getFieldHeader(SetField.ASSISTANCE, { weightUnit: 'lb' })).toBe('ASIST. LB')
    expect(getFieldUnit(SetField.ASSISTANCE, { weightUnit: 'lb' })).toBe('lb')
    expect(formatFieldValue(SetField.ASSISTANCE, 20, { weightUnit: 'kg' })).toBe('20kg')
    expect(formatFieldValue(SetField.ASSISTANCE, 0, { weightUnit: 'kg' })).toBe('0kg')
    expect(parseFieldValue(SetField.ASSISTANCE, '22,5')).toBe(22.5)
    expect(parseFieldValue(SetField.ASSISTANCE, '0')).toBe(0)
    expect(formatTrackedFieldsLabel(ASSISTED)).toBe('Asistencia × Reps')
  })

  it('is progressable after weight and before level', () => {
    expect(getProgressableField(ASSISTED)).toBe(SetField.ASSISTANCE)
    expect(getProgressableField(['assistance', 'level'])).toBe(SetField.ASSISTANCE)
    expect(getProgressableField(['weight', 'reps'])).toBe(SetField.WEIGHT)
  })

  it('summarizes the chart, never falling back to reps', () => {
    expect(getPrimaryChartField(ASSISTED)).toBe(SetField.ASSISTANCE)
  })

  it('is never the target field', () => {
    expect(getTargetableFields(ASSISTED)).toEqual([SetField.REPS])
  })
})
