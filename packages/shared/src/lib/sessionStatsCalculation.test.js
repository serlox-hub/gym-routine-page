import { describe, it, expect } from 'vitest'
import {
  formatPRNotificationText,
  getTrackableMetrics,
  getPRMetrics,
  calculateSessionExerciseStats,
  detectNewPersonalRecords,
  evaluateSetForPR,
  recalculatePRFlags,
} from './sessionStatsCalculation.js'

describe('sessionStatsCalculation', () => {

  // ============================================
  // getTrackableMetrics
  // ============================================

  describe('getTrackableMetrics', () => {
    it('retorna weight, reps, 1rm, volume para weight_reps', () => {
      expect(getTrackableMetrics('weight_reps')).toEqual(['weight', 'reps', '1rm', 'volume'])
    })

    it('retorna solo reps para reps_only', () => {
      expect(getTrackableMetrics('reps_only')).toEqual(['reps'])
    })

    it('retorna time para time', () => {
      expect(getTrackableMetrics('time')).toEqual(['time'])
    })

    it('retorna weight y time para weight_time', () => {
      expect(getTrackableMetrics('weight_time')).toEqual(['weight', 'time'])
    })

    it('retorna distance para distance', () => {
      expect(getTrackableMetrics('distance')).toEqual(['distance'])
    })

    it('retorna weight y distance para weight_distance', () => {
      expect(getTrackableMetrics('weight_distance')).toEqual(['weight', 'distance'])
    })

    it('retorna vacío para calories (no hay columna en BD)', () => {
      expect(getTrackableMetrics('calories')).toEqual([])
    })

    it('retorna time para level_time', () => {
      expect(getTrackableMetrics('level_time')).toEqual(['time'])
    })

    it('retorna distance para level_distance', () => {
      expect(getTrackableMetrics('level_distance')).toEqual(['distance'])
    })

    it('retorna vacío para level_calories', () => {
      expect(getTrackableMetrics('level_calories')).toEqual([])
    })

    it('retorna distance y time para distance_time', () => {
      expect(getTrackableMetrics('distance_time')).toEqual(['distance', 'time'])
    })

    it('retorna distance y pace para distance_pace', () => {
      expect(getTrackableMetrics('distance_pace')).toEqual(['distance', 'pace'])
    })

    it('retorna vacío para tipo desconocido', () => {
      expect(getTrackableMetrics('unknown_type')).toEqual([])
    })
  })

  // ============================================
  // getPRMetrics
  // ============================================

  describe('getPRMetrics', () => {
    it('weight_reps solo 1RM', () => {
      expect(getPRMetrics('weight_reps')).toEqual(['1rm'])
    })

    it('reps_only solo reps', () => {
      expect(getPRMetrics('reps_only')).toEqual(['reps'])
    })

    it('time solo tiempo', () => {
      expect(getPRMetrics('time')).toEqual(['time'])
    })

    it('distance solo distancia', () => {
      expect(getPRMetrics('distance')).toEqual(['distance'])
    })

    it('distance_pace solo ritmo', () => {
      expect(getPRMetrics('distance_pace')).toEqual(['pace'])
    })

    it('tipos compuestos sin fórmula unificada no disparan PRs', () => {
      expect(getPRMetrics('weight_time')).toEqual([])
      expect(getPRMetrics('weight_distance')).toEqual([])
      expect(getPRMetrics('distance_time')).toEqual([])
      expect(getPRMetrics('level_time')).toEqual([])
      expect(getPRMetrics('level_distance')).toEqual([])
    })
  })

  // ============================================
  // calculateSessionExerciseStats
  // ============================================

  describe('calculateSessionExerciseStats', () => {
    it('retorna null para sets vacíos', () => {
      expect(calculateSessionExerciseStats([], 'weight_reps')).toBeNull()
    })

    it('retorna null si sets es null', () => {
      expect(calculateSessionExerciseStats(null, 'weight_reps')).toBeNull()
    })

    describe('weight_reps', () => {
      const sets = [
        { weight: 100, reps_completed: 8, weight_unit: 'kg' },
        { weight: 100, reps_completed: 6, weight_unit: 'kg' },
        { weight: 90, reps_completed: 10, weight_unit: 'kg' },
      ]

      it('calcula bestWeight', () => {
        const stats = calculateSessionExerciseStats(sets, 'weight_reps')
        expect(stats.bestWeight).toBe(100)
      })

      it('calcula bestReps', () => {
        const stats = calculateSessionExerciseStats(sets, 'weight_reps')
        expect(stats.bestReps).toBe(10)
      })

      it('calcula best1rm (Epley)', () => {
        // 100x8=127, 100x6=120, 90x10=120 → max=127
        const stats = calculateSessionExerciseStats(sets, 'weight_reps')
        expect(stats.best1rm).toBe(127)
      })

      it('calcula totalVolume', () => {
        // 800 + 600 + 900 = 2300
        const stats = calculateSessionExerciseStats(sets, 'weight_reps')
        expect(stats.totalVolume).toBe(2300)
      })

      it('calcula totalSets', () => {
        const stats = calculateSessionExerciseStats(sets, 'weight_reps')
        expect(stats.totalSets).toBe(3)
      })

      it('no incluye métricas de tiempo/distancia', () => {
        const stats = calculateSessionExerciseStats(sets, 'weight_reps')
        expect(stats.bestTimeSeconds).toBeUndefined()
        expect(stats.bestDistanceMeters).toBeUndefined()
        expect(stats.bestPaceSeconds).toBeUndefined()
      })
    })

    describe('reps_only', () => {
      it('calcula solo bestReps', () => {
        const sets = [
          { reps_completed: 15 },
          { reps_completed: 12 },
          { reps_completed: 10 },
        ]
        const stats = calculateSessionExerciseStats(sets, 'reps_only')
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
        const stats = calculateSessionExerciseStats(sets, 'time')
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
        const stats = calculateSessionExerciseStats(sets, 'weight_time')
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
        const stats = calculateSessionExerciseStats(sets, 'distance')
        expect(stats.bestDistanceMeters).toBe(5000)
      })
    })

    describe('weight_distance', () => {
      it('calcula bestWeight y bestDistanceMeters', () => {
        const sets = [
          { weight: 40, distance_meters: 50 },
          { weight: 50, distance_meters: 30 },
        ]
        const stats = calculateSessionExerciseStats(sets, 'weight_distance')
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
        const stats = calculateSessionExerciseStats(sets, 'distance_time')
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
        const stats = calculateSessionExerciseStats(sets, 'distance_pace')
        expect(stats.bestDistanceMeters).toBe(10000)
        expect(stats.bestPaceSeconds).toBe(300) // menor = mejor
      })
    })

    describe('calories y level_calories', () => {
      it('retorna solo totalSets para calories', () => {
        const sets = [{ calories_burned: 150 }]
        const stats = calculateSessionExerciseStats(sets, 'calories')
        expect(stats.totalSets).toBe(1)
        expect(stats.bestWeight).toBeUndefined()
      })

      it('retorna solo totalSets para level_calories', () => {
        const sets = [{ level: 10, calories_burned: 200 }]
        const stats = calculateSessionExerciseStats(sets, 'level_calories')
        expect(stats.totalSets).toBe(1)
      })
    })

    describe('edge cases', () => {
      it('pone null si todos los pesos son 0', () => {
        const sets = [{ weight: 0, reps_completed: 10 }]
        const stats = calculateSessionExerciseStats(sets, 'weight_reps')
        expect(stats.bestWeight).toBeNull()
      })

      it('pone null si no hay reps', () => {
        const sets = [{ weight: 100 }]
        const stats = calculateSessionExerciseStats(sets, 'weight_reps')
        expect(stats.bestReps).toBeNull()
        expect(stats.best1rm).toBeNull()
      })

      it('pone null si todos los tiempos son 0', () => {
        const sets = [{ time_seconds: 0 }]
        const stats = calculateSessionExerciseStats(sets, 'time')
        expect(stats.bestTimeSeconds).toBeNull()
      })

      it('pone null para pace si no hay datos', () => {
        const sets = [{ distance_meters: 5000 }]
        const stats = calculateSessionExerciseStats(sets, 'distance_pace')
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

    it('no marca PR si previous no tiene el campo', () => {
      const current = { bestWeight: 100 }
      const previous = { bestReps: 10 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrWeight).toBe(false)
    })

    it('no marca PR si current no tiene el campo', () => {
      const current = { bestReps: 10 }
      const previous = { bestWeight: 100 }
      const { flags } = detectNewPersonalRecords(current, previous)
      expect(flags.isPrWeight).toBe(false)
    })

    it('weight_reps: 100×5 NO es PR de peso si antes hiciste 90×10 (1RM mayor)', () => {
      // 90×10 → 1RM=120, 100×5 → 1RM=117
      const current = { bestWeight: 100, bestReps: 5, best1rm: 117, totalVolume: 500 }
      const previous = { bestWeight: 90, bestReps: 10, best1rm: 120, totalVolume: 900 }
      const { flags, details } = detectNewPersonalRecords(current, previous, 'weight_reps')
      expect(flags.isPrWeight).toBe(false)
      expect(flags.isPr1rm).toBe(false) // 117 < 120
      expect(details).toHaveLength(0)
    })

    it('weight_reps: marca 1RM como PR pero NO peso', () => {
      // 100×8 → 1RM=127 vs 90×10 → 1RM=120
      const current = { bestWeight: 100, bestReps: 8, best1rm: 127, totalVolume: 800 }
      const previous = { bestWeight: 90, bestReps: 10, best1rm: 120, totalVolume: 900 }
      const { flags } = detectNewPersonalRecords(current, previous, 'weight_reps')
      expect(flags.isPrWeight).toBe(false) // filtrado para weight_reps
      expect(flags.isPr1rm).toBe(true)
    })

    it('weight_time: no dispara PRs (sin fórmula unificada)', () => {
      const current = { bestWeight: 30, bestTimeSeconds: 60 }
      const previous = { bestWeight: 25, bestTimeSeconds: 90 }
      const { flags, details } = detectNewPersonalRecords(current, previous, 'weight_time')
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
  })

  // ============================================
  // evaluateSetForPR (real-time)
  // ============================================

  describe('evaluateSetForPR', () => {
    it('retorna vacío si setData es null', () => {
      const { newRecords } = evaluateSetForPR(null, {}, { bestWeight: 100 }, 'weight_reps')
      expect(newRecords).toHaveLength(0)
    })

    it('retorna vacío si preSessionBests es null', () => {
      const { newRecords } = evaluateSetForPR({ weight: 110 }, {}, null, 'weight_reps')
      expect(newRecords).toHaveLength(0)
    })

    it('weight_reps: NO detecta PR de peso (solo 1RM/reps/volumen)', () => {
      const set = { weight: 110, reps_completed: 8 }
      const runningBests = {}
      const preBests = { bestWeight: 100, bestReps: 10, best1rm: 130 }

      const { newRecords } = evaluateSetForPR(set, runningBests, preBests, 'weight_reps')

      expect(newRecords.find(r => r.type === 'bestWeight')).toBeUndefined()
    })

    it('weight_time: no detecta PR (sin fórmula unificada)', () => {
      const set = { weight: 30, time_seconds: 60 }
      const preBests = { bestWeight: 25, bestTimeSeconds: 90 }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, 'weight_time')
      expect(newRecords).toHaveLength(0)
    })

    it('detecta PR de 1RM', () => {
      const set = { weight: 100, reps_completed: 10 } // 1RM = 133
      const runningBests = {}
      const preBests = { bestWeight: 100, best1rm: 120 }

      const { newRecords } = evaluateSetForPR(set, runningBests, preBests, 'weight_reps')

      const e1rmPR = newRecords.find(r => r.type === 'best1rm')
      expect(e1rmPR).toBeDefined()
      expect(e1rmPR.value).toBe(133)
    })

    it('no detecta PR si no supera pre-session ni running best', () => {
      const set = { weight: 80, reps_completed: 6 } // 1RM=96
      const runningBests = { best1rm: 130 }
      const preBests = { best1rm: 130 }

      const { newRecords } = evaluateSetForPR(set, runningBests, preBests, 'weight_reps')
      expect(newRecords).toHaveLength(0)
    })

    it('no detecta PR si pre-session best es 0 (primera sesión)', () => {
      const set = { weight: 100, reps_completed: 8 }
      const runningBests = {}
      const preBests = { best1rm: 0 }

      const { newRecords } = evaluateSetForPR(set, runningBests, preBests, 'weight_reps')
      expect(newRecords).toHaveLength(0)
    })

    it('detecta PR intra-sesión: set 3 supera set 1 que ya fue PR (1RM)', () => {
      const preBests = { best1rm: 120 }

      // Set 1: 100×8 → 1RM=127 — PR contra preSession (120)
      const set1 = { weight: 100, reps_completed: 8 }
      const result1 = evaluateSetForPR(set1, {}, preBests, 'weight_reps')
      expect(result1.newRecords.find(r => r.type === 'best1rm')).toBeDefined()

      // Set 3: 110×6 → 1RM=132 — PR contra running best (127)
      const set3 = { weight: 110, reps_completed: 6 }
      const result3 = evaluateSetForPR(set3, result1.updatedRunningBests, preBests, 'weight_reps')
      expect(result3.newRecords.find(r => r.type === 'best1rm')).toBeDefined()
      expect(result3.newRecords.find(r => r.type === 'best1rm').value).toBe(132)
    })

    it('no detecta PR si set no supera running best intra-sesión', () => {
      const preBests = { best1rm: 120 }

      // Set 1: 100×8 → 1RM=127 — PR
      const set1 = { weight: 100, reps_completed: 8 }
      const result1 = evaluateSetForPR(set1, {}, preBests, 'weight_reps')

      // Set 2: 95×8 → 1RM=120 — no supera running best (127)
      const set2 = { weight: 95, reps_completed: 8 }
      const result2 = evaluateSetForPR(set2, result1.updatedRunningBests, preBests, 'weight_reps')
      expect(result2.newRecords.find(r => r.type === 'best1rm')).toBeUndefined()
    })

    it('detecta PR de pace (menor = mejor)', () => {
      const set = { distance_meters: 5000, pace_seconds: 280 }
      const preBests = { bestDistanceMeters: 5000, bestPaceSeconds: 300 }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, 'distance_pace')
      expect(newRecords.find(r => r.type === 'bestPaceSeconds')).toBeDefined()
    })

    it('no detecta PR de pace si es peor (mayor)', () => {
      const set = { distance_meters: 5000, pace_seconds: 320 }
      const preBests = { bestDistanceMeters: 5000, bestPaceSeconds: 300 }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, 'distance_pace')
      expect(newRecords.find(r => r.type === 'bestPaceSeconds')).toBeUndefined()
    })

    it('detecta PR de reps para reps_only', () => {
      const set = { reps_completed: 20 }
      const preBests = { bestReps: 15 }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, 'reps_only')
      expect(newRecords.find(r => r.type === 'bestReps')).toBeDefined()
    })

    it('detecta PR de tiempo', () => {
      const set = { time_seconds: 120 }
      const preBests = { bestTimeSeconds: 90 }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, 'time')
      expect(newRecords.find(r => r.type === 'bestTimeSeconds')).toBeDefined()
    })

    it('detecta PR de distancia', () => {
      const set = { distance_meters: 6000 }
      const preBests = { bestDistanceMeters: 5000 }

      const { newRecords } = evaluateSetForPR(set, {}, preBests, 'distance')
      expect(newRecords.find(r => r.type === 'bestDistanceMeters')).toBeDefined()
    })

    it('no evalúa métricas irrelevantes para el tipo', () => {
      const set = { weight: 100, reps_completed: 10, time_seconds: 60 }
      const preBests = { bestTimeSeconds: 30 } // sería PR, pero weight_reps no trackea time

      const { newRecords } = evaluateSetForPR(set, {}, preBests, 'weight_reps')
      expect(newRecords.find(r => r.type === 'bestTimeSeconds')).toBeUndefined()
    })

    it('actualiza running bests aunque no haya PR', () => {
      const set = { weight: 80, reps_completed: 10 } // 1RM=107
      const preBests = { best1rm: 130 }

      const { updatedRunningBests } = evaluateSetForPR(set, {}, preBests, 'weight_reps')
      expect(updatedRunningBests.best1rm).toBe(107)
    })
  })

  // ============================================
  // recalculatePRFlags
  // ============================================

  describe('recalculatePRFlags', () => {
    it('retorna vacío para array vacío', () => {
      expect(recalculatePRFlags([])).toEqual([])
    })

    it('retorna vacío si es null', () => {
      expect(recalculatePRFlags(null)).toEqual([])
    })

    it('primera sesión siempre tiene flags false', () => {
      const sessions = [
        { sessionId: 's1', exerciseId: 'e1', bestWeight: 100, bestReps: 10, best1rm: 133 },
      ]
      const results = recalculatePRFlags(sessions)
      expect(results[0].isPrWeight).toBe(false)
      expect(results[0].isPrReps).toBe(false)
      expect(results[0].isPr1rm).toBe(false)
    })

    it('segunda sesión marca PRs correctamente', () => {
      const sessions = [
        { sessionId: 's1', exerciseId: 'e1', bestWeight: 100, bestReps: 10 },
        { sessionId: 's2', exerciseId: 'e1', bestWeight: 110, bestReps: 8 },
      ]
      const results = recalculatePRFlags(sessions)
      expect(results[1].isPrWeight).toBe(true)
      expect(results[1].isPrReps).toBe(false) // 8 < 10
    })

    it('recalcula correctamente después de borrar sesión intermedia', () => {
      // Original: s1(100), s2(110), s3(105)
      // s2 borrado: s1(100), s3(105) → s3 ahora es PR de peso
      const sessionsAfterDelete = [
        { sessionId: 's1', exerciseId: 'e1', bestWeight: 100 },
        { sessionId: 's3', exerciseId: 'e1', bestWeight: 105 },
      ]
      const results = recalculatePRFlags(sessionsAfterDelete)
      expect(results[0].isPrWeight).toBe(false) // primera
      expect(results[1].isPrWeight).toBe(true)  // 105 > 100
    })

    it('maneja PRs progresivos', () => {
      const sessions = [
        { sessionId: 's1', exerciseId: 'e1', bestWeight: 80 },
        { sessionId: 's2', exerciseId: 'e1', bestWeight: 90 },
        { sessionId: 's3', exerciseId: 'e1', bestWeight: 100 },
        { sessionId: 's4', exerciseId: 'e1', bestWeight: 95 },
      ]
      const results = recalculatePRFlags(sessions)
      expect(results[0].isPrWeight).toBe(false) // primera
      expect(results[1].isPrWeight).toBe(true)  // 90 > 80
      expect(results[2].isPrWeight).toBe(true)  // 100 > 90
      expect(results[3].isPrWeight).toBe(false) // 95 < 100
    })

    it('maneja PR de pace (menor = mejor)', () => {
      const sessions = [
        { sessionId: 's1', exerciseId: 'e1', bestPaceSeconds: 350 },
        { sessionId: 's2', exerciseId: 'e1', bestPaceSeconds: 320 },
        { sessionId: 's3', exerciseId: 'e1', bestPaceSeconds: 330 },
      ]
      const results = recalculatePRFlags(sessions)
      expect(results[0].isPrPace).toBe(false) // primera
      expect(results[1].isPrPace).toBe(true)  // 320 < 350
      expect(results[2].isPrPace).toBe(false) // 330 > 320
    })

    it('no marca PR si campo es null', () => {
      const sessions = [
        { sessionId: 's1', exerciseId: 'e1', bestWeight: 100 },
        { sessionId: 's2', exerciseId: 'e1', bestWeight: null },
      ]
      const results = recalculatePRFlags(sessions)
      expect(results[1].isPrWeight).toBe(false)
    })

    it('preserva sessionId y exerciseId en resultados', () => {
      const sessions = [
        { sessionId: 'abc', exerciseId: 'xyz', bestWeight: 100 },
      ]
      const results = recalculatePRFlags(sessions)
      expect(results[0].sessionId).toBe('abc')
      expect(results[0].exerciseId).toBe('xyz')
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
  })
})
