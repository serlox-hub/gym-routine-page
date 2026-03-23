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
  })
})
