import { describe, it, expect } from 'vitest'
import {
  buildExerciseConfigForm,
  buildExerciseConfigFormFromRow,
  buildReplaceExerciseForm,
  parseExerciseConfigForm,
  validateExerciseConfigForm,
} from './routineExerciseForm.js'
import { MeasurementType } from './measurementTypes.js'

const fullForm = {
  series: '4',
  reps: '10-12',
  rir: '2',
  rest_seconds: '90',
  notes: 'Controlar excéntrica',
  superset_group: '1',
}

describe('buildExerciseConfigForm', () => {
  it('prellena el objetivo según el tipo de medición', () => {
    expect(buildExerciseConfigForm(MeasurementType.WEIGHT_REPS).reps).toBe('8-12')
    expect(buildExerciseConfigForm(MeasurementType.LEVEL_TIME).reps).toBe('30s')
    expect(buildExerciseConfigForm(MeasurementType.LEVEL_DISTANCE).reps).toBe('40m')
    expect(buildExerciseConfigForm(MeasurementType.LEVEL_CALORIES).reps).toBe('100kcal')
    expect(buildExerciseConfigForm(MeasurementType.DISTANCE_TIME).reps).toBe('5km')
  })

  it('deja el resto de campos vacíos y las series por defecto', () => {
    expect(buildExerciseConfigForm(MeasurementType.LEVEL_TIME)).toEqual({
      series: '3',
      reps: '30s',
      rir: '',
      rest_seconds: '',
      notes: '',
      superset_group: '',
    })
  })

  it('cae a reps sin tipo de medición', () => {
    expect(buildExerciseConfigForm().reps).toBe('8-12')
  })
})

describe('validateExerciseConfigForm', () => {
  it('acepta un formulario completo', () => {
    const { valid, errors } = validateExerciseConfigForm(fullForm, MeasurementType.WEIGHT_REPS)
    expect(valid).toBe(true)
    expect(errors).toEqual({})
  })

  it('exige series para level_time igual que para weight_reps', () => {
    // Las series son el número de filas que se registran en la sesión, también
    // en cardio, y routine_exercises.series es NOT NULL.
    const form = { ...fullForm, series: '', rir: '' }
    expect(validateExerciseConfigForm(form, MeasurementType.LEVEL_TIME).valid).toBe(false)
    expect(validateExerciseConfigForm(form, MeasurementType.LEVEL_TIME).errors.series).toBeTruthy()
    expect(validateExerciseConfigForm(form, MeasurementType.WEIGHT_REPS).errors.series).toBeTruthy()
  })

  it('rechaza series no numéricas, cero y negativas en vez de caer al default', () => {
    for (const series of ['abc', '0', '-2', '']) {
      const { valid, errors } = validateExerciseConfigForm({ ...fullForm, series }, MeasurementType.WEIGHT_REPS)
      expect(valid, `series=${series}`).toBe(false)
      expect(errors.series).toBeTruthy()
    }
  })

  it('exige objetivo (reps/tiempo/distancia) y no acepta solo espacios', () => {
    const { valid, errors } = validateExerciseConfigForm({ ...fullForm, reps: '   ' }, MeasurementType.LEVEL_TIME)
    expect(valid).toBe(false)
    expect(errors.reps).toBeTruthy()
  })

  it('valida el esfuerzo contra la escala del tipo: RIR admite F (-1), RPE no', () => {
    const rirForm = { ...fullForm, rir: '-1' }
    expect(validateExerciseConfigForm(rirForm, MeasurementType.WEIGHT_REPS).valid).toBe(true)
    expect(validateExerciseConfigForm(rirForm, MeasurementType.LEVEL_TIME).valid).toBe(false)
  })

  it('valida el esfuerzo contra la escala del tipo: RPE llega a 5, RIR no', () => {
    const rpeForm = { ...fullForm, rir: '5' }
    expect(validateExerciseConfigForm(rpeForm, MeasurementType.LEVEL_TIME).valid).toBe(true)
    expect(validateExerciseConfigForm(rpeForm, MeasurementType.WEIGHT_REPS).valid).toBe(false)
  })

  it('acepta esfuerzo vacío (es opcional) y RIR 0', () => {
    expect(validateExerciseConfigForm({ ...fullForm, rir: '' }, MeasurementType.WEIGHT_REPS).valid).toBe(true)
    expect(validateExerciseConfigForm({ ...fullForm, rir: '0' }, MeasurementType.WEIGHT_REPS).valid).toBe(true)
  })

  it('rechaza descanso negativo pero acepta 0 y vacío', () => {
    expect(validateExerciseConfigForm({ ...fullForm, rest_seconds: '-1' }, MeasurementType.WEIGHT_REPS).errors.rest_seconds).toBeTruthy()
    expect(validateExerciseConfigForm({ ...fullForm, rest_seconds: '0' }, MeasurementType.WEIGHT_REPS).valid).toBe(true)
    expect(validateExerciseConfigForm({ ...fullForm, rest_seconds: '' }, MeasurementType.WEIGHT_REPS).valid).toBe(true)
  })

  it('acumula todos los errores en una sola pasada', () => {
    const form = { series: '', reps: '', rir: '99', rest_seconds: '-5', notes: '', superset_group: '' }
    const { valid, errors } = validateExerciseConfigForm(form, MeasurementType.LEVEL_TIME)
    expect(valid).toBe(false)
    expect(Object.keys(errors).sort()).toEqual(['reps', 'rest_seconds', 'rir', 'series'])
  })
})

describe('buildExerciseConfigFormFromRow', () => {
  const row = {
    series: 4, reps: '30s', rir: 3, rest_seconds: 60, notes: 'nota', superset_group: 2,
  }

  it('convierte la fila guardada a strings de formulario', () => {
    expect(buildExerciseConfigFormFromRow(row, MeasurementType.LEVEL_TIME)).toEqual({
      series: '4', reps: '30s', rir: '3', rest_seconds: '60', notes: 'nota', superset_group: '2',
    })
  })

  it('descarta el esfuerzo heredado que no pertenece a la escala del tipo', () => {
    // Fila antigua con RIR "F" (-1) en un ejercicio sin reps: en RPE no existe.
    expect(buildExerciseConfigFormFromRow({ ...row, rir: -1 }, MeasurementType.LEVEL_TIME).rir).toBe('')
    expect(buildExerciseConfigFormFromRow({ ...row, rir: 0 }, MeasurementType.LEVEL_TIME).rir).toBe('')
    // Y al revés: RPE 5 no existe en la escala RIR.
    expect(buildExerciseConfigFormFromRow({ ...row, rir: 5 }, MeasurementType.WEIGHT_REPS).rir).toBe('')
  })

  it('conserva el esfuerzo válido, incluidos los límites de cada escala', () => {
    expect(buildExerciseConfigFormFromRow({ ...row, rir: -1 }, MeasurementType.WEIGHT_REPS).rir).toBe('-1')
    expect(buildExerciseConfigFormFromRow({ ...row, rir: 0 }, MeasurementType.WEIGHT_REPS).rir).toBe('0')
    expect(buildExerciseConfigFormFromRow({ ...row, rir: 5 }, MeasurementType.LEVEL_TIME).rir).toBe('5')
  })

  it('deja los nulos como cadena vacía y conserva los ceros', () => {
    const empty = { series: 3, reps: '8-12', rir: null, rest_seconds: null, notes: null, superset_group: null }
    expect(buildExerciseConfigFormFromRow(empty, MeasurementType.WEIGHT_REPS)).toMatchObject({
      rir: '', rest_seconds: '', notes: '', superset_group: '',
    })
    expect(buildExerciseConfigFormFromRow({ ...row, rest_seconds: 0 }, MeasurementType.LEVEL_TIME).rest_seconds).toBe('0')
  })

  it('produce un formulario que pasa la validación', () => {
    const form = buildExerciseConfigFormFromRow(row, MeasurementType.LEVEL_TIME)
    expect(validateExerciseConfigForm(form, MeasurementType.LEVEL_TIME).valid).toBe(true)
  })
})

describe('buildReplaceExerciseForm', () => {
  it('reajusta el objetivo cuando cambia el tipo de medición', () => {
    const result = buildReplaceExerciseForm(fullForm, MeasurementType.LEVEL_TIME, MeasurementType.WEIGHT_REPS)
    expect(result.reps).toBe('30s')
  })

  it('conserva el objetivo cuando el tipo no cambia', () => {
    const result = buildReplaceExerciseForm(fullForm, MeasurementType.WEIGHT_REPS, MeasurementType.WEIGHT_REPS)
    expect(result.reps).toBe('10-12')
  })

  it('limpia esfuerzo y notas del ejercicio saliente y conserva series y superserie', () => {
    const result = buildReplaceExerciseForm(fullForm, MeasurementType.LEVEL_TIME, MeasurementType.WEIGHT_REPS)
    expect(result.rir).toBe('')
    expect(result.notes).toBe('')
    expect(result.series).toBe('4')
    expect(result.superset_group).toBe('1')
  })
})

describe('parseExerciseConfigForm', () => {
  it('parsea todos los campos correctamente', () => {
    expect(parseExerciseConfigForm(fullForm)).toEqual({
      series: 4,
      reps: '10-12',
      rir: 2,
      rest_seconds: 90,
      notes: 'Controlar excéntrica',
      superset_group: 1,
    })
  })

  it('deja en null los opcionales vacíos', () => {
    const result = parseExerciseConfigForm({ ...fullForm, rir: '', rest_seconds: '', notes: '', superset_group: '' })
    expect(result).toMatchObject({ rir: null, rest_seconds: null, notes: null, superset_group: null })
  })

  it('no inventa un default de series: devuelve NaN si el formulario no se validó', () => {
    // La validación es la única puerta. Si se salta, el fallo es visible en vez
    // de escribir 3 series silenciosamente en un ejercicio de cardio.
    expect(parseExerciseConfigForm({ ...fullForm, series: 'abc' }).series).toBeNaN()
    expect(parseExerciseConfigForm({ ...fullForm, series: '' }).series).toBeNaN()
  })

  it('no sustituye el objetivo por "8-12" cuando viene vacío', () => {
    expect(parseExerciseConfigForm({ ...fullForm, reps: '' }).reps).toBe('')
  })

  it('conserva rir 0 y RIR al fallo (-1)', () => {
    expect(parseExerciseConfigForm({ ...fullForm, rir: '0' }).rir).toBe(0)
    expect(parseExerciseConfigForm({ ...fullForm, rir: '-1' }).rir).toBe(-1)
  })
})
