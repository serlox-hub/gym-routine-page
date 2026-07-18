import { describe, it, expect } from 'vitest'
import {
  formatDurationHumanReadable,
  calculateSessionTotalVolume,
  calculateSessionTotalSets,
  buildWorkoutSummaryFromEndSession,
  buildWorkoutSummaryFromSession,
} from './workoutSummary.js'

describe('workoutSummary', () => {
  describe('formatDurationHumanReadable', () => {
    it('retorna "< 1 min" para 0 o null', () => {
      expect(formatDurationHumanReadable(0)).toBe('< 1 min')
      expect(formatDurationHumanReadable(null)).toBe('< 1 min')
      expect(formatDurationHumanReadable(undefined)).toBe('< 1 min')
    })

    it('formatea solo minutos', () => {
      expect(formatDurationHumanReadable(45)).toBe('45 min')
    })

    it('formatea solo horas', () => {
      expect(formatDurationHumanReadable(60)).toBe('1h')
      expect(formatDurationHumanReadable(120)).toBe('2h')
    })

    it('formatea horas y minutos', () => {
      expect(formatDurationHumanReadable(65)).toBe('1h 05min')
      expect(formatDurationHumanReadable(90)).toBe('1h 30min')
      expect(formatDurationHumanReadable(125)).toBe('2h 05min')
    })
  })

  describe('calculateSessionTotalVolume', () => {
    it('retorna 0 para array vacío', () => {
      expect(calculateSessionTotalVolume([])).toBe(0)
      expect(calculateSessionTotalVolume(null)).toBe(0)
    })

    it('suma volumen de sets con peso y reps', () => {
      const exercises = [
        {
          sets: [
            { weight: 80, reps_completed: 10 },
            { weight: 80, reps_completed: 8 },
          ],
        },
        {
          sets: [{ reps_completed: 20 }],
        },
      ]
      expect(calculateSessionTotalVolume(exercises)).toBe(80 * 10 + 80 * 8)
    })

    it('ignora sets sin peso o sin reps', () => {
      const exercises = [
        {
          sets: [{ weight: 50, reps_completed: 0 }],
        },
        {
          sets: [{ weight: 0, reps_completed: 10 }],
        },
      ]
      expect(calculateSessionTotalVolume(exercises)).toBe(0)
    })
  })

  describe('calculateSessionTotalSets', () => {
    it('retorna 0 para array vacío', () => {
      expect(calculateSessionTotalSets([])).toBe(0)
    })

    it('suma sets de todos los ejercicios', () => {
      const exercises = [
        { sets: [{}, {}, {}] },
        { sets: [{}, {}] },
      ]
      expect(calculateSessionTotalSets(exercises)).toBe(5)
    })
  })

  describe('buildWorkoutSummaryFromEndSession', () => {
    const session = {
      day_name: 'Push Day',
      routine_name: 'PPL',
      started_at: '2026-03-23T10:00:00Z',
      duration_minutes: 65,
    }

    const sessionExercises = [
      {
        id: 'se-1',
        exercises: { id: 1, name: 'Press banca', measurement_type: 'weight_reps' },
      },
      {
        id: 'se-2',
        exercises: { id: 2, name: 'Dominadas', measurement_type: 'reps_only' },
      },
    ]

    const completedSets = {
      'se-1-1': { sessionExerciseId: 'se-1', weight: 80, repsCompleted: 10, setNumber: 1 },
      'se-1-2': { sessionExerciseId: 'se-1', weight: 80, repsCompleted: 8, setNumber: 2 },
      'se-2-1': { sessionExerciseId: 'se-2', repsCompleted: 12, setNumber: 1 },
    }

    const detectedPRs = [
      {
        exerciseId: 1,
        exerciseName: 'Press banca',
        details: [{ type: 'weight', label: 'Peso', newValue: 80, unit: 'kg', oldValue: 75, improvement: 7 }],
      },
    ]

    it('construye resumen completo', () => {
      const summary = buildWorkoutSummaryFromEndSession(session, detectedPRs, completedSets, sessionExercises)

      expect(summary.dayName).toBe('Push Day')
      expect(summary.routineName).toBe('PPL')
      expect(summary.durationMinutes).toBe(65)
      expect(summary.durationFormatted).toBe('1h 05min')
      expect(summary.totalExercises).toBe(2)
      expect(summary.totalSetsCompleted).toBe(3)
      expect(summary.totalVolumeKg).toBe(80 * 10 + 80 * 8)
      expect(summary.exercises).toHaveLength(2)
      expect(summary.exercises[0].name).toBe('Press banca')
      expect(summary.exercises[0].hasPR).toBe(true)
      expect(summary.exercises[1].hasPR).toBe(false)
      expect(summary.prs).toHaveLength(1)
      expect(summary.prs[0].exerciseName).toBe('Press banca')
    })

    it('usa "Entrenamiento Libre" si no hay day_name', () => {
      const summary = buildWorkoutSummaryFromEndSession(
        { ...session, day_name: null, routine_name: null },
        [], {}, []
      )
      expect(summary.dayName).toBe('Entrenamiento Libre')
      expect(summary.routineName).toBeNull()
    })

    it('ignora ejercicios sin sets completados', () => {
      const summary = buildWorkoutSummaryFromEndSession(session, [], {}, sessionExercises)
      expect(summary.totalExercises).toBe(0)
      expect(summary.totalSetsCompleted).toBe(0)
    })

    // issue #11: la mejor serie de cardio LEVEL_CALORIES debe mostrar nivel y calorías
    it('formatea la mejor serie con level y calorías (tipo level_calories)', () => {
      const cardioExercises = [
        { id: 'se-3', exercises: { id: 3, name: 'Elíptica', measurement_type: 'level_calories' } },
      ]
      const cardioSets = {
        'se-3-1': { sessionExerciseId: 'se-3', level: 8, caloriesBurned: 120, setNumber: 1 },
      }
      const summary = buildWorkoutSummaryFromEndSession(session, [], cardioSets, cardioExercises)
      expect(summary.exercises).toHaveLength(1)
      expect(summary.exercises[0].bestSet).toContain('120kcal')
      expect(summary.exercises[0].bestSet).toContain('Nv8')
    })
  })

  describe('buildWorkoutSummaryFromSession', () => {
    const session = {
      day_name: 'Pierna',
      routine_name: 'Full Body',
      started_at: '2026-03-20T09:00:00Z',
      duration_minutes: 50,
      exercises: [
        {
          sessionExerciseId: 'se-1',
          exercise: { id: 1, name: 'Sentadilla', measurement_type: 'weight_reps' },
          sets: [
            { weight: 100, reps_completed: 8, set_number: 1 },
            { weight: 100, reps_completed: 6, set_number: 2 },
          ],
        },
      ],
    }

    const sessionPRs = [
      {
        exercise_id: 1,
        is_pr_weight: true,
        is_pr_reps: false,
        is_pr_1rm: true,
        is_pr_volume: false,
        is_pr_time: false,
        is_pr_distance: false,
        is_pr_pace: false,
        best_weight: 100,
        best_1rm: 127,
      },
    ]

    it('construye resumen desde session detail', () => {
      const summary = buildWorkoutSummaryFromSession(session, sessionPRs)

      expect(summary.dayName).toBe('Pierna')
      expect(summary.routineName).toBe('Full Body')
      expect(summary.durationFormatted).toBe('50 min')
      expect(summary.totalExercises).toBe(1)
      expect(summary.totalSetsCompleted).toBe(2)
      expect(summary.totalVolumeKg).toBe(100 * 8 + 100 * 6)
      expect(summary.exercises[0].hasPR).toBe(true)
      expect(summary.prs).toHaveLength(1)
      expect(summary.prs[0].details).toHaveLength(2) // weight + 1rm
    })

    it('retorna null si no hay session', () => {
      expect(buildWorkoutSummaryFromSession(null, [])).toBeNull()
    })

    it('funciona sin PRs', () => {
      const summary = buildWorkoutSummaryFromSession(session, [])
      expect(summary.prs).toHaveLength(0)
      expect(summary.exercises[0].hasPR).toBe(false)
    })

    it('details llevan type/oldValue cuando se pasa previousBests', () => {
      const previousBests = { 1: { bestWeight: 90, best1rm: 117 } }
      const summary = buildWorkoutSummaryFromSession(session, sessionPRs, { previousBests })
      const weight = summary.prs[0].details.find(d => d.type === 'bestWeight')
      const onerm = summary.prs[0].details.find(d => d.type === 'best1rm')
      expect(weight).toMatchObject({ type: 'bestWeight', newValue: 100, oldValue: 90, unit: 'kg' })
      expect(onerm).toMatchObject({ type: 'best1rm', newValue: 127, oldValue: 117, unit: 'kg' })
    })

    it('details de pr_rep_counts generan registros tipo repPR con repCount y oldValue', () => {
      const sessionPRsWithRepPR = [{
        ...sessionPRs[0],
        pr_rep_counts: [5, 8],
        best_per_reps: { '5': 100, '8': 80 },
      }]
      const previousBests = {
        1: { bestWeight: 90, best1rm: 117, bestPerReps: { '5': 95, '8': null } },
      }
      const summary = buildWorkoutSummaryFromSession(session, sessionPRsWithRepPR, { previousBests })
      const repPRs = summary.prs[0].details.filter(d => d.type === 'repPR')
      expect(repPRs).toHaveLength(2)
      const at5 = repPRs.find(r => r.repCount === 5)
      const at8 = repPRs.find(r => r.repCount === 8)
      expect(at5).toMatchObject({ type: 'repPR', repCount: 5, newValue: 100, oldValue: 95 })
      expect(at8).toMatchObject({ type: 'repPR', repCount: 8, newValue: 80, oldValue: null })
    })

    it('oldValue de rep-PR usa el envelope (mejor peso a N reps o más), no solo el rep count exacto', () => {
      const sessionPRsWithRepPR = [{
        ...sessionPRs[0],
        pr_rep_counts: [8],
        best_per_reps: { '8': 100 },
      }]
      const previousBests = {
        // A 8 reps el previo exacto es 90, pero a 10 reps se hizo 95 → domina 8 reps
        1: { bestWeight: 90, best1rm: 117, bestPerReps: { '8': 90, '10': 95 } },
      }
      const summary = buildWorkoutSummaryFromSession(session, sessionPRsWithRepPR, { previousBests })
      const at8 = summary.prs[0].details.find(d => d.type === 'repPR' && d.repCount === 8)
      expect(at8).toMatchObject({ type: 'repPR', repCount: 8, newValue: 100, oldValue: 95 })
    })

    it('oldValue queda null si previousBests no se pasa', () => {
      const summary = buildWorkoutSummaryFromSession(session, sessionPRs)
      expect(summary.prs[0].details[0].oldValue).toBeNull()
    })

    it('incluye ejercicio con solo rep-PR (sin ningún is_pr_*) — regresión share desde histórico', () => {
      const sessionPRsRepOnly = [{
        exercise_id: 1,
        is_pr_weight: false,
        is_pr_reps: false,
        is_pr_1rm: false,
        is_pr_volume: false,
        is_pr_time: false,
        is_pr_distance: false,
        is_pr_pace: false,
        pr_rep_counts: [13],
        best_per_reps: { '13': 10 },
      }]
      const previousBests = { 1: { bestPerReps: { '13': 8 } } }
      const summary = buildWorkoutSummaryFromSession(session, sessionPRsRepOnly, { previousBests })
      expect(summary.prs).toHaveLength(1)
      const repPR = summary.prs[0].details.find(d => d.type === 'repPR')
      expect(repPR).toMatchObject({ type: 'repPR', repCount: 13, newValue: 10, oldValue: 8 })
    })
  })
})
