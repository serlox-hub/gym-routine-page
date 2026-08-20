import { describe, it, expect } from 'vitest'
import {
  buildExerciseConfigForm,
  buildExerciseConfigFormFromRow,
  buildReplaceExerciseForm,
  buildTargetFieldChangeForm,
  parseExerciseConfigForm,
  validateExerciseConfigForm,
} from './routineExerciseForm.js'

const fullForm = {
  series: '4',
  target_field: 'reps',
  reps: '10-12',
  level: '',
  rir: '2',
  rest_seconds: '90',
  notes: 'Controlar excéntrica',
  superset_group: '1',
}

describe('buildExerciseConfigForm', () => {
  it('prellena el objetivo según lo que mide el ejercicio', () => {
    expect(buildExerciseConfigForm(['weight', 'reps']).reps).toBe('8-12')
    expect(buildExerciseConfigForm(['level', 'time']).reps).toBe('30s')
    expect(buildExerciseConfigForm(['level', 'distance']).reps).toBe('40m')
    expect(buildExerciseConfigForm(['level', 'calories']).reps).toBe('100kcal')
    expect(buildExerciseConfigForm(['distance', 'time']).reps).toBe('5km')
  })

  it('propone el campo objetivo, no solo su valor', () => {
    expect(buildExerciseConfigForm(['weight', 'reps']).target_field).toBe('reps')
    expect(buildExerciseConfigForm(['level', 'time']).target_field).toBe('time')
    // La bici (nivel × distancia × tiempo) arranca en distancia, que es lo que la app asumía
    expect(buildExerciseConfigForm(['level', 'distance', 'time']).target_field).toBe('distance')
    // Sin campo prescribible: objetivo vacío, lo pide la validación
    expect(buildExerciseConfigForm(['weight']).target_field).toBe('')
  })

  it('deja el resto de campos vacíos y las series por defecto', () => {
    expect(buildExerciseConfigForm(['level', 'time'])).toEqual({
      series: '3',
      target_field: 'time',
      reps: '30s',
      level: '',
      rir: '',
      rest_seconds: '',
      notes: '',
      superset_group: '',
    })
  })

  it('cae a reps si el ejercicio no declara campos', () => {
    expect(buildExerciseConfigForm().reps).toBe('8-12')
  })
})

describe('buildTargetFieldChangeForm', () => {
  it('cambiar de campo reescribe el valor con el default del nuevo (con su unidad)', () => {
    const bike = ['level', 'distance', 'time']
    const form = { ...fullForm, target_field: 'distance', reps: '5km' }
    expect(buildTargetFieldChangeForm(form, 'time', bike)).toMatchObject({ target_field: 'time', reps: '30s' })
  })

  it('elegir el mismo campo no toca nada', () => {
    const form = { ...fullForm, target_field: 'reps', reps: '5' }
    expect(buildTargetFieldChangeForm(form, 'reps', ['weight', 'reps'])).toBe(form)
  })
})

describe('validateExerciseConfigForm', () => {
  it('el nivel prescrito tiene que ser un entero dentro del rango de smallint', () => {
    const withLevel = (level) => validateExerciseConfigForm({ ...fullForm, level }, ['level', 'time'])
    expect(withLevel('8').valid).toBe(true)
    expect(withLevel('0').valid).toBe(true)
    expect(withLevel('').valid).toBe(true)
    // 40000 pasaría el "es un número" y moriría en BD con 22003 (smallint)
    expect(withLevel('40000').errors.level).toBeTruthy()
    expect(withLevel('-1').errors.level).toBeTruthy()
    // "8.5" con parseInt se guardaría como 8, un nivel que el usuario no escribió
    expect(withLevel('8.5').errors.level).toBeTruthy()
    expect(withLevel('ocho').errors.level).toBeTruthy()
  })

  it('acepta un formulario completo', () => {
    const { valid, errors } = validateExerciseConfigForm(fullForm, ['weight', 'reps'])
    expect(valid).toBe(true)
    expect(errors).toEqual({})
  })

  it('exige series para level_time igual que para weight_reps', () => {
    // Las series son el número de filas que se registran en la sesión, también
    // en cardio, y routine_exercises.series es NOT NULL.
    const form = { ...fullForm, series: '', rir: '' }
    expect(validateExerciseConfigForm(form, ['level', 'time']).valid).toBe(false)
    expect(validateExerciseConfigForm(form, ['level', 'time']).errors.series).toBeTruthy()
    expect(validateExerciseConfigForm(form, ['weight', 'reps']).errors.series).toBeTruthy()
  })

  it('rechaza series no numéricas, cero y negativas en vez de caer al default', () => {
    for (const series of ['abc', '0', '-2', '']) {
      const { valid, errors } = validateExerciseConfigForm({ ...fullForm, series }, ['weight', 'reps'])
      expect(valid, `series=${series}`).toBe(false)
      expect(errors.series).toBeTruthy()
    }
  })

  it('exige objetivo (reps/tiempo/distancia) y no acepta solo espacios', () => {
    const { valid, errors } = validateExerciseConfigForm({ ...fullForm, reps: '   ' }, ['level', 'time'])
    expect(valid).toBe(false)
    expect(errors.reps).toBeTruthy()
  })

  it('valida el esfuerzo contra la escala del tipo: RIR admite F (-1), RPE no', () => {
    const rirForm = { ...fullForm, rir: '-1' }
    expect(validateExerciseConfigForm(rirForm, ['weight', 'reps']).valid).toBe(true)
    expect(validateExerciseConfigForm(rirForm, ['level', 'time']).valid).toBe(false)
  })

  it('valida el esfuerzo contra la escala del tipo: RPE llega a 5, RIR no', () => {
    const rpeForm = { ...fullForm, rir: '5' }
    expect(validateExerciseConfigForm(rpeForm, ['level', 'time']).valid).toBe(true)
    expect(validateExerciseConfigForm(rpeForm, ['weight', 'reps']).valid).toBe(false)
  })

  it('acepta esfuerzo vacío (es opcional) y RIR 0', () => {
    expect(validateExerciseConfigForm({ ...fullForm, rir: '' }, ['weight', 'reps']).valid).toBe(true)
    expect(validateExerciseConfigForm({ ...fullForm, rir: '0' }, ['weight', 'reps']).valid).toBe(true)
  })

  it('rechaza descanso negativo pero acepta 0 y vacío', () => {
    expect(validateExerciseConfigForm({ ...fullForm, rest_seconds: '-1' }, ['weight', 'reps']).errors.rest_seconds).toBeTruthy()
    expect(validateExerciseConfigForm({ ...fullForm, rest_seconds: '0' }, ['weight', 'reps']).valid).toBe(true)
    expect(validateExerciseConfigForm({ ...fullForm, rest_seconds: '' }, ['weight', 'reps']).valid).toBe(true)
  })

  it('acumula todos los errores en una sola pasada', () => {
    const form = { series: '', reps: '', rir: '99', rest_seconds: '-5', notes: '', superset_group: '' }
    const { valid, errors } = validateExerciseConfigForm(form, ['level', 'time'])
    expect(valid).toBe(false)
    expect(Object.keys(errors).sort()).toEqual(['reps', 'rest_seconds', 'rir', 'series'])
  })
})

describe('buildExerciseConfigFormFromRow', () => {
  const row = {
    series: 4, reps: '30s', rir: 3, rest_seconds: 60, notes: 'nota', superset_group: 2,
  }

  it('convierte la fila guardada a strings de formulario', () => {
    expect(buildExerciseConfigFormFromRow(row, ['level', 'time'])).toEqual({
      series: '4', target_field: 'time', reps: '30s', level: '', rir: '3', rest_seconds: '60',
      notes: 'nota', superset_group: '2',
    })
  })

  it('respeta el campo objetivo guardado y descarta el que el ejercicio ya no mide', () => {
    const bike = ['level', 'distance', 'time']
    expect(buildExerciseConfigFormFromRow({ ...row, target_field: 'time' }, bike).target_field).toBe('time')
    // Fila con objetivo en reps y ejercicio que dejó de medirlas → cae al default de la bici
    expect(buildExerciseConfigFormFromRow({ ...row, target_field: 'reps' }, bike).target_field).toBe('distance')
  })

  it('trae el nivel prescrito como string, y el 0 no se pierde', () => {
    expect(buildExerciseConfigFormFromRow({ ...row, level: 8 }, ['level', 'time']).level).toBe('8')
    expect(buildExerciseConfigFormFromRow({ ...row, level: 0 }, ['level', 'time']).level).toBe('0')
    expect(buildExerciseConfigFormFromRow({ ...row, level: null }, ['level', 'time']).level).toBe('')
  })

  it('descarta el esfuerzo heredado que no pertenece a la escala del tipo', () => {
    // Fila antigua con RIR "F" (-1) en un ejercicio sin reps: en RPE no existe.
    expect(buildExerciseConfigFormFromRow({ ...row, rir: -1 }, ['level', 'time']).rir).toBe('')
    expect(buildExerciseConfigFormFromRow({ ...row, rir: 0 }, ['level', 'time']).rir).toBe('')
    // Y al revés: RPE 5 no existe en la escala RIR.
    expect(buildExerciseConfigFormFromRow({ ...row, rir: 5 }, ['weight', 'reps']).rir).toBe('')
  })

  it('conserva el esfuerzo válido, incluidos los límites de cada escala', () => {
    expect(buildExerciseConfigFormFromRow({ ...row, rir: -1 }, ['weight', 'reps']).rir).toBe('-1')
    expect(buildExerciseConfigFormFromRow({ ...row, rir: 0 }, ['weight', 'reps']).rir).toBe('0')
    expect(buildExerciseConfigFormFromRow({ ...row, rir: 5 }, ['level', 'time']).rir).toBe('5')
  })

  it('deja los nulos como cadena vacía y conserva los ceros', () => {
    const empty = { series: 3, reps: '8-12', rir: null, rest_seconds: null, notes: null, superset_group: null }
    expect(buildExerciseConfigFormFromRow(empty, ['weight', 'reps'])).toMatchObject({
      rir: '', rest_seconds: '', notes: '', superset_group: '',
    })
    expect(buildExerciseConfigFormFromRow({ ...row, rest_seconds: 0 }, ['level', 'time']).rest_seconds).toBe('0')
  })

  it('produce un formulario que pasa la validación', () => {
    const form = buildExerciseConfigFormFromRow(row, ['level', 'time'])
    expect(validateExerciseConfigForm(form, ['level', 'time']).valid).toBe(true)
  })
})

describe('buildReplaceExerciseForm', () => {
  it('reajusta el objetivo cuando cambia lo que mide el ejercicio', () => {
    const result = buildReplaceExerciseForm(fullForm, ['level', 'time'], ['weight', 'reps'])
    expect(result.reps).toBe('30s')
  })

  it('conserva el objetivo cuando el tipo no cambia', () => {
    const result = buildReplaceExerciseForm(fullForm, ['weight', 'reps'], ['weight', 'reps'])
    expect(result.reps).toBe('10-12')
  })

  it('reajusta también el campo objetivo, no solo su valor', () => {
    expect(buildReplaceExerciseForm(fullForm, ['level', 'time'], ['weight', 'reps']).target_field).toBe('time')
    expect(buildReplaceExerciseForm(fullForm, ['weight', 'reps'], ['weight', 'reps']).target_field).toBe('reps')
  })

  it('el nivel prescrito no sobrevive a un ejercicio que no mide nivel', () => {
    const withLevel = { ...fullForm, target_field: 'time', level: '8' }
    expect(buildReplaceExerciseForm(withLevel, ['weight', 'reps'], ['level', 'time']).level).toBe('')
    expect(buildReplaceExerciseForm(withLevel, ['level', 'time'], ['level', 'time']).level).toBe('8')
  })

  it('limpia esfuerzo y notas del ejercicio saliente y conserva series y superserie', () => {
    const result = buildReplaceExerciseForm(fullForm, ['level', 'time'], ['weight', 'reps'])
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
      target_field: 'reps',
      reps: '10-12',
      level: null,
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

  it('el nivel prescrito se tipa, y el 0 es un nivel válido', () => {
    expect(parseExerciseConfigForm({ ...fullForm, level: '8' }).level).toBe(8)
    expect(parseExerciseConfigForm({ ...fullForm, level: '0' }).level).toBe(0)
    expect(parseExerciseConfigForm({ ...fullForm, level: '' }).level).toBeNull()
  })

  it('conserva rir 0 y RIR al fallo (-1)', () => {
    expect(parseExerciseConfigForm({ ...fullForm, rir: '0' }).rir).toBe(0)
    expect(parseExerciseConfigForm({ ...fullForm, rir: '-1' }).rir).toBe(-1)
  })
})
