import { describe, it, expect } from 'vitest'
import {
  parseTargetRange,
  didSetHitTop,
  shouldSuggestProgression,
  getProgressionLabel,
  getProgressionReason,
  getProgressionDirection,
  getProgressionWhyLabel,
} from './progressionUtils.js'
import { getProgressableField } from './measurementFields.js'
import { SetField } from './measurementFields.js'
import { SET_TYPES } from './constants.js'

const WR = ['weight', 'reps']
// Bici estática: nivel × distancia × tiempo. El progresable es el NIVEL y el objetivo se elige.
const BIKE = ['level', 'distance', 'time']

describe('parseTargetRange', () => {
  it('parsea un rango de reps', () => {
    expect(parseTargetRange('8-12', SetField.REPS)).toEqual({ min: 8, max: 12 })
  })

  it('parsea un número único como rango degenerado', () => {
    expect(parseTargetRange('10', SetField.REPS)).toEqual({ min: 10, max: 10 })
  })

  it('normaliza rangos invertidos', () => {
    expect(parseTargetRange('12-8', SetField.REPS)).toEqual({ min: 8, max: 12 })
  })

  it('tolera espacios alrededor del guion', () => {
    expect(parseTargetRange('8 - 12', SetField.REPS)).toEqual({ min: 8, max: 12 })
  })

  it('acepta número (no string)', () => {
    expect(parseTargetRange(10, SetField.REPS)).toEqual({ min: 10, max: 10 })
  })

  it('devuelve null para rangos abiertos por arriba, AMRAP o guion sin tope', () => {
    expect(parseTargetRange('8+', SetField.REPS)).toBeNull()
    expect(parseTargetRange('AMRAP', SetField.REPS)).toBeNull()
    expect(parseTargetRange('8-', SetField.REPS)).toBeNull()
  })

  it('devuelve null para vacío/null', () => {
    expect(parseTargetRange('', SetField.REPS)).toBeNull()
    expect(parseTargetRange(null, SetField.REPS)).toBeNull()
    expect(parseTargetRange(undefined, SetField.REPS)).toBeNull()
  })

  it('el tiempo se lee en segundos, cualquiera que sea la unidad escrita', () => {
    expect(parseTargetRange('30s', SetField.TIME)).toEqual({ min: 30, max: 30 })
    expect(parseTargetRange('20min', SetField.TIME)).toEqual({ min: 1200, max: 1200 })
    expect(parseTargetRange('20 min', SetField.TIME)).toEqual({ min: 1200, max: 1200 })
    expect(parseTargetRange('1h', SetField.TIME)).toEqual({ min: 3600, max: 3600 })
  })

  it('acepta el objetivo de tiempo en mm:ss, el mismo formato del input de la serie', () => {
    expect(parseTargetRange('20:00', SetField.TIME)).toEqual({ min: 1200, max: 1200 })
    expect(parseTargetRange('1:30', SetField.TIME)).toEqual({ min: 90, max: 90 })
  })

  it('la distancia se lee en metros', () => {
    expect(parseTargetRange('40m', SetField.DISTANCE)).toEqual({ min: 40, max: 40 })
    expect(parseTargetRange('5km', SetField.DISTANCE)).toEqual({ min: 5000, max: 5000 })
    expect(parseTargetRange('2,5km', SetField.DISTANCE)).toEqual({ min: 2500, max: 2500 })
  })

  it('en un rango con una sola unidad, el extremo sin unidad la hereda', () => {
    expect(parseTargetRange('20-30min', SetField.TIME)).toEqual({ min: 1200, max: 1800 })
    expect(parseTargetRange('3-5km', SetField.DISTANCE)).toEqual({ min: 3000, max: 5000 })
  })

  // Sin unidad no se puede saber si "20" son segundos o minutos, y adivinarlo dispararía avisos
  // de progresión falsos. Los defaults que escribe la app siempre llevan unidad.
  it('null en tiempo y distancia sin unidad: el objetivo es texto libre y "20" no dice nada', () => {
    expect(parseTargetRange('20', SetField.TIME)).toBeNull()
    expect(parseTargetRange('5', SetField.DISTANCE)).toBeNull()
  })

  it('las reps y las calorías no necesitan unidad (no es ambigua)', () => {
    expect(parseTargetRange('12', SetField.REPS)).toEqual({ min: 12, max: 12 })
    expect(parseTargetRange('100kcal', SetField.CALORIES)).toEqual({ min: 100, max: 100 })
    expect(parseTargetRange('100', SetField.CALORIES)).toEqual({ min: 100, max: 100 })
  })

  it('null con unidad que no es del campo', () => {
    expect(parseTargetRange('5km', SetField.TIME)).toBeNull()
    expect(parseTargetRange('30s', SetField.DISTANCE)).toBeNull()
    expect(parseTargetRange('8-12 reps', SetField.CALORIES)).toBeNull()
  })

  it('null sin campo objetivo o sin valor', () => {
    expect(parseTargetRange('8-12', null)).toBeNull()
    expect(parseTargetRange(null, SetField.REPS)).toBeNull()
  })
})

describe('didSetHitTop', () => {
  it('true cuando las reps igualan el tope del rango', () => {
    expect(didSetHitTop({ previousSet: { weight: 10, reps: 12 }, target: '8-12', trackedFields: WR })).toBe(true)
  })

  it('true cuando las reps superan el tope', () => {
    expect(didSetHitTop({ previousSet: { weight: 10, reps: 15 }, target: '8-12', trackedFields: WR })).toBe(true)
  })

  it('false dentro del rango', () => {
    expect(didSetHitTop({ previousSet: { weight: 10, reps: 10 }, target: '8-12', trackedFields: WR })).toBe(false)
  })

  it('false por debajo del rango', () => {
    expect(didSetHitTop({ previousSet: { weight: 10, reps: 7 }, target: '10-12', trackedFields: WR })).toBe(false)
  })

  it('false en dropsets', () => {
    expect(didSetHitTop({ previousSet: { weight: 10, reps: 20, setType: SET_TYPES.DROPSET }, target: '8-12', trackedFields: WR })).toBe(false)
  })

  it('false sin el dato del objetivo o del progresable', () => {
    expect(didSetHitTop({ previousSet: { weight: null, reps: 12 }, target: '8-12', trackedFields: WR })).toBe(false)
    expect(didSetHitTop({ previousSet: { weight: 10, reps: null }, target: '8-12', trackedFields: WR })).toBe(false)
  })

  it('false sin serie previa', () => {
    expect(didSetHitTop({ previousSet: null, target: '8-12', trackedFields: WR })).toBe(false)
    expect(didSetHitTop({ previousSet: undefined, target: '8-12', trackedFields: WR })).toBe(false)
  })

  it('false sin tope numérico claro', () => {
    expect(didSetHitTop({ previousSet: { weight: 10, reps: 20 }, target: 'AMRAP', trackedFields: WR })).toBe(false)
  })

  it('false si el ejercicio no tiene progresable (nada que subir)', () => {
    expect(didSetHitTop({ previousSet: { reps: 12 }, target: '8-12', trackedFields: ['reps'] })).toBe(false)
    expect(didSetHitTop({ previousSet: { distanceMeters: 5000, timeSeconds: 1200 }, target: '20min', trackedFields: ['distance', 'time'], targetField: 'time' })).toBe(false)
  })

  it('rango degenerado (número único): true si iguala el objetivo', () => {
    expect(didSetHitTop({ previousSet: { weight: 80, reps: 10 }, target: '10', trackedFields: WR })).toBe(true)
  })

  // Lo que antes no existía: un cardio no recibía nunca el aviso porque se exigía peso + reps.
  it('bici: cumplir el tiempo prescrito dispara el aviso (el nivel es el progresable)', () => {
    const previousSet = { level: 8, timeSeconds: 1200, distanceMeters: 4800 }
    expect(didSetHitTop({ previousSet, target: '20min', trackedFields: BIKE, targetField: 'time' })).toBe(true)
    expect(didSetHitTop({ previousSet, target: '30min', trackedFields: BIKE, targetField: 'time' })).toBe(false)
  })

  it('bici: el mismo entreno con el objetivo en distancia se juzga por la distancia', () => {
    const previousSet = { level: 8, timeSeconds: 1200, distanceMeters: 4800 }
    expect(didSetHitTop({ previousSet, target: '5km', trackedFields: BIKE, targetField: 'distance' })).toBe(false)
    expect(didSetHitTop({ previousSet, target: '4km', trackedFields: BIKE, targetField: 'distance' })).toBe(true)
  })

  it('un campo objetivo que el ejercicio no mide cae al default, no bloquea', () => {
    const previousSet = { level: 8, timeSeconds: 1200, distanceMeters: 4800 }
    // 'reps' no es de la bici → resuelve al default (distancia)
    expect(didSetHitTop({ previousSet, target: '4km', trackedFields: BIKE, targetField: 'reps' })).toBe(true)
  })

  it('plancha con lastre: el objetivo es el tiempo y el progresable el peso', () => {
    expect(didSetHitTop({ previousSet: { weight: 10, timeSeconds: 60 }, target: '60s', trackedFields: ['weight', 'time'], targetField: 'time' })).toBe(true)
    expect(didSetHitTop({ previousSet: { weight: 10, timeSeconds: 45 }, target: '60s', trackedFields: ['weight', 'time'], targetField: 'time' })).toBe(false)
  })
})

describe('shouldSuggestProgression', () => {
  const hitTop = { weight: 80, reps: 12 } // llegó al tope de 8-12

  it('false cuando la serie no llegó al tope (aunque no haya peso tecleado)', () => {
    expect(shouldSuggestProgression({ previousSet: { weight: 80, reps: 10 }, target: '8-12', trackedFields: WR, currentProgressable: '' })).toBe(false)
  })

  it('true si llegó al tope y aún no hay peso tecleado (vacío → NaN)', () => {
    expect(shouldSuggestProgression({ previousSet: hitTop, target: '8-12', trackedFields: WR, currentProgressable: '' })).toBe(true)
    expect(shouldSuggestProgression({ previousSet: hitTop, target: '8-12', trackedFields: WR, currentProgressable: null })).toBe(true)
  })

  it('true si el peso tecleado iguala al anterior (aún no ha subido)', () => {
    expect(shouldSuggestProgression({ previousSet: hitTop, target: '8-12', trackedFields: WR, currentProgressable: '80' })).toBe(true)
  })

  it('true si el peso tecleado es menor que el anterior', () => {
    expect(shouldSuggestProgression({ previousSet: hitTop, target: '8-12', trackedFields: WR, currentProgressable: '75' })).toBe(true)
  })

  it('false una vez tecleas un peso mayor que el anterior (nudge cumplido)', () => {
    expect(shouldSuggestProgression({ previousSet: hitTop, target: '8-12', trackedFields: WR, currentProgressable: '82.5' })).toBe(false)
  })

  it('reconoce el peso mayor con coma decimal (parseDecimal)', () => {
    expect(shouldSuggestProgression({ previousSet: hitTop, target: '8-12', trackedFields: WR, currentProgressable: '82,5' })).toBe(false)
  })

  it('el nudge cumplido de un cardio se mide sobre el NIVEL, no sobre el peso', () => {
    const previousSet = { level: 8, timeSeconds: 1200, distanceMeters: 4800 }
    const params = { previousSet, target: '20min', trackedFields: BIKE, targetField: 'time' }
    expect(shouldSuggestProgression({ ...params, currentProgressable: '8' })).toBe(true)
    expect(shouldSuggestProgression({ ...params, currentProgressable: '9' })).toBe(false)
  })

  // Gate de esfuerzo (RIR): con RIR objetivo, llegar al tope de reps no basta si el esfuerzo fue
  // más profundo de lo prescrito. Caso del usuario: 10 reps @ RIR 0 con objetivo 8-10 @ RIR 2.
  it('false: llegó al tope de reps pero con RIR real por debajo del objetivo (no ganó la subida)', () => {
    expect(shouldSuggestProgression({ previousSet: { weight: 80, reps: 10, rir: 0 }, target: '8-10', trackedFields: WR, currentProgressable: '', effortTarget: 2 })).toBe(false)
  })

  it('true: llegó al tope de reps y el RIR real cumple el objetivo', () => {
    expect(shouldSuggestProgression({ previousSet: { weight: 80, reps: 10, rir: 2 }, target: '8-10', trackedFields: WR, currentProgressable: '', effortTarget: 2 })).toBe(true)
  })

  it('true: llegó al tope con más reserva de la pedida (RIR real > objetivo)', () => {
    expect(shouldSuggestProgression({ previousSet: { weight: 80, reps: 10, rir: 3 }, target: '8-10', trackedFields: WR, currentProgressable: '', effortTarget: 2 })).toBe(true)
  })

  it('true: rutina sin RIR objetivo → cae a solo-objetivo aunque el RIR real fuera 0', () => {
    expect(shouldSuggestProgression({ previousSet: { weight: 80, reps: 10, rir: 0 }, target: '8-10', trackedFields: WR, currentProgressable: '', effortTarget: null })).toBe(true)
  })

  it('true: RIR real no registrado → cae a solo-objetivo aunque haya objetivo', () => {
    expect(shouldSuggestProgression({ previousSet: { weight: 80, reps: 10, rir: null }, target: '8-10', trackedFields: WR, currentProgressable: '', effortTarget: 2 })).toBe(true)
  })

  // En la escala RPE (sin reps) el número es esfuerzo percibido: 5 es MÁS duro que 2, así que el
  // gate se invierte respecto al RIR. Ver metEffortTarget (effortScale.js).
  it('cardio: el gate de esfuerzo se lee en RPE (más alto = más duro)', () => {
    const previousSet = { level: 8, timeSeconds: 1200, distanceMeters: 4800 }
    const params = { previousSet: { ...previousSet, rir: 4 }, target: '20min', trackedFields: BIKE, targetField: 'time', currentProgressable: '' }
    expect(shouldSuggestProgression({ ...params, effortTarget: 3 })).toBe(false)
    expect(shouldSuggestProgression({ ...params, effortTarget: 4 })).toBe(true)
    expect(shouldSuggestProgression({ ...params, effortTarget: 5 })).toBe(true)
  })

  it('false si el ejercicio no tiene nada que subir', () => {
    expect(shouldSuggestProgression({ previousSet: { reps: 12 }, target: '8-12', trackedFields: ['reps'], currentProgressable: '' })).toBe(false)
  })

  // Capacity rule (issue #213): with a reps target on the RIR scale, reps done beyond the top
  // count as reserve, achieved + actualRir >= top + targetRir.
  describe('effort gate counts reps beyond the top as reserve', () => {
    const suggest = ({ reps, rir }, effortTarget, target = '10-15') => shouldSuggestProgression({
      previousSet: { weight: 40, reps, rir }, target, trackedFields: WR, currentProgressable: '', effortTarget,
    })

    it('17 @ RIR 0 against 10-15 @ RIR 1 earns the increase (capacity 17 >= 16)', () => {
      expect(suggest({ reps: 17, rir: 0 }, 1)).toBe(true)
    })

    it('16 @ RIR 0 against RIR 1 earns it (capacity 16 = 16)', () => {
      expect(suggest({ reps: 16, rir: 0 }, 1)).toBe(true)
    })

    it('15 @ RIR 0 against RIR 1 does not: at the top there is no extra, and RIR 0 is not read as missing', () => {
      expect(suggest({ reps: 15, rir: 0 }, 1)).toBe(false)
    })

    it('16 @ RIR 0 against RIR 2 does not (capacity 16 < 17)', () => {
      expect(suggest({ reps: 16, rir: 0 }, 2)).toBe(false)
    })

    it('15 @ RIR 2 against RIR 1 still earns it', () => {
      expect(suggest({ reps: 15, rir: 2 }, 1)).toBe(true)
    })

    it('a missing actual or target effort is still no gate', () => {
      expect(suggest({ reps: 16, rir: null }, 2)).toBe(true)
      expect(suggest({ reps: 16, rir: 0 }, null)).toBe(true)
    })

    it('«F» counts as its stored -1: 16 @ F earns RIR 0, 15 @ F does not', () => {
      expect(suggest({ reps: 16, rir: -1 }, 0)).toBe(true)
      expect(suggest({ reps: 15, rir: -1 }, 0)).toBe(false)
    })

    it('a single-value target counts from that value: 14 @ RIR 0 against 12 @ RIR 1', () => {
      expect(suggest({ reps: 14, rir: 0 }, 1, '12')).toBe(true)
    })

    it('the top of the scale works the same: against RIR 3 it takes 3 extra reps at RIR 0', () => {
      expect(suggest({ reps: 18, rir: 0 }, 3)).toBe(true)
      expect(suggest({ reps: 17, rir: 0 }, 3)).toBe(false)
    })

    it('an assisted exercise gets the rule too: the direction of the progressable does not change the effort gate', () => {
      const params = { target: '8-12', trackedFields: ['assistance', 'reps'], currentProgressable: '', effortTarget: 2 }
      expect(shouldSuggestProgression({ ...params, previousSet: { weight: 30, reps: 14, rir: 0 } })).toBe(true)
      expect(shouldSuggestProgression({ ...params, previousSet: { weight: 30, reps: 13, rir: 0 } })).toBe(false)
    })

    it('a row with targetField null on weight + reps resolves to reps and gets the rule', () => {
      expect(shouldSuggestProgression({
        previousSet: { weight: 40, reps: 17, rir: 0 }, target: '10-15', trackedFields: WR, targetField: null,
        currentProgressable: '', effortTarget: 1,
      })).toBe(true)
    })

    it('a target that is not reps adds nothing beyond its top, even on the RIR scale', () => {
      // Weighted plank with reps: the target is the time, 10 s over the top count for nothing.
      const params = {
        target: '60s', trackedFields: ['weight', 'reps', 'time'], targetField: 'time', currentProgressable: '', effortTarget: 1,
      }
      expect(shouldSuggestProgression({ ...params, previousSet: { weight: 20, reps: 20, timeSeconds: 70, rir: 0 } })).toBe(false)
      expect(shouldSuggestProgression({ ...params, previousSet: { weight: 20, reps: 20, timeSeconds: 70, rir: 1 } })).toBe(true)
    })

    it('on the RPE scale extra minutes do not count: only the effort is compared', () => {
      // 16 min against 10-15 min. RPE is stored 1-5 (higher is harder).
      const params = {
        target: '10-15min', trackedFields: ['level', 'time'], targetField: 'time', currentProgressable: '', effortTarget: 3,
      }
      expect(shouldSuggestProgression({ ...params, previousSet: { level: 8, timeSeconds: 960, rir: 4 } })).toBe(false)
      expect(shouldSuggestProgression({ ...params, previousSet: { level: 8, timeSeconds: 960, rir: 3 } })).toBe(true)
    })
  })
})

describe('textos del aviso', () => {
  it('el aviso dice qué se sube, y en un cardio es el nivel', () => {
    expect(getProgressionLabel(WR)).toBe('Sube el peso')
    expect(getProgressionLabel(BIKE)).toBe('Sube el nivel')
    expect(getProgressionLabel(['reps'])).toBe('')
  })

  it('la explicación lleva el objetivo prescrito y lo conseguido con su unidad', () => {
    expect(getProgressionReason({ previousSet: { weight: 80, reps: 12 }, target: '8-12', trackedFields: WR }))
      .toBe('Llegaste al tope del objetivo (8-12) con 12 reps. Si quieres seguir progresando, sube el peso.')
    expect(getProgressionReason({ previousSet: { level: 8, timeSeconds: 1200 }, target: '20min', trackedFields: BIKE, targetField: 'time' }))
      .toBe('Llegaste al tope del objetivo (20min) con 20:00 min. Si quieres seguir progresando, sube el nivel.')
  })

  it('sin progresable no hay explicación', () => {
    expect(getProgressionReason({ previousSet: { reps: 12 }, target: '8-12', trackedFields: ['reps'] })).toBe('')
  })
})

// ============================================
// DIRECTION: ASSISTANCE GOES DOWN (issue #202)
// ============================================

describe('assistance progression', () => {
  const ASSISTED = ['assistance', 'reps']
  // Hit the top of 8-12 with 30 kg of help: the nudge is to lower it.
  const hitTop = { weight: 30, reps: 12 }
  const params = (currentProgressable, previousSet = hitTop) =>
    ({ previousSet, target: '8-12', trackedFields: ASSISTED, currentProgressable })

  it('getProgressionDirection: lower for assistance, higher for everything else', () => {
    expect(getProgressionDirection(SetField.ASSISTANCE)).toBe('lower')
    expect(getProgressionDirection(SetField.WEIGHT)).toBe('higher')
    expect(getProgressionDirection(SetField.LEVEL)).toBe('higher')
    expect(getProgressionDirection(SetField.PACE)).toBe('higher')
    expect(getProgressionDirection(null)).toBe('higher')
  })

  it('getProgressableField: weight, then assistance, then level', () => {
    expect(getProgressableField(['weight', 'reps'])).toBe(SetField.WEIGHT)
    expect(getProgressableField(ASSISTED)).toBe(SetField.ASSISTANCE)
    expect(getProgressableField(['level', 'time'])).toBe(SetField.LEVEL)
  })

  it('suggests while nothing lower is typed', () => {
    expect(shouldSuggestProgression(params(''))).toBe(true)
    expect(shouldSuggestProgression(params('30'))).toBe(true)
  })

  it('a lower assistance marks the nudge done, a higher one does not', () => {
    expect(shouldSuggestProgression(params('25'))).toBe(false)
    expect(shouldSuggestProgression(params('0'))).toBe(false)
    expect(shouldSuggestProgression(params('35'))).toBe(true)
  })

  it('with the previous assistance already at 0 there is nothing to lower: no suggestion', () => {
    expect(shouldSuggestProgression(params('', { weight: 0, reps: 12 }))).toBe(false)
  })

  it('does not fire without hitting the top', () => {
    expect(shouldSuggestProgression(params('', { weight: 30, reps: 10 }))).toBe(false)
  })

  it('the label and the reason say lower the assistance', () => {
    expect(getProgressionLabel(ASSISTED)).toBe('Baja la asistencia')
    expect(getProgressionReason({ previousSet: hitTop, target: '8-12', trackedFields: ASSISTED }))
      .toBe('Llegaste al tope del objetivo (8-12) con 12 reps. Si quieres seguir progresando, baja la asistencia.')
    expect(getProgressionWhyLabel(ASSISTED)).toBe('Por qué bajar')
    expect(getProgressionWhyLabel(WR)).toBe('Por qué subir')
  })
})
