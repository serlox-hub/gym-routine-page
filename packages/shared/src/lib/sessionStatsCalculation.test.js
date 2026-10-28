import { describe, it, expect } from 'vitest'
import {
  formatPRNotificationText,
  getTrackableMetrics,
  getPRMetrics,
  calculateSessionExerciseStats,
  detectNewPersonalRecords,
  evaluateSetForPR,
  computeExercisePRSets,
  computeExercisePRSetNumbers,
  mergeExerciseStats,
  bestAtRepsOrAbove,
  findBeatenRepRecord,
  findPreviousRepRecord,
  findPRSetNumbers,
  isRepPRLowerBetter,
  WEIGHT_PR_TYPES,
} from './sessionStatsCalculation.js'

// What fetchExerciseBests returns for a history of one session at 0 kg × 18.
const ZERO_KG_ONLY_BESTS = {
  bestWeight: null,
  bestReps: 18,
  best1rm: null,
  totalVolume: null,
  bestTimeSeconds: null,
  bestDistanceMeters: null,
  bestPaceSeconds: null,
  bestPerReps: null,
  sessionCount: 1,
}

describe('sessionStatsCalculation', () => {

  // ============================================
  // getTrackableMetrics
  // ============================================

  describe('getTrackableMetrics', () => {
    it('retorna weight, reps, 1rm, volume, repPR para weight_reps', () => {
      expect(getTrackableMetrics(['weight', 'reps'])).toEqual(['weight', 'reps', '1rm', 'volume', 'repPR'])
    })

    it('retorna solo reps para reps_only', () => {
      expect(getTrackableMetrics(['reps'])).toEqual(['reps'])
    })

    it('retorna time para time', () => {
      expect(getTrackableMetrics(['time'])).toEqual(['time'])
    })

    it('retorna weight y time para weight_time', () => {
      expect(getTrackableMetrics(['weight', 'time'])).toEqual(['weight', 'time'])
    })

    it('retorna distance para distance', () => {
      expect(getTrackableMetrics(['distance'])).toEqual(['distance'])
    })

    it('retorna weight y distance para weight_distance', () => {
      expect(getTrackableMetrics(['weight', 'distance'])).toEqual(['weight', 'distance'])
    })

    it('retorna vacío para calories (no hay columna en BD)', () => {
      expect(getTrackableMetrics(['calories'])).toEqual([])
    })

    it('retorna time para level_time', () => {
      expect(getTrackableMetrics(['level', 'time'])).toEqual(['time'])
    })

    it('retorna distance para level_distance', () => {
      expect(getTrackableMetrics(['level', 'distance'])).toEqual(['distance'])
    })

    it('retorna vacío para level_calories', () => {
      expect(getTrackableMetrics(['level', 'calories'])).toEqual([])
    })

    it('retorna distance y time para distance_time', () => {
      expect(getTrackableMetrics(['distance', 'time'])).toEqual(['distance', 'time'])
    })

    it('retorna distance y pace para distance_pace', () => {
      expect(getTrackableMetrics(['distance', 'pace'])).toEqual(['distance', 'pace'])
    })

    // Campos ilegibles caen al default de lectura (peso × reps), como el resto de la app: es
    // preferible calcular las métricas del caso más común que dejar el ejercicio sin ninguna.
    it('unos campos ilegibles caen al default de lectura', () => {
      expect(getTrackableMetrics(['lo_que_sea'])).toEqual(getTrackableMetrics(['weight', 'reps']))
      expect(getTrackableMetrics(null)).toEqual(getTrackableMetrics(['weight', 'reps']))
    })
  })

  // ============================================
  // getPRMetrics
  // ============================================

  describe('getPRMetrics', () => {
    it('weight_reps: 1RM, peso (heaviest ever) y rep-PR-por-rep-count', () => {
      expect(getPRMetrics(['weight', 'reps'])).toEqual(['1rm', 'weight', 'repPR'])
    })

    it('reps_only solo reps', () => {
      expect(getPRMetrics(['reps'])).toEqual(['reps'])
    })

    it('time solo tiempo', () => {
      expect(getPRMetrics(['time'])).toEqual(['time'])
    })

    it('distance solo distancia', () => {
      expect(getPRMetrics(['distance'])).toEqual(['distance'])
    })

    it('distance_pace solo ritmo', () => {
      expect(getPRMetrics(['distance', 'pace'])).toEqual(['pace'])
    })

    it('tipos compuestos sin fórmula unificada no disparan PRs', () => {
      expect(getPRMetrics(['weight', 'time'])).toEqual([])
      expect(getPRMetrics(['weight', 'distance'])).toEqual([])
      expect(getPRMetrics(['distance', 'time'])).toEqual([])
      expect(getPRMetrics(['level', 'time'])).toEqual([])
      expect(getPRMetrics(['level', 'distance'])).toEqual([])
    })

    it('weight solo peso, y pace solo ritmo', () => {
      expect(getPRMetrics(['weight'])).toEqual(['weight'])
      expect(getPRMetrics(['pace'])).toEqual(['pace'])
    })

    it('el ritmo gana a cualquier otro campo que lo acompañe', () => {
      expect(getPRMetrics(['time', 'pace'])).toEqual(['pace'])
      expect(getPRMetrics(['level', 'distance', 'pace'])).toEqual(['pace'])
    })

    it('nivel y calorías no tienen columna en stats: ni solos disparan PR', () => {
      expect(getPRMetrics(['level'])).toEqual([])
      expect(getPRMetrics(['calories'])).toEqual([])
    })

    it('peso × reps con un tercer campo ya no es peso × reps: sin PRs', () => {
      expect(getPRMetrics(['weight', 'reps', 'time'])).toEqual([])
      expect(getPRMetrics(['weight', 'reps', 'level'])).toEqual([])
    })

    it('ignora el orden y los duplicados de la lista guardada', () => {
      expect(getPRMetrics(['reps', 'weight'])).toEqual(['1rm', 'weight', 'repPR'])
      expect(getPRMetrics(['time', 'time'])).toEqual(['time'])
    })

    it('sin campos usables cae a peso × reps, como el resto de lecturas', () => {
      expect(getPRMetrics(null)).toEqual(['1rm', 'weight', 'repPR'])
      expect(getPRMetrics([])).toEqual(['1rm', 'weight', 'repPR'])
      expect(getPRMetrics([null])).toEqual(['1rm', 'weight', 'repPR'])
    })

    it('descarta un valor inválido y juzga el resto', () => {
      expect(getPRMetrics(['weight', null])).toEqual(['weight'])
    })
  })

  // ============================================
  // calculateSessionExerciseStats
  // ============================================

  describe('calculateSessionExerciseStats', () => {
    it('retorna null para sets vacíos', () => {
      expect(calculateSessionExerciseStats([], ['weight', 'reps'])).toBeNull()
    })

    it('retorna null si sets es null', () => {
      expect(calculateSessionExerciseStats(null, ['weight', 'reps'])).toBeNull()
    })

    describe('weight_reps', () => {
      const sets = [
        { weight: 100, reps_completed: 8 },
        { weight: 100, reps_completed: 6 },
        { weight: 90, reps_completed: 10 },
      ]

      it('calcula bestWeight', () => {
        const stats = calculateSessionExerciseStats(sets, ['weight', 'reps'])
        expect(stats.bestWeight).toBe(100)
      })

      it('calcula bestReps', () => {
        const stats = calculateSessionExerciseStats(sets, ['weight', 'reps'])
        expect(stats.bestReps).toBe(10)
      })

      it('calcula best1rm (Epley)', () => {
        // 100x8=127, 100x6=120, 90x10=120 → max=127
        const stats = calculateSessionExerciseStats(sets, ['weight', 'reps'])
        expect(stats.best1rm).toBe(127)
      })

      it('calcula totalVolume', () => {
        // 800 + 600 + 900 = 2300
        const stats = calculateSessionExerciseStats(sets, ['weight', 'reps'])
        expect(stats.totalVolume).toBe(2300)
      })

      it('calcula totalSets', () => {
        const stats = calculateSessionExerciseStats(sets, ['weight', 'reps'])
        expect(stats.totalSets).toBe(3)
      })

      it('no incluye métricas de tiempo/distancia', () => {
        const stats = calculateSessionExerciseStats(sets, ['weight', 'reps'])
        expect(stats.bestTimeSeconds).toBeUndefined()
        expect(stats.bestDistanceMeters).toBeUndefined()
        expect(stats.bestPaceSeconds).toBeUndefined()
      })

      it('calcula bestPerReps con el peso máximo por cada rep count exacto', () => {
        // Sets: 100×8, 100×6, 90×10 → {"8": 100, "6": 100, "10": 90}
        const stats = calculateSessionExerciseStats(sets, ['weight', 'reps'])
        expect(stats.bestPerReps).toEqual({ '8': 100, '6': 100, '10': 90 })
      })

      it('bestPerReps toma el máximo cuando hay varios sets al mismo rep count', () => {
        const sets = [
          { weight: 90, reps_completed: 5 },
          { weight: 100, reps_completed: 5 },
          { weight: 95, reps_completed: 5 },
        ]
        const stats = calculateSessionExerciseStats(sets, ['weight', 'reps'])
        expect(stats.bestPerReps).toEqual({ '5': 100 })
      })

      it('bestPerReps es null si todos los sets son inválidos (peso o reps a 0)', () => {
        const sets = [
          { weight: 0, reps_completed: 5 },
          { weight: 100, reps_completed: 0 },
        ]
        const stats = calculateSessionExerciseStats(sets, ['weight', 'reps'])
        expect(stats.bestPerReps).toBeNull()
      })
    })

    describe('reps_only', () => {
      it('calcula solo bestReps', () => {
        const sets = [
          { reps_completed: 15 },
          { reps_completed: 12 },
          { reps_completed: 10 },
        ]
        const stats = calculateSessionExerciseStats(sets, ['reps'])
        expect(stats.bestReps).toBe(15)
        expect(stats.bestWeight).toBeUndefined()
        expect(stats.best1rm).toBeUndefined()
        expect(stats.totalVolume).toBeUndefined()
      })
    })

    describe('time', () => {
      it('calcula bestTimeSeconds', () => {
        const sets = [
          { time_seconds: 60 },
          { time_seconds: 90 },
          { time_seconds: 45 },
        ]
        const stats = calculateSessionExerciseStats(sets, ['time'])
        expect(stats.bestTimeSeconds).toBe(90)
        expect(stats.totalSets).toBe(3)
      })
    })

    describe('weight_time', () => {
      it('calcula bestWeight y bestTimeSeconds', () => {
        const sets = [
          { weight: 20, time_seconds: 60 },
          { weight: 25, time_seconds: 45 },
        ]
        const stats = calculateSessionExerciseStats(sets, ['weight', 'time'])
        expect(stats.bestWeight).toBe(25)
        expect(stats.bestTimeSeconds).toBe(60)
      })
    })

    describe('distance', () => {
      it('calcula bestDistanceMeters', () => {
        const sets = [
          { distance_meters: 5000 },
          { distance_meters: 3000 },
        ]
        const stats = calculateSessionExerciseStats(sets, ['distance'])
        expect(stats.bestDistanceMeters).toBe(5000)
      })
    })

    describe('weight_distance', () => {
      it('calcula bestWeight y bestDistanceMeters', () => {
        const sets = [
          { weight: 40, distance_meters: 50 },
          { weight: 50, distance_meters: 30 },
        ]
        const stats = calculateSessionExerciseStats(sets, ['weight', 'distance'])
        expect(stats.bestWeight).toBe(50)
        expect(stats.bestDistanceMeters).toBe(50)
      })
    })

    describe('distance_time', () => {
      it('calcula bestDistanceMeters y bestTimeSeconds', () => {
        const sets = [
          { distance_meters: 5000, time_seconds: 1200 },
          { distance_meters: 3000, time_seconds: 1800 },
        ]
        const stats = calculateSessionExerciseStats(sets, ['distance', 'time'])
        expect(stats.bestDistanceMeters).toBe(5000)
        expect(stats.bestTimeSeconds).toBe(1800)
      })
    })

    describe('distance_pace', () => {
      it('calcula bestDistanceMeters y bestPaceSeconds (menor=mejor)', () => {
        const sets = [
          { distance_meters: 5000, pace_seconds: 300 },
          { distance_meters: 10000, pace_seconds: 330 },
        ]
        const stats = calculateSessionExerciseStats(sets, ['distance', 'pace'])
        expect(stats.bestDistanceMeters).toBe(10000)
        expect(stats.bestPaceSeconds).toBe(300) // menor = mejor
      })
    })

    describe('calories y level_calories', () => {
      it('retorna solo totalSets para calories', () => {
        const sets = [{ calories_burned: 150 }]
        const stats = calculateSessionExerciseStats(sets, ['calories'])
        expect(stats.totalSets).toBe(1)
        expect(stats.bestWeight).toBeUndefined()
      })

      it('retorna solo totalSets para level_calories', () => {
        const sets = [{ level: 10, calories_burned: 200 }]
        const stats = calculateSessionExerciseStats(sets, ['level', 'calories'])
        expect(stats.totalSets).toBe(1)
      })
    })

    describe('edge cases', () => {
      it('pone null si todos los pesos son 0', () => {
        const sets = [{ weight: 0, reps_completed: 10 }]
        const stats = calculateSessionExerciseStats(sets, ['weight', 'reps'])
        expect(stats.bestWeight).toBeNull()
      })

      it('pone null si no hay reps', () => {
        const sets = [{ weight: 100 }]
        const stats = calculateSessionExerciseStats(sets, ['weight', 'reps'])
        expect(stats.bestReps).toBeNull()
        expect(stats.best1rm).toBeNull()
      })

      it('pone null si todos los tiempos son 0', () => {
        const sets = [{ time_seconds: 0 }]
        const stats = calculateSessionExerciseStats(sets, ['time'])
        expect(stats.bestTimeSeconds).toBeNull()
      })

      it('pone null para pace si no hay datos', () => {
        const sets = [{ distance_meters: 5000 }]
        const stats = calculateSessionExerciseStats(sets, ['distance', 'pace'])
        expect(stats.bestPaceSeconds).toBeNull()
      })
    })
  })

  // ============================================
  // detectNewPersonalRecords
  // ============================================

  describe('detectNewPersonalRecords', () => {
    it('retorna todo false si previousBests es null (primera sesión)', () => {
      const stats = { bestWeight: 100, bestReps: 10, best1rm: 133 }
      const { flags, details } = detectNewPersonalRecords(stats, null)
      expect(flags.isPrWeight).toBe(false)
      expect(flags.isPrReps).toBe(false)
      expect(flags.isPr1rm).toBe(false)
      expect(details).toHaveLength(0)
    })

    it('retorna todo false si currentStats es null', () => {
      const { flags, details } = detectNewPersonalRecords(null, { bestWeight: 100 })
      expect(flags.isPrWeight).toBe(false)
      expect(details).toHaveLength(0)
    })

    it('detecta PR de peso', () => {
      const current = { bestWeight: 110 }
      const previous = { bestWeight: 100 }
      const { flags, details } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrWeight).toBe(true)
      expect(details).toHaveLength(1)
      expect(details[0]).toMatchObject({
        type: 'bestWeight',
        newValue: 110,
        oldValue: 100,
        improvement: 10,
      })
    })

    it('detecta PR de reps', () => {
      const current = { bestReps: 15 }
      const previous = { bestReps: 12 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrReps).toBe(true)
    })

    it('detecta PR de 1RM', () => {
      const current = { best1rm: 140 }
      const previous = { best1rm: 130 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPr1rm).toBe(true)
    })

    it('detecta PR de volumen', () => {
      const current = { totalVolume: 5000 }
      const previous = { totalVolume: 4500 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrVolume).toBe(true)
    })

    it('detecta PR de tiempo', () => {
      const current = { bestTimeSeconds: 120 }
      const previous = { bestTimeSeconds: 90 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrTime).toBe(true)
    })

    it('detecta PR de distancia', () => {
      const current = { bestDistanceMeters: 6000 }
      const previous = { bestDistanceMeters: 5000 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrDistance).toBe(true)
    })

    it('detecta PR de pace (menor = mejor)', () => {
      const current = { bestPaceSeconds: 280 }
      const previous = { bestPaceSeconds: 300 }
      const { flags, details } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrPace).toBe(true)
      expect(details[0].improvement).toBe(7) // (300-280)/300 = 6.67 → 7%
    })

    it('no marca PR de pace si es mayor (peor)', () => {
      const current = { bestPaceSeconds: 320 }
      const previous = { bestPaceSeconds: 300 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrPace).toBe(false)
    })

    it('no marca PR si el valor es igual', () => {
      const current = { bestWeight: 100 }
      const previous = { bestWeight: 100 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrWeight).toBe(false)
    })

    it('no marca PR si el valor es menor', () => {
      const current = { bestWeight: 90 }
      const previous = { bestWeight: 100 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrWeight).toBe(false)
    })

    it('detecta múltiples PRs simultáneamente', () => {
      const current = { bestWeight: 110, bestReps: 15, best1rm: 145, totalVolume: 5000 }
      const previous = { bestWeight: 100, bestReps: 12, best1rm: 130, totalVolume: 4500 }
      const { flags, details } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrWeight).toBe(true)
      expect(flags.isPrReps).toBe(true)
      expect(flags.isPr1rm).toBe(true)
      expect(flags.isPrVolume).toBe(true)
      expect(details).toHaveLength(4)
    })

    it('weight PR when the history has no weight (a missing previous weight counts as 0)', () => {
      const current = { bestWeight: 100 }
      const previous = { bestReps: 10 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrWeight).toBe(true)
    })

    it('no PR of a field that is not weight-based when previous does not have it', () => {
      const current = { bestReps: 10 }
      const previous = { bestWeight: 100 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrReps).toBe(false)
    })

    it('no time or distance PR when previous does not have them (only weight and 1RM treat it as 0)', () => {
      const current = { bestTimeSeconds: 600, bestDistanceMeters: 5000 }
      const previous = { bestWeight: 100 }
      const { flags, details } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrTime).toBe(false)
      expect(flags.isPrDistance).toBe(false)
      expect(details).toHaveLength(0)
    })

    it('no marca PR si current no tiene el campo', () => {
      const current = { bestReps: 10 }
      const previous = { bestWeight: 100 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrWeight).toBe(false)
    })

    it('weight_reps: 100×5 vs 90×10 → marca peso (heaviest ever) y NO 1RM', () => {
      // 90×10 → 1RM=120, 100×5 → 1RM=117. Strong/Hevy: weight es PR aunque 1RM no.
      const current = { bestWeight: 100, bestReps: 5, best1rm: 117, totalVolume: 500 }
      const previous = { bestWeight: 90, bestReps: 10, best1rm: 120, totalVolume: 900 }
      const { flags } = detectNewPersonalRecords(current, previous, ['weight', 'reps'])
      expect(flags.isPrWeight).toBe(true) // 100>90, modelo Strong/Hevy
      expect(flags.isPr1rm).toBe(false) // 117 < 120
    })

    it('weight_reps: marca peso y 1RM cuando ambos suben', () => {
      // 100×8 → 1RM=127 vs 90×10 → 1RM=120
      const current = { bestWeight: 100, bestReps: 8, best1rm: 127, totalVolume: 800 }
      const previous = { bestWeight: 90, bestReps: 10, best1rm: 120, totalVolume: 900 }
      const { flags } = detectNewPersonalRecords(current, previous, ['weight', 'reps'])
      expect(flags.isPrWeight).toBe(true)
      expect(flags.isPr1rm).toBe(true)
    })

    it('weight_time: no dispara PRs (sin fórmula unificada)', () => {
      const current = { bestWeight: 30, bestTimeSeconds: 60 }
      const previous = { bestWeight: 25, bestTimeSeconds: 90 }
      const { flags, details } = detectNewPersonalRecords(current, previous, ['weight', 'time'])
      expect(flags.isPrWeight).toBe(false)
      expect(flags.isPrTime).toBe(false)
      expect(details).toHaveLength(0)
    })

    it('sin measurementType (backward compat): marca peso como PR', () => {
      const current = { bestWeight: 110 }
      const previous = { bestWeight: 100 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrWeight).toBe(true)
    })

    // Issue #189: 0 kg is stored as "no value", so the history looks empty but it exists.
    describe('after a history of only 0 kg sets', () => {
      const weightedStats = () => calculateSessionExerciseStats([{ weight: 5, reps_completed: 12 }], ['weight', 'reps'])

      it('5 × 12 is a weight, 1RM and rep PR, with no previous value', () => {
        const { flags, details } = detectNewPersonalRecords(weightedStats(), ZERO_KG_ONLY_BESTS, ['weight', 'reps'])

        expect(flags).toMatchObject({ isPrWeight: true, isPr1rm: true, prRepCounts: [12], isPrVolume: false, isPrReps: false })
        expect(details.find(d => d.type === 'bestWeight')).toMatchObject({ newValue: 5, oldValue: null, improvement: null })
        expect(details.find(d => d.type === 'best1rm')).toMatchObject({ oldValue: null, improvement: null })
        expect(details.find(d => d.type === 'repPR')).toMatchObject({ repCount: 12, newValue: 5, oldValue: null, oldRepCount: null, improvement: null })
        for (const detail of details) {
          for (const value of Object.values(detail)) {
            if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true)
          }
        }
      })

      it('the same session without any history is no PR', () => {
        const { flags, details } = detectNewPersonalRecords(weightedStats(), null, ['weight', 'reps'])
        expect(flags).toEqual(expect.objectContaining({ isPrWeight: false, isPr1rm: false, prRepCounts: null }))
        expect(details).toHaveLength(0)
      })

      it('another 0 kg session is no PR', () => {
        const zeroKgStats = calculateSessionExerciseStats([{ weight: 0, reps_completed: 20 }], ['weight', 'reps'])
        const { flags, details } = detectNewPersonalRecords(zeroKgStats, ZERO_KG_ONLY_BESTS, ['weight', 'reps'])
        expect(Object.values(flags).filter(Boolean)).toEqual([])
        expect(details).toHaveLength(0)
      })
    })
  })

  // ============================================
  // evaluateSetForPR (real-time)
  // ============================================

  describe('evaluateSetForPR', () => {
    it('retorna vacío si setData es null', () => {
      const { newRecords } = evaluateSetForPR(null, {}, { bestWeight: 100 }, ['weight', 'reps'])
      expect(newRecords).toHaveLength(0)
    })

    it('retorna vacío si preSessionBests es null', () => {
      const { newRecords } = evaluateSetForPR({ weight: 110 }, {}, null, ['weight', 'reps'])
      expect(newRecords).toHaveLength(0)
    })

    it('weight_reps: detecta PR de peso (heaviest ever, modelo Strong/Hevy)', () => {
      const set = { weight: 110, reps_completed: 8 }
      const runningBests = {}
      const preBests = { bestWeight: 100, bestReps: 10, best1rm: 130 }

      const { newRecords } = evaluateSetForPR(set, runningBests, preBests, ['weight', 'reps'])

      const weightPR = newRecords.find(r => r.type === 'bestWeight')
      expect(weightPR).toBeDefined()
      expect(weightPR.value).toBe(110)
      expect(weightPR.previousValue).toBe(100)
    })

    it('weight_time: no detecta PR (sin fórmula unificada)', () => {
      const set = { weight: 30, time_seconds: 60 }
      const preBests = { bestWeight: 25, bestTimeSeconds: 90 }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['weight', 'time'])
      expect(newRecords).toHaveLength(0)
    })

    it('detecta PR de 1RM', () => {
      const set = { weight: 100, reps_completed: 10 } // 1RM = 133
      const runningBests = {}
      const preBests = { bestWeight: 100, best1rm: 120 }

      const { newRecords } = evaluateSetForPR(set, runningBests, preBests, ['weight', 'reps'])

      const e1rmPR = newRecords.find(r => r.type === 'best1rm')
      expect(e1rmPR).toBeDefined()
      expect(e1rmPR.value).toBe(133)
    })

    it('no detecta PR si no supera pre-session ni running best', () => {
      const set = { weight: 80, reps_completed: 6 } // 1RM=96
      const runningBests = { bestWeight: 100, best1rm: 130 }
      const preBests = { bestWeight: 100, best1rm: 130 }

      const { newRecords } = evaluateSetForPR(set, runningBests, preBests, ['weight', 'reps'])
      expect(newRecords).toHaveLength(0)
    })

    it('after a history of only 0 kg sets, 100 × 8 is a weight, 1RM and rep PR at 8', () => {
      const set = { weight: 100, reps_completed: 8 }

      const { newRecords } = evaluateSetForPR(set, {}, ZERO_KG_ONLY_BESTS, ['weight', 'reps'])

      expect(newRecords.map(r => r.type).sort()).toEqual(['best1rm', 'bestWeight', 'repPR'])
      expect(newRecords.find(r => r.type === 'bestWeight')).toMatchObject({ value: 100, previousValue: null })
      expect(newRecords.find(r => r.type === 'repPR')).toMatchObject({ repCount: 8, previousValue: null, previousRepCount: null })
    })

    it('a missing previous reps, time or distance best is no PR (only weight and 1RM treat it as 0)', () => {
      const historyWithoutValues = { ...ZERO_KG_ONLY_BESTS, bestReps: null }

      const reps = evaluateSetForPR({ reps_completed: 15 }, {}, historyWithoutValues, ['reps'])
      const time = evaluateSetForPR({ time_seconds: 90 }, {}, historyWithoutValues, ['time'])
      const distance = evaluateSetForPR({ distance_meters: 5000 }, {}, historyWithoutValues, ['distance'])

      expect(reps.newRecords).toHaveLength(0)
      expect(time.newRecords).toHaveLength(0)
      expect(distance.newRecords).toHaveLength(0)
    })

    it('without any history (preSessionBests null), 100 × 8 is no PR', () => {
      const { newRecords } = evaluateSetForPR({ weight: 100, reps_completed: 8 }, {}, null, ['weight', 'reps'])
      expect(newRecords).toHaveLength(0)
    })

    it('detecta PR intra-sesión: set 3 supera set 1 que ya fue PR (1RM)', () => {
      const preBests = { best1rm: 120 }

      // Set 1: 100×8 → 1RM=127 — PR contra preSession (120)
      const set1 = { weight: 100, reps_completed: 8 }
      const result1 = evaluateSetForPR(set1, {}, preBests, ['weight', 'reps'])
      expect(result1.newRecords.find(r => r.type === 'best1rm')).toBeDefined()

      // Set 3: 110×6 → 1RM=132 — PR contra running best (127)
      const set3 = { weight: 110, reps_completed: 6 }
      const result3 = evaluateSetForPR(set3, result1.updatedRunningBests, preBests, ['weight', 'reps'])
      expect(result3.newRecords.find(r => r.type === 'best1rm')).toBeDefined()
      expect(result3.newRecords.find(r => r.type === 'best1rm').value).toBe(132)
    })

    it('no detecta PR si set no supera running best intra-sesión', () => {
      const preBests = { best1rm: 120 }

      // Set 1: 100×8 → 1RM=127 — PR
      const set1 = { weight: 100, reps_completed: 8 }
      const result1 = evaluateSetForPR(set1, {}, preBests, ['weight', 'reps'])

      // Set 2: 95×8 → 1RM=120 — no supera running best (127)
      const set2 = { weight: 95, reps_completed: 8 }
      const result2 = evaluateSetForPR(set2, result1.updatedRunningBests, preBests, ['weight', 'reps'])
      expect(result2.newRecords.find(r => r.type === 'best1rm')).toBeUndefined()
    })

    it('detecta PR de pace (menor = mejor)', () => {
      const set = { distance_meters: 5000, pace_seconds: 280 }
      const preBests = { bestDistanceMeters: 5000, bestPaceSeconds: 300 }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['distance', 'pace'])
      expect(newRecords.find(r => r.type === 'bestPaceSeconds')).toBeDefined()
    })

    it('no detecta PR de pace si es peor (mayor)', () => {
      const set = { distance_meters: 5000, pace_seconds: 320 }
      const preBests = { bestDistanceMeters: 5000, bestPaceSeconds: 300 }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['distance', 'pace'])
      expect(newRecords.find(r => r.type === 'bestPaceSeconds')).toBeUndefined()
    })

    it('detecta PR de reps para reps_only', () => {
      const set = { reps_completed: 20 }
      const preBests = { bestReps: 15 }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['reps'])
      expect(newRecords.find(r => r.type === 'bestReps')).toBeDefined()
    })

    it('detecta PR de tiempo', () => {
      const set = { time_seconds: 120 }
      const preBests = { bestTimeSeconds: 90 }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['time'])
      expect(newRecords.find(r => r.type === 'bestTimeSeconds')).toBeDefined()
    })

    it('detecta PR de distancia', () => {
      const set = { distance_meters: 6000 }
      const preBests = { bestDistanceMeters: 5000 }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['distance'])
      expect(newRecords.find(r => r.type === 'bestDistanceMeters')).toBeDefined()
    })

    it('no evalúa métricas irrelevantes para el tipo', () => {
      const set = { weight: 100, reps_completed: 10, time_seconds: 60 }
      const preBests = { bestTimeSeconds: 30 } // sería PR, pero weight_reps no trackea time

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['weight', 'reps'])
      expect(newRecords.find(r => r.type === 'bestTimeSeconds')).toBeUndefined()
    })

    it('actualiza running bests aunque no haya PR', () => {
      const set = { weight: 80, reps_completed: 10 } // 1RM=107
      const preBests = { best1rm: 130 }

      const { updatedRunningBests } = evaluateSetForPR(set, {}, preBests, ['weight', 'reps'])
      expect(updatedRunningBests.best1rm).toBe(107)
    })

    // ============================================
    // rep-PR-por-rep-count (modelo Strong/Hevy)
    // ============================================

    it('weight_reps: detecta repPR cuando peso supera el récord a ese rep count', () => {
      const set = { weight: 110, reps_completed: 5 }
      const preBests = { best1rm: 130, bestPerReps: { '5': 100, '8': 80 } }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['weight', 'reps'])

      const repPR = newRecords.find(r => r.type === 'repPR')
      expect(repPR).toBeDefined()
      expect(repPR.repCount).toBe(5)
      expect(repPR.value).toBe(110)
      expect(repPR.previousValue).toBe(100)
    })

    it('weight_reps: detecta repPR primera vez a N reps con historial general', () => {
      // Histórico: solo a 5 reps. Hoy hace 8 reps por primera vez.
      const set = { weight: 80, reps_completed: 8 }
      const preBests = { best1rm: 130, bestPerReps: { '5': 100 } }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['weight', 'reps'])

      const repPR = newRecords.find(r => r.type === 'repPR')
      expect(repPR).toBeDefined()
      expect(repPR.repCount).toBe(8)
      expect(repPR.previousValue).toBeNull()
    })

    it('weight_reps: NO dispara repPR si peso no supera récord previo a ese rep count', () => {
      const set = { weight: 90, reps_completed: 5 }
      const preBests = { best1rm: 130, bestPerReps: { '5': 100 } }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['weight', 'reps'])
      expect(newRecords.find(r => r.type === 'repPR')).toBeUndefined()
    })

    it('weight_reps: NO dispara repPR si preSessionBests no tiene bestPerReps (transitorio)', () => {
      const set = { weight: 100, reps_completed: 5 }
      const preBests = { best1rm: 130 } // sin bestPerReps

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['weight', 'reps'])
      expect(newRecords.find(r => r.type === 'repPR')).toBeUndefined()
    })

    it('weight_reps: NO dispara repPR dominado por más reps al mismo peso en la sesión (100×9 luego 100×8)', () => {
      const preBests = { best1rm: 130, bestPerReps: { '9': 90 } }

      // Set 1: 100×9 → repPR (supera 90 histórico a 9+ reps)
      const set1 = { weight: 100, reps_completed: 9 }
      const result1 = evaluateSetForPR(set1, {}, preBests, ['weight', 'reps'])
      expect(result1.newRecords.find(r => r.type === 'repPR')).toBeDefined()

      // Set 2: 100×8 — dominado por el 100×9 ya hecho, NO es PR
      const set2 = { weight: 100, reps_completed: 8 }
      const result2 = evaluateSetForPR(set2, result1.updatedRunningBests, preBests, ['weight', 'reps'])
      expect(result2.newRecords.find(r => r.type === 'repPR')).toBeUndefined()
    })

    it('weight_reps: repPR intra-sesión contra running bests', () => {
      const preBests = { best1rm: 130, bestPerReps: { '5': 100 } }

      // Set 1: 110×5 → repPR
      const set1 = { weight: 110, reps_completed: 5 }
      const result1 = evaluateSetForPR(set1, {}, preBests, ['weight', 'reps'])
      expect(result1.newRecords.find(r => r.type === 'repPR')).toBeDefined()
      expect(result1.updatedRunningBests.bestPerReps['5']).toBe(110)

      // Set 2: 105×5 — no supera running (110), no PR
      const set2 = { weight: 105, reps_completed: 5 }
      const result2 = evaluateSetForPR(set2, result1.updatedRunningBests, preBests, ['weight', 'reps'])
      expect(result2.newRecords.find(r => r.type === 'repPR')).toBeUndefined()

      // Set 3: 115×5 — supera running (110), PR
      const set3 = { weight: 115, reps_completed: 5 }
      const result3 = evaluateSetForPR(set3, result1.updatedRunningBests, preBests, ['weight', 'reps'])
      expect(result3.newRecords.find(r => r.type === 'repPR')).toBeDefined()
    })

    // The notice shows the best pre-session set at N reps or more, with its rep count.
    it('repPR previous value is the best pre-session set at N reps or more, with its rep count', () => {
      const set = { weight: 25, reps_completed: 6 }
      const preBests = { bestPerReps: { '6': 18, '8': 20 } }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['weight', 'reps'])

      const repPR = newRecords.find(r => r.type === 'repPR')
      expect(repPR).toMatchObject({ previousValue: 20, previousRepCount: 8 })
      expect(formatPRNotificationText({ exerciseName: 'Curl', records: [repPR] })).toContain('20 kg × 8')
    })

    it('repPR previous value exists when history only has more reps than N', () => {
      const set = { weight: 25, reps_completed: 6 }
      const preBests = { bestPerReps: { '8': 20 } }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['weight', 'reps'])

      expect(newRecords.find(r => r.type === 'repPR')).toMatchObject({ previousValue: 20, previousRepCount: 8 })
    })

    it('repPR previous value comes only from history, never from earlier sets of the session', () => {
      const set = { weight: 25, reps_completed: 6 }
      const preBests = { bestPerReps: { '8': 20 } }

      for (const running of [{ bestPerReps: { '7': 22 } }, { bestPerReps: { '6': 22 } }]) {
        const { newRecords } = evaluateSetForPR(set, running, preBests, ['weight', 'reps'])
        expect(newRecords.find(r => r.type === 'repPR')).toMatchObject({ previousValue: 20, previousRepCount: 8 })
      }
    })

    it('repPR decision still counts earlier sets of the session', () => {
      const set = { weight: 21, reps_completed: 6 }
      const preBests = { bestPerReps: { '8': 20 } }
      const running = { bestPerReps: { '7': 22 } }

      const { newRecords } = evaluateSetForPR(set, running, preBests, ['weight', 'reps'])

      expect(newRecords.find(r => r.type === 'repPR')).toBeUndefined()
    })

    it('repPR first time at N reps has no previous value nor rep count', () => {
      const set = { weight: 80, reps_completed: 8 }
      const preBests = { bestPerReps: { '5': 100 } }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['weight', 'reps'])

      expect(newRecords.find(r => r.type === 'repPR')).toMatchObject({ previousValue: null, previousRepCount: null })
    })

    // ============================================
    // weight unit propagation
    // ============================================

    it('por defecto usa "kg" como unidad cuando no se pasa weightUnit', () => {
      const set = { weight: 110, reps_completed: 5 }
      const preBests = { best1rm: 120, bestWeight: 100, bestPerReps: { '5': 100 } }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['weight', 'reps'])

      expect(newRecords.find(r => r.type === 'bestWeight').unit).toBe('kg')
      expect(newRecords.find(r => r.type === 'best1rm').unit).toBe('kg')
      expect(newRecords.find(r => r.type === 'repPR').unit).toBe('kg')
    })

    it('propaga weightUnit a records de peso, 1RM y repPR', () => {
      const set = { weight: 110, reps_completed: 5 }
      const preBests = { best1rm: 120, bestWeight: 100, bestPerReps: { '5': 100 } }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['weight', 'reps'], 'lb')

      expect(newRecords.find(r => r.type === 'bestWeight').unit).toBe('lb')
      expect(newRecords.find(r => r.type === 'best1rm').unit).toBe('lb')
      expect(newRecords.find(r => r.type === 'repPR').unit).toBe('lb')
    })

    it('usa labels traducidas vía i18n (no hardcoded)', () => {
      const set = { weight: 110, reps_completed: 5 }
      const preBests = { best1rm: 120, bestWeight: 100, bestPerReps: { '5': 100 } }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, ['weight', 'reps'])

      // Las labels vienen del namespace workout:pr (idioma de los tests = es por defecto)
      expect(newRecords.find(r => r.type === 'bestWeight').label).toBe('Peso')
      expect(newRecords.find(r => r.type === 'best1rm').label).toBe('1RM')
    })

    it('weightUnit no afecta a records que no son de peso (reps/tiempo/distancia/pace)', () => {
      const repsSet = { reps_completed: 20 }
      const repsResult = evaluateSetForPR(repsSet, {}, { bestReps: 15 }, ['reps'], 'lb')
      expect(repsResult.newRecords.find(r => r.type === 'bestReps').unit).toBe('reps')

      const timeSet = { time_seconds: 120 }
      const timeResult = evaluateSetForPR(timeSet, {}, { bestTimeSeconds: 90 }, ['time'], 'lb')
      expect(timeResult.newRecords.find(r => r.type === 'bestTimeSeconds').unit).toBe('s')

      const distSet = { distance_meters: 6000 }
      const distResult = evaluateSetForPR(distSet, {}, { bestDistanceMeters: 5000 }, ['distance'], 'lb')
      expect(distResult.newRecords.find(r => r.type === 'bestDistanceMeters').unit).toBe('m')

      const paceSet = { distance_meters: 5000, pace_seconds: 280 }
      const paceResult = evaluateSetForPR(paceSet, {}, { bestDistanceMeters: 5000, bestPaceSeconds: 300 }, ['distance', 'pace'], 'lb')
      expect(paceResult.newRecords.find(r => r.type === 'bestPaceSeconds').unit).toBe('s/km')
    })
  })

  // ============================================
  // rep-PR dominance helpers
  // ============================================

  describe('bestAtRepsOrAbove', () => {
    it('returns the weight and reps of the heaviest qualifying entry', () => {
      expect(bestAtRepsOrAbove(6, false, [{ '5': 30, '6': 20, '8': 22, '10': 18 }])).toEqual({ weight: 22, reps: 8 })
    })

    it('on a weight tie, returns the highest rep count', () => {
      expect(bestAtRepsOrAbove(6, false, [{ '6': 20, '8': 20, '7': 20 }])).toEqual({ weight: 20, reps: 8 })
    })

    it('returns null when no entry qualifies', () => {
      expect(bestAtRepsOrAbove(9, false, [{ '5': 30, '8': 20 }])).toBeNull()
      expect(bestAtRepsOrAbove(6, false, [])).toBeNull()
      expect(bestAtRepsOrAbove(6, false, [null, {}])).toBeNull()
    })

    it('strictlyGreater leaves out the entry at exactly minReps', () => {
      expect(bestAtRepsOrAbove(6, true, [{ '6': 25, '7': 22 }])).toEqual({ weight: 22, reps: 7 })
      expect(bestAtRepsOrAbove(6, true, [{ '6': 25 }])).toBeNull()
    })

    it('scans several maps, skipping missing ones', () => {
      expect(bestAtRepsOrAbove(6, false, [{ '8': 20 }, null, { '7': 22 }])).toEqual({ weight: 22, reps: 7 })
    })

    it('entries without a positive weight never win', () => {
      expect(bestAtRepsOrAbove(6, false, [{ '6': null, '8': 0 }])).toBeNull()
    })
  })

  describe('findPreviousRepRecord', () => {
    it('returns the best pre-session entry at repCount reps or more', () => {
      expect(findPreviousRepRecord(6, { '6': 18, '8': 20 })).toEqual({ weight: 20, reps: 8 })
      expect(findPreviousRepRecord(6, { '6': 20, '8': 20 })).toEqual({ weight: 20, reps: 8 })
    })

    it('returns null when nothing qualifies', () => {
      expect(findPreviousRepRecord(6, { '5': 30 })).toBeNull()
      expect(findPreviousRepRecord(6, null)).toBeNull()
    })
  })

  describe('findBeatenRepRecord', () => {
    it('on a weight tie between history and session, the highest rep count wins', () => {
      expect(findBeatenRepRecord(6, { '8': 20 }, { '7': 20 })).toEqual({ weight: 20, reps: 8 })
      expect(findBeatenRepRecord(6, { '6': 20 }, { '7': 20 })).toEqual({ weight: 20, reps: 7 })
    })

    it('the session entry at exactly repCount is the new record, not the beaten one', () => {
      expect(findBeatenRepRecord(6, { '8': 20 }, { '6': 25 })).toEqual({ weight: 20, reps: 8 })
    })

    it('returns null when neither history nor session qualifies', () => {
      expect(findBeatenRepRecord(6, { '5': 30 }, { '6': 25 })).toBeNull()
      expect(findBeatenRepRecord(6, null, null)).toBeNull()
    })

    it.each([
      [6, { '8': 20 }, { '7': 20 }],
      [6, { '6': 20 }, { '7': 20 }],
      [6, { '6': 18, '8': 20 }, { '6': 25, '7': 22 }],
      [6, { '9': 30 }, { '6': 25, '7': 22 }],
      [6, { '5': 30 }, { '6': 25 }],
      [5, null, { '5': 100, '8': 90 }],
    ])('its weight equals the old threshold (N=%i, history %o, session %o)', (repCount, history, session) => {
      // The threshold before #125, written out on its own so the oracle shares no code with the subject.
      const oldMaxWeight = (minReps, strictlyGreater, map) => Object.entries(map ?? {})
        .filter(([reps]) => (strictlyGreater ? Number(reps) > minReps : Number(reps) >= minReps))
        .reduce((best, [, weight]) => (weight > best ? weight : best), 0)
      const oldThreshold = Math.max(
        oldMaxWeight(repCount, false, history),
        oldMaxWeight(repCount, true, session),
      )
      expect(findBeatenRepRecord(repCount, history, session)?.weight ?? 0).toBe(oldThreshold)
    })
  })

  // buildWorkoutSummaryFromEndSession relabels exactly these types with the exercise's real
  // weight unit. A weight PR missing here would keep the 'kg' placeholder in a lb exercise.
  describe('WEIGHT_PR_TYPES', () => {
    const everyMetricImproves = () => detectNewPersonalRecords(
      {
        bestWeight: 100, bestReps: 12, best1rm: 130, totalVolume: 5000,
        bestTimeSeconds: 600, bestDistanceMeters: 5000, bestPaceSeconds: 300,
        bestPerReps: { '5': 100 },
      },
      {
        bestWeight: 90, bestReps: 10, best1rm: 120, totalVolume: 4000,
        bestTimeSeconds: 500, bestDistanceMeters: 4000, bestPaceSeconds: 330,
        bestPerReps: { '5': 90 },
      },
    ).details

    it('covers every PR detail that detectNewPersonalRecords labels in kg, and nothing else', () => {
      const details = everyMetricImproves()
      // Guard: all 8 kinds of detail must be produced, or the partition below proves nothing.
      expect(details).toHaveLength(8)

      for (const detail of details) {
        expect(WEIGHT_PR_TYPES.has(detail.type), `${detail.type} (${detail.unit})`).toBe(detail.unit === 'kg')
      }
    })

    it('holds the weight-based types (assistance included) and leaves out reps, time, distance and pace', () => {
      expect([...WEIGHT_PR_TYPES].sort()).toEqual(['best1rm', 'bestAssistance', 'bestWeight', 'repPR', 'totalVolume'])
    })
  })

  describe('formatPRNotificationText', () => {
    it('formatea notificación con mejora previa', () => {
      const notification = {
        exerciseName: 'Press Banca',
        records: [{ label: 'Peso', value: 100, unit: 'kg', previousValue: '90 kg' }],
      }
      expect(formatPRNotificationText(notification)).toBe('Press Banca: Peso 100 kg (anterior: 90 kg)')
    })

    it('formatea notificación sin valor previo', () => {
      const notification = {
        exerciseName: 'Sentadilla',
        records: [{ label: '1RM', value: 120, unit: 'kg', previousValue: null }],
      }
      expect(formatPRNotificationText(notification)).toBe('Sentadilla: 1RM 120 kg')
    })

    it('formatea repPR con su label interpolado', () => {
      const notification = {
        exerciseName: 'Press Banca',
        records: [{ type: 'repPR', repCount: 5, label: 'Récord a 5 reps', value: 110, unit: 'kg', previousValue: 100 }],
      }
      expect(formatPRNotificationText(notification)).toBe('Press Banca: Récord a 5 reps 110 kg (anterior: 100 kg × 5)')
    })

    it('repPR previous value prints the previous set\'s own rep count and unit', () => {
      const notification = {
        exerciseName: 'Curl',
        records: [{ type: 'repPR', repCount: 6, label: 'Récord a 6 reps', value: 25, unit: 'lb', previousValue: 20, previousRepCount: 8 }],
      }
      expect(formatPRNotificationText(notification)).toBe('Curl: Récord a 6 reps 25 lb (anterior: 20 lb × 8)')
    })

    it('prioriza repPR sobre best1rm y bestWeight cuando coexisten', () => {
      const notification = {
        exerciseName: 'Press Banca',
        records: [
          { type: 'bestWeight', label: 'Peso', value: 110, unit: 'kg', previousValue: 100 },
          { type: 'best1rm', label: '1RM Est.', value: 132, unit: 'kg', previousValue: 120 },
          { type: 'repPR', repCount: 5, label: 'Récord a 5 reps', value: 110, unit: 'kg', previousValue: 100 },
        ],
      }
      // repPR tiene la prioridad más alta
      expect(formatPRNotificationText(notification)).toBe('Press Banca: Récord a 5 reps 110 kg (anterior: 100 kg × 5)')
    })

    it('prioriza best1rm sobre bestWeight si no hay repPR', () => {
      const notification = {
        exerciseName: 'Press Banca',
        records: [
          { type: 'bestWeight', label: 'Peso', value: 110, unit: 'kg', previousValue: 100 },
          { type: 'best1rm', label: '1RM Est.', value: 132, unit: 'kg', previousValue: 120 },
        ],
      }
      expect(formatPRNotificationText(notification)).toBe('Press Banca: 1RM Est. 132 kg (anterior: 120)')
    })
  })

  // ============================================
  // mergeExerciseStats
  // ============================================

  describe('mergeExerciseStats', () => {
    it('toma el máximo de cada best y suma totalVolume y totalSets', () => {
      const target = { bestWeight: 80, bestReps: 10, best1rm: 100, totalVolume: 500, totalSets: 3 }
      mergeExerciseStats(target, { bestWeight: 100, bestReps: 8, best1rm: 95, totalVolume: 400, totalSets: 2 })
      expect(target).toEqual({
        bestWeight: 100,
        bestReps: 10,
        best1rm: 100,
        totalVolume: 900,
        totalSets: 5,
      })
    })

    it('mantiene el bestPaceSeconds más bajo (menor = mejor)', () => {
      const target = { bestPaceSeconds: 300 }
      mergeExerciseStats(target, { bestPaceSeconds: 250 })
      expect(target.bestPaceSeconds).toBe(250)
    })

    it('ignora source con valores undefined o 0', () => {
      const target = { bestWeight: 100, totalSets: 4 }
      mergeExerciseStats(target, { bestWeight: 0, totalSets: undefined, bestReps: 5 })
      expect(target.bestWeight).toBe(100)
      expect(target.bestReps).toBe(5)
      expect(target.totalSets).toBe(4)
    })

    it('fusiona bestPerReps tomando el máximo por cada rep count', () => {
      const target = { bestPerReps: { '5': 100, '8': 80 } }
      mergeExerciseStats(target, { bestPerReps: { '5': 95, '8': 85, '10': 70 } })
      expect(target.bestPerReps).toEqual({ '5': 100, '8': 85, '10': 70 })
    })

    it('crea bestPerReps en target si no existía', () => {
      const target = { bestWeight: 100 }
      mergeExerciseStats(target, { bestPerReps: { '5': 90 } })
      expect(target.bestPerReps).toEqual({ '5': 90 })
    })
  })

  // ============================================
  // detectNewPersonalRecords: prRepCounts
  // ============================================

  describe('detectNewPersonalRecords > prRepCounts', () => {
    it('detecta prRepCounts cuando peso supera el récord en algún rep count', () => {
      const current = { best1rm: 130, bestPerReps: { '5': 110, '8': 80 } }
      const previous = { best1rm: 120, bestPerReps: { '5': 100, '8': 85 } }
      const { flags } = detectNewPersonalRecords(current, previous, ['weight', 'reps'])
      // 110>100 → PR @5; 80<85 → no PR @8
      expect(flags.prRepCounts).toEqual([5])
    })

    it('detecta prRepCounts incluyendo primera vez a un rep count nuevo', () => {
      const current = { best1rm: 130, bestPerReps: { '5': 100, '12': 60 } }
      const previous = { best1rm: 120, bestPerReps: { '5': 100 } } // sin entrada a 12
      const { flags } = detectNewPersonalRecords(current, previous, ['weight', 'reps'])
      // 100=100 (no PR) y 12 reps es primera vez con historial → PR
      expect(flags.prRepCounts).toEqual([12])
    })

    it('NO marca prRepCounts si previousBests no tiene bestPerReps (transitorio)', () => {
      const current = { best1rm: 130, bestPerReps: { '5': 100 } }
      const previous = { best1rm: 120 }
      const { flags } = detectNewPersonalRecords(current, previous, ['weight', 'reps'])
      expect(flags.prRepCounts).toBeNull()
    })

    it('no prRepCounts when the history has a weight but no bestPerReps', () => {
      const current = { bestWeight: 100, bestPerReps: { '5': 100 } }
      const previous = { bestWeight: 90, best1rm: null, bestPerReps: null }
      const { flags } = detectNewPersonalRecords(current, previous, ['weight', 'reps'])
      expect(flags.prRepCounts).toBeNull()
    })

    it('an empty bestPerReps map is no rep history: rep PR when the history has no weight, none when it has one', () => {
      const current = { bestWeight: 5, bestPerReps: { '12': 5 } }

      const zeroKgOnly = detectNewPersonalRecords(current, { ...ZERO_KG_ONLY_BESTS, bestPerReps: {} }, ['weight', 'reps'])
      const withWeight = detectNewPersonalRecords(current, { bestWeight: 4, bestPerReps: {} }, ['weight', 'reps'])

      expect(zeroKgOnly.flags.prRepCounts).toEqual([12])
      expect(withWeight.flags.prRepCounts).toBeNull()
    })

    it('NO marca prRepCounts si current no tiene bestPerReps', () => {
      const current = { best1rm: 130 }
      const previous = { bestPerReps: { '5': 100 } }
      const { flags } = detectNewPersonalRecords(current, previous, ['weight', 'reps'])
      expect(flags.prRepCounts).toBeNull()
    })

    it('NO marca un rep count dominado por más reps al mismo peso en la misma sesión (100×9 y 100×8 → solo 9)', () => {
      const current = { best1rm: 130, bestPerReps: { '9': 100, '8': 100 } }
      const previous = { best1rm: 120, bestPerReps: { '9': 90, '8': 90 } }
      const { flags } = detectNewPersonalRecords(current, previous, ['weight', 'reps'])
      // 100×9 supera su récord; 100×8 queda dominado por el 100×9 de la misma sesión
      expect(flags.prRepCounts).toEqual([9])
    })

    // Issue #125: the previous set can have more reps than the new record.
    it('repPR detail carries the previous set\'s rep count as oldRepCount', () => {
      const repPRAt6 = (previous, current) => detectNewPersonalRecords(
        { bestPerReps: current }, { bestPerReps: previous }, ['weight', 'reps'],
      ).details.find(d => d.type === 'repPR' && d.repCount === 6)

      expect(repPRAt6({ '8': 20 }, { '6': 25 })).toMatchObject({ oldValue: 20, oldRepCount: 8 })
      expect(repPRAt6({ '6': 20 }, { '6': 25 })).toMatchObject({ oldValue: 20, oldRepCount: 6 })
      // The session's own 22 × 7 raised the bar but is not the "previous": that is pre-session only.
      expect(repPRAt6({ '6': 20 }, { '6': 25, '7': 22 })).toMatchObject({ oldValue: 20, oldRepCount: 6 })
    })

    it('repPR is not detected when a heavier set of the session at more reps dominates it', () => {
      const { details } = detectNewPersonalRecords(
        { bestPerReps: { '6': 21, '7': 22 } }, { bestPerReps: { '6': 20 } }, ['weight', 'reps'],
      )
      expect(details.find(d => d.type === 'repPR' && d.repCount === 6)).toBeUndefined()
    })

    it('repPR first time at N reps has null oldValue and oldRepCount', () => {
      const { details } = detectNewPersonalRecords(
        { bestPerReps: { '8': 80 } }, { bestPerReps: { '5': 100 } }, ['weight', 'reps'],
      )
      expect(details.find(d => d.type === 'repPR')).toMatchObject({ repCount: 8, oldValue: null, oldRepCount: null })
    })

    it('prRepCounts viene ordenado ascendente', () => {
      const current = { best1rm: 130, bestPerReps: { '8': 90, '5': 110, '3': 120 } }
      const previous = { best1rm: 120, bestPerReps: { '5': 100, '8': 80, '3': 115 } }
      const { flags } = detectNewPersonalRecords(current, previous, ['weight', 'reps'])
      expect(flags.prRepCounts).toEqual([3, 5, 8])
    })
  })

  // ============================================
  // computeExercisePRSetNumbers (recálculo del trofeo desde cero)
  // ============================================

  describe('computeExercisePRSetNumbers', () => {
    it('retorna vacío sin series', () => {
      expect(computeExercisePRSetNumbers([], { bestWeight: 100 }, ['weight', 'reps'])).toEqual([])
    })

    it('retorna vacío sin historial previo (null o "none")', () => {
      const sets = [{ setNumber: 1, weight: 200, repsCompleted: 10 }]
      expect(computeExercisePRSetNumbers(sets, null, ['weight', 'reps'])).toEqual([])
      expect(computeExercisePRSetNumbers(sets, 'none', ['weight', 'reps'])).toEqual([])
    })

    it('marca como PR la serie que bate el peso/1RM previo', () => {
      const sets = [{ setNumber: 1, weight: 110, repsCompleted: 5 }]
      const preBests = { bestWeight: 100, best1rm: 120 }
      expect(computeExercisePRSetNumbers(sets, preBests, ['weight', 'reps'])).toEqual([1])
    })

    it('edición HACIA ARRIBA: un peso que antes no batía ahora es PR', () => {
      // Simula haber completado floja y luego subido el peso: el recálculo la marca.
      const preBests = { bestWeight: 100, best1rm: 120 }
      expect(computeExercisePRSetNumbers([{ setNumber: 1, weight: 90, repsCompleted: 5 }], preBests, ['weight', 'reps'])).toEqual([])
      expect(computeExercisePRSetNumbers([{ setNumber: 1, weight: 115, repsCompleted: 5 }], preBests, ['weight', 'reps'])).toEqual([1])
    })

    it('edición HACIA ABAJO: deja de ser PR (el bug que arregla el recálculo desde cero)', () => {
      // Con el acumulador incremental el trofeo quedaba congelado; aquí desaparece.
      const preBests = { bestWeight: 100, best1rm: 120 }
      expect(computeExercisePRSetNumbers([{ setNumber: 1, weight: 90, repsCompleted: 5 }], preBests, ['weight', 'reps'])).toEqual([])
    })

    it('reprocesa en orden: una serie posterior menor no es PR (dominancia del running best)', () => {
      const sets = [
        { setNumber: 1, weight: 110, repsCompleted: 5 },
        { setNumber: 2, weight: 105, repsCompleted: 5 },
      ]
      const preBests = { bestWeight: 100, best1rm: 120 }
      expect(computeExercisePRSetNumbers(sets, preBests, ['weight', 'reps'])).toEqual([1])
    })

    it('ordena por setNumber aunque el array llegue desordenado', () => {
      const sets = [
        { setNumber: 2, weight: 105, repsCompleted: 5 },
        { setNumber: 1, weight: 110, repsCompleted: 5 },
      ]
      const preBests = { bestWeight: 100, best1rm: 120 }
      expect(computeExercisePRSetNumbers(sets, preBests, ['weight', 'reps'])).toEqual([1])
    })

    it('marca varias series si cada una supera a la anterior', () => {
      const sets = [
        { setNumber: 1, weight: 105, repsCompleted: 3 },
        { setNumber: 2, weight: 110, repsCompleted: 3 },
      ]
      const preBests = { bestWeight: 100, best1rm: 200 }
      expect(computeExercisePRSetNumbers(sets, preBests, ['weight', 'reps'])).toEqual([1, 2])
    })

    it('detecta repPR por rep-count aunque peso/1RM no batan récord', () => {
      const sets = [{ setNumber: 1, weight: 105, repsCompleted: 5 }]
      const preBests = { bestWeight: 200, best1rm: 200, bestPerReps: { '5': 100 } }
      expect(computeExercisePRSetNumbers(sets, preBests, ['weight', 'reps'])).toEqual([1])
    })

    it('métrica de pace (menor = mejor): serie más rápida es PR', () => {
      const sets = [{ setNumber: 1, distanceMeters: 5000, paceSeconds: 280 }]
      const preBests = { bestDistanceMeters: 5000, bestPaceSeconds: 300 }
      expect(computeExercisePRSetNumbers(sets, preBests, ['distance', 'pace'])).toEqual([1])
    })
  })

  describe('computeExercisePRSets', () => {
    it('devuelve setNumber + records por cada serie-PR', () => {
      const sets = [{ setNumber: 1, weight: 110, repsCompleted: 5 }]
      const preBests = { bestWeight: 100, best1rm: 120 }
      const result = computeExercisePRSets(sets, preBests, ['weight', 'reps'])
      expect(result).toHaveLength(1)
      expect(result[0].setNumber).toBe(1)
      expect(result[0].records.length).toBeGreaterThan(0)
      expect(result[0].records.some(r => r.type === 'bestWeight')).toBe(true)
    })

    it('propaga weightUnit a las etiquetas de los records', () => {
      const sets = [{ setNumber: 1, weight: 250, repsCompleted: 5 }]
      const preBests = { bestWeight: 200, best1rm: 240 }
      const result = computeExercisePRSets(sets, preBests, ['weight', 'reps'], 'lb')
      expect(result[0].records.find(r => r.type === 'bestWeight').unit).toBe('lb')
    })

    it('el anterior de un repPR es el mejor pre-sesión, no una serie previa de la sesión', () => {
      const sets = [
        { setNumber: 1, weight: 22, repsCompleted: 7 },
        { setNumber: 2, weight: 25, repsCompleted: 6 },
      ]
      const preBests = { bestPerReps: { '8': 20 } }
      const result = computeExercisePRSets(sets, preBests, ['weight', 'reps'])
      const repPR = result.find(r => r.setNumber === 2).records.find(r => r.type === 'repPR')
      expect(repPR).toMatchObject({ repCount: 6, previousValue: 20, previousRepCount: 8 })
    })

    it('retorna vacío sin historial previo', () => {
      const sets = [{ setNumber: 1, weight: 200, repsCompleted: 10 }]
      expect(computeExercisePRSets(sets, null, ['weight', 'reps'])).toEqual([])
      expect(computeExercisePRSets(sets, 'none', ['weight', 'reps'])).toEqual([])
    })

    it('after a history of only 0 kg sets, a heavier second set is a PR too, still with no previous value', () => {
      const sets = [
        { setNumber: 1, weight: 5, repsCompleted: 12 },
        { setNumber: 2, weight: 6, repsCompleted: 12 },
      ]
      const result = computeExercisePRSets(sets, ZERO_KG_ONLY_BESTS, ['weight', 'reps'])
      expect(result.map(r => r.setNumber)).toEqual([1, 2])
      for (const { records } of result) {
        expect(records.map(r => r.type).sort()).toEqual(['best1rm', 'bestWeight', 'repPR'])
        for (const record of records) expect(record.previousValue).toBeNull()
      }
    })

    it('after a history of only 0 kg sets, only the first of two 5 × 12 sets is a PR', () => {
      const sets = [
        { setNumber: 1, weight: 5, repsCompleted: 12 },
        { setNumber: 2, weight: 5, repsCompleted: 12 },
      ]
      const result = computeExercisePRSets(sets, ZERO_KG_ONLY_BESTS, ['weight', 'reps'])
      expect(result.map(r => r.setNumber)).toEqual([1])
      expect(result[0].records.map(r => r.type).sort()).toEqual(['best1rm', 'bestWeight', 'repPR'])
    })
  })
})

// ============================================
// ASSISTANCE: LESS IS BETTER, 0 IS A VALUE (issue #202)
// ============================================

describe('assistance × reps', () => {
  const ASSISTED = ['assistance', 'reps']
  const set = (weight, reps) => ({ weight, reps_completed: reps })
  // What fetchExerciseBests returns for one earlier session of 30 kg × 8.
  const BESTS_30x8 = { bestAssistance: 30, bestReps: 8, bestPerReps: { '8': 30 } }

  describe('metrics', () => {
    it.each([
      [['assistance', 'reps'], ['assistance', 'repPR']],
      [['weight', 'assistance', 'reps'], ['assistance', 'repPR']],
      [['assistance'], []],
      [['weight', 'assistance'], []],
      [['assistance', 'time'], []],
      [['assistance', 'distance', 'pace'], []],
    ])('getPRMetrics(%j) is %j', (fields, metrics) => {
      expect(getPRMetrics(fields)).toEqual(metrics)
    })

    it('getTrackableMetrics has no 1RM nor volume', () => {
      expect(getTrackableMetrics(ASSISTED)).toEqual(['assistance', 'reps', 'repPR'])
    })

    it('isRepPRLowerBetter only for assistance', () => {
      expect(isRepPRLowerBetter(ASSISTED)).toBe(true)
      expect(isRepPRLowerBetter(['weight', 'reps'])).toBe(false)
    })
  })

  describe('calculateSessionExerciseStats', () => {
    it('the least assistance over sets with reps, per rep count too, and no weight stats', () => {
      const stats = calculateSessionExerciseStats([set(30, 8), set(20, 8), set(25, 10)], ASSISTED)
      expect(stats.bestAssistance).toBe(20)
      expect(stats.bestPerReps).toEqual({ '8': 20, '10': 25 })
      expect(stats.bestWeight).toBeUndefined()
      expect(stats.best1rm).toBeUndefined()
      expect(stats.totalVolume).toBeUndefined()
    })

    it('keeps 0 as the best value', () => {
      const stats = calculateSessionExerciseStats([set(10, 5), set(0, 5)], ASSISTED)
      expect(stats.bestAssistance).toBe(0)
      expect(stats.bestPerReps).toEqual({ '5': 0 })
    })

    it('a set without reps or without assistance does not count: null, not 0', () => {
      const stats = calculateSessionExerciseStats([set(0, 0), set(null, 8)], ASSISTED)
      expect(stats.bestAssistance).toBeNull()
      expect(stats.bestPerReps).toBeNull()
    })
  })

  describe('mergeExerciseStats', () => {
    it('keeps the least assistance, per rep count too, 0 included', () => {
      const target = { bestAssistance: 20, bestPerReps: { '8': 20, '5': 10 }, totalSets: 2 }
      mergeExerciseStats(target, { bestAssistance: 0, bestPerReps: { '8': 25, '5': 0 }, totalSets: 1 }, ASSISTED)
      expect(target.bestAssistance).toBe(0)
      expect(target.bestPerReps).toEqual({ '8': 20, '5': 0 })
      expect(target.totalSets).toBe(3)
    })

    it('a missing assistance never replaces one', () => {
      const target = { bestAssistance: 0, totalSets: 1 }
      mergeExerciseStats(target, { bestAssistance: null, totalSets: 1 }, ASSISTED)
      expect(target.bestAssistance).toBe(0)
    })

    it('weight still keeps the heaviest per rep count', () => {
      const target = { bestPerReps: { '8': 80 }, totalSets: 1 }
      mergeExerciseStats(target, { bestPerReps: { '8': 90 }, totalSets: 1 }, ['weight', 'reps'])
      expect(target.bestPerReps).toEqual({ '8': 90 })
    })
  })

  describe('bestAtRepsOrAbove (lowerIsBetter)', () => {
    it('the least assistance at minReps or more wins, 0 can win', () => {
      expect(bestAtRepsOrAbove(6, false, [{ '5': 0, '6': 20, '8': 15, '10': 25 }], { lowerIsBetter: true }))
        .toEqual({ weight: 15, reps: 8 })
      expect(bestAtRepsOrAbove(6, false, [{ '8': 0, '10': 25 }], { lowerIsBetter: true }))
        .toEqual({ weight: 0, reps: 8 })
    })

    it('on a tie, the higher rep count', () => {
      expect(bestAtRepsOrAbove(6, false, [{ '6': 20, '9': 20 }], { lowerIsBetter: true }))
        .toEqual({ weight: 20, reps: 9 })
    })

    it('null when nothing qualifies', () => {
      expect(bestAtRepsOrAbove(9, false, [{ '8': 0 }], { lowerIsBetter: true })).toBeNull()
    })
  })

  describe('detectNewPersonalRecords', () => {
    it('20 kg after 30 kg at 8 reps: assistance PR and rep PR at 8', () => {
      const current = calculateSessionExerciseStats([set(20, 8)], ASSISTED)
      const { flags, details } = detectNewPersonalRecords(current, BESTS_30x8, ASSISTED)
      expect(flags.isPrAssistance).toBe(true)
      expect(flags.prRepCounts).toEqual([8])
      expect(flags.isPrWeight).toBe(false)
      expect(flags.isPr1rm).toBe(false)
      const assistance = details.find(d => d.type === 'bestAssistance')
      expect(assistance).toMatchObject({ newValue: 20, oldValue: 30, improvement: 33, label: 'Menor asistencia' })
      expect(details.find(d => d.type === 'repPR')).toMatchObject({ newValue: 20, oldValue: 30, oldRepCount: 8 })
    })

    it('40 kg after 30 kg at 8 reps: no record at all', () => {
      const current = calculateSessionExerciseStats([set(40, 8)], ASSISTED)
      const { flags, details } = detectNewPersonalRecords(current, BESTS_30x8, ASSISTED)
      expect(flags.isPrAssistance).toBe(false)
      expect(flags.prRepCounts).toBeNull()
      expect(details).toEqual([])
    })

    it('0 kg × 5 after only higher assistance: a PR (0 is a value, not "missing")', () => {
      const current = calculateSessionExerciseStats([set(0, 5)], ASSISTED)
      const { flags } = detectNewPersonalRecords(current, BESTS_30x8, ASSISTED)
      expect(flags.isPrAssistance).toBe(true)
      expect(flags.prRepCounts).toEqual([5])
    })

    it('inverted dominance: 20 × 8 after 20 × 10 is no rep PR, 15 × 8 is', () => {
      const previous = { bestAssistance: 20, bestPerReps: { '10': 20 } }
      const same = detectNewPersonalRecords(calculateSessionExerciseStats([set(20, 8)], ASSISTED), previous, ASSISTED)
      expect(same.flags.prRepCounts).toBeNull()
      const less = detectNewPersonalRecords(calculateSessionExerciseStats([set(15, 8)], ASSISTED), previous, ASSISTED)
      expect(less.flags.prRepCounts).toEqual([8])
    })

    it('the first time at a rep count is a rep PR, even with more assistance than elsewhere', () => {
      const previous = { bestAssistance: 10, bestPerReps: { '5': 10 } }
      const { flags } = detectNewPersonalRecords(calculateSessionExerciseStats([set(30, 12)], ASSISTED), previous, ASSISTED)
      expect(flags.isPrAssistance).toBe(false)
      expect(flags.prRepCounts).toEqual([12])
    })

    it('a 0 kg history still blocks a rep PR at the same assistance', () => {
      const previous = { bestAssistance: 0, bestPerReps: { '8': 0 } }
      const { flags } = detectNewPersonalRecords(calculateSessionExerciseStats([set(0, 8)], ASSISTED), previous, ASSISTED)
      expect(flags.isPrAssistance).toBe(false)
      expect(flags.prRepCounts).toBeNull()
    })
  })

  describe('evaluateSetForPR (live)', () => {
    it('lower assistance is a PR, higher is not, and the running best follows the least', () => {
      const lower = evaluateSetForPR(set(20, 8), {}, BESTS_30x8, ASSISTED)
      expect(lower.newRecords.map(r => r.type).sort()).toEqual(['bestAssistance', 'repPR'])
      expect(lower.newRecords.find(r => r.type === 'bestAssistance')).toMatchObject({ value: 20, previousValue: 30 })

      const higher = evaluateSetForPR(set(40, 8), {}, BESTS_30x8, ASSISTED)
      expect(higher.newRecords).toEqual([])

      // After a 20, a 25 is no PR: the running best is 20.
      const next = evaluateSetForPR(set(25, 8), lower.updatedRunningBests, BESTS_30x8, ASSISTED)
      expect(next.newRecords).toEqual([])
      expect(next.updatedRunningBests.bestAssistance).toBe(20)
    })

    it('0 kg is a PR and becomes the running best (no `|| Infinity`)', () => {
      const zero = evaluateSetForPR(set(0, 5), {}, BESTS_30x8, ASSISTED)
      expect(zero.newRecords.map(r => r.type).sort()).toEqual(['bestAssistance', 'repPR'])
      expect(zero.updatedRunningBests.bestAssistance).toBe(0)
      expect(zero.updatedRunningBests.bestPerReps).toEqual({ '5': 0 })

      const again = evaluateSetForPR(set(0, 5), zero.updatedRunningBests, BESTS_30x8, ASSISTED)
      expect(again.newRecords).toEqual([])
    })

    it('with a 0 kg record before the session nothing beats it', () => {
      const bests = { bestAssistance: 0, bestPerReps: { '8': 0 } }
      expect(evaluateSetForPR(set(0, 8), {}, bests, ASSISTED).newRecords).toEqual([])
    })

    it('without an earlier assistance there is nothing to beat', () => {
      const bests = { bestAssistance: null, bestPerReps: null }
      const { newRecords } = evaluateSetForPR(set(20, 8), {}, bests, ASSISTED)
      expect(newRecords.map(r => r.type)).toEqual(['repPR'])
    })

    it('a set without reps is never a record', () => {
      expect(evaluateSetForPR(set(0, 0), {}, BESTS_30x8, ASSISTED).newRecords).toEqual([])
    })

    it('computeExercisePRSetNumbers marks the sets that lowered the assistance', () => {
      const sets = [
        { setNumber: 1, weight: 40, repsCompleted: 8 },
        { setNumber: 2, weight: 20, repsCompleted: 8 },
        { setNumber: 3, weight: 25, repsCompleted: 8 },
        { setNumber: 4, weight: 0, repsCompleted: 6 },
      ]
      expect(computeExercisePRSetNumbers(sets, BESTS_30x8, ASSISTED)).toEqual([2, 4])
    })
  })

  describe('findPRSetNumbers', () => {
    it('marks the set with the least assistance, 0 included', () => {
      const sets = [
        { set_number: 1, weight: 20, reps_completed: 8 },
        { set_number: 2, weight: 0, reps_completed: 5 },
        { set_number: 3, weight: 0, reps_completed: 0 },
      ]
      expect([...findPRSetNumbers(sets, { is_pr_assistance: true }, ASSISTED)]).toEqual([2])
    })
  })

  it('formatPRNotificationText labels the assistance record with its unit and the previous one', () => {
    const text = formatPRNotificationText({
      exerciseName: 'Dominadas asistidas',
      records: [
        { type: 'bestAssistance', value: 20, previousValue: 30, label: 'Menor asistencia', unit: 'kg' },
      ],
    })
    expect(text).toBe('Dominadas asistidas: Menor asistencia 20 kg (anterior: 30)')
  })
})
