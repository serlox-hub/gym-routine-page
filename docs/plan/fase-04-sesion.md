# Fase 4: Sesión de Entrenamiento

## Objetivos
1. Implementar WorkoutSessionView y ActiveExercise
2. Crear SetTracker (inputs peso/reps + checkbox completar)
3. Integrar guardado en Supabase al completar serie

---

## Flujo de Sesión

```
1. Usuario pulsa "Iniciar Entrenamiento" en DayCard
   ↓
2. Navega a /workout/:dayId
   ↓
3. Se crea workout_session en Supabase (status: 'in_progress')
   ↓
4. Se muestra el primer ejercicio del día
   ↓
5. Usuario completa series una a una
   ↓
6. Al completar todas las series → siguiente ejercicio
   ↓
7. Al completar todo → marcar sesión como 'completed'
```

---

## Zustand Store

### src/features/workout-session/store/workoutSessionStore.js
```javascript
import { create } from 'zustand'

export const useWorkoutStore = create((set, get) => ({
  // Estado de la sesión
  sessionId: null,
  dayId: null,
  exercises: [],
  currentExerciseIndex: 0,

  // Sets completados (local antes de guardar)
  completedSets: {}, // { [routineExerciseId]: [{ setNumber, weight, reps, rir, notes }] }

  // Timer
  restTimerActive: false,
  restTimeRemaining: 0,

  // Acciones
  startSession: async (dayId, exercises) => {
    // Crear sesión en Supabase
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({ routine_day_id: dayId })
      .select()
      .single()

    if (!error) {
      set({
        sessionId: data.id,
        dayId,
        exercises,
        currentExerciseIndex: 0,
        completedSets: {}
      })
    }
  },

  completeSet: async (routineExerciseId, exerciseId, setData) => {
    const { sessionId, completedSets } = get()

    // Guardar en Supabase
    await supabase.from('completed_sets').insert({
      session_id: sessionId,
      routine_exercise_id: routineExerciseId,
      exercise_id: exerciseId,
      set_number: setData.setNumber,
      weight: setData.weight,
      reps_completed: setData.reps,
      rir_actual: setData.rir,
      completed: true,
      notas: setData.notes
    })

    // Actualizar estado local
    const exerciseSets = completedSets[routineExerciseId] || []
    set({
      completedSets: {
        ...completedSets,
        [routineExerciseId]: [...exerciseSets, setData]
      }
    })
  },

  nextExercise: () => {
    const { currentExerciseIndex, exercises } = get()
    if (currentExerciseIndex < exercises.length - 1) {
      set({ currentExerciseIndex: currentExerciseIndex + 1 })
    }
  },

  prevExercise: () => {
    const { currentExerciseIndex } = get()
    if (currentExerciseIndex > 0) {
      set({ currentExerciseIndex: currentExerciseIndex - 1 })
    }
  },

  finishSession: async () => {
    const { sessionId } = get()

    await supabase
      .from('workout_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    set({
      sessionId: null,
      dayId: null,
      exercises: [],
      currentExerciseIndex: 0,
      completedSets: {}
    })
  },

  // Timer
  startRestTimer: (seconds) => {
    set({ restTimerActive: true, restTimeRemaining: seconds })
  },

  tickTimer: () => {
    const { restTimeRemaining } = get()
    if (restTimeRemaining > 0) {
      set({ restTimeRemaining: restTimeRemaining - 1 })
    } else {
      set({ restTimerActive: false })
    }
  },

  skipRest: () => {
    set({ restTimerActive: false, restTimeRemaining: 0 })
  }
}))
```

---

## Componentes

### WorkoutSessionView
```javascript
// src/features/workout-session/components/WorkoutSessionView.jsx
import { useWorkoutStore } from '../store/workoutSessionStore'
import { ActiveExercise } from './ActiveExercise'
import { RestTimer } from './RestTimer'

export function WorkoutSessionView() {
  const {
    exercises,
    currentExerciseIndex,
    restTimerActive
  } = useWorkoutStore()

  const currentExercise = exercises[currentExerciseIndex]
  const progress = `${currentExerciseIndex + 1}/${exercises.length}`

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="p-4 border-b border-border flex justify-between items-center">
        <button className="text-accent">← Salir</button>
        <span className="text-text-secondary">Ejercicio {progress}</span>
      </header>

      {/* Ejercicio actual */}
      <ActiveExercise exercise={currentExercise} />

      {/* Timer overlay */}
      {restTimerActive && <RestTimer />}
    </div>
  )
}
```

### ActiveExercise
```javascript
// src/features/workout-session/components/ActiveExercise.jsx
import { useState } from 'react'
import { useWorkoutStore } from '../store/workoutSessionStore'
import { SetTracker } from './SetTracker'

export function ActiveExercise({ exercise }) {
  const { completedSets, nextExercise, prevExercise } = useWorkoutStore()
  const exerciseSets = completedSets[exercise.id] || []
  const currentSetNumber = exerciseSets.length + 1
  const allSetsCompleted = exerciseSets.length >= exercise.series

  return (
    <div className="p-4">
      {/* Info del ejercicio */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{exercise.nombre}</h1>
        <p className="text-accent-green">{exercise.musculoPrincipal}</p>

        <div className="flex gap-2 mt-2">
          <span className="px-2 py-1 bg-bg-secondary rounded text-sm">
            {exercise.equipamiento}
          </span>
          {exercise.agarre && (
            <span className="px-2 py-1 bg-bg-secondary rounded text-sm">
              {exercise.agarre}
            </span>
          )}
        </div>
      </div>

      {/* Series completadas */}
      <div className="mb-6">
        <h3 className="text-sm text-text-secondary mb-2">Series completadas</h3>
        <div className="flex gap-2">
          {Array.from({ length: exercise.series }).map((_, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                i < exerciseSets.length
                  ? 'bg-accent-green text-bg-primary'
                  : i === exerciseSets.length
                  ? 'border-2 border-accent'
                  : 'bg-bg-tertiary text-text-muted'
              }`}
            >
              {i < exerciseSets.length ? '✓' : i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Tracker de serie actual o completado */}
      {allSetsCompleted ? (
        <div className="text-center py-8">
          <p className="text-accent-green text-xl mb-4">
            ¡Ejercicio completado!
          </p>
          <button
            onClick={nextExercise}
            className="px-6 py-3 bg-accent text-bg-primary rounded-lg font-bold"
          >
            Siguiente ejercicio →
          </button>
        </div>
      ) : (
        <SetTracker
          exercise={exercise}
          setNumber={currentSetNumber}
        />
      )}

      {/* Navegación swipe */}
      <div className="fixed bottom-20 left-0 right-0 flex justify-between px-4">
        <button
          onClick={prevExercise}
          className="p-3 bg-bg-secondary rounded-full"
        >
          ← Anterior
        </button>
        <button
          onClick={nextExercise}
          className="p-3 bg-bg-secondary rounded-full"
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
```

### SetTracker
```javascript
// src/features/workout-session/components/SetTracker.jsx
import { useState } from 'react'
import { useWorkoutStore } from '../store/workoutSessionStore'

export function SetTracker({ exercise, setNumber }) {
  const { completeSet, startRestTimer } = useWorkoutStore()

  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  const handleComplete = async () => {
    await completeSet(exercise.id, exercise.exerciseId, {
      setNumber,
      weight: parseFloat(weight) || 0,
      reps: parseInt(reps) || 0,
      rir: null,
      notes: null
    })

    // Iniciar timer de descanso
    startRestTimer(exercise.descanso)

    // Limpiar inputs
    setWeight('')
    setReps('')
  }

  const adjustWeight = (delta) => {
    const current = parseFloat(weight) || 0
    setWeight(Math.max(0, current + delta).toString())
  }

  const adjustReps = (delta) => {
    const current = parseInt(reps) || 0
    setReps(Math.max(0, current + delta).toString())
  }

  return (
    <div className="bg-bg-secondary rounded-lg p-4">
      <h3 className="text-center text-lg mb-4">
        Serie {setNumber} de {exercise.series}
      </h3>

      {/* Objetivo */}
      <p className="text-center text-text-secondary mb-4">
        Objetivo: {exercise.reps} reps | RIR {exercise.rir}
      </p>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Peso */}
        <div>
          <label className="block text-sm text-text-secondary mb-2 text-center">
            Peso (kg)
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustWeight(-2.5)}
              className="w-12 h-12 bg-bg-tertiary rounded-lg text-xl"
            >
              -
            </button>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="flex-1 h-12 bg-bg-tertiary rounded-lg text-center text-xl"
              placeholder="0"
            />
            <button
              onClick={() => adjustWeight(2.5)}
              className="w-12 h-12 bg-bg-tertiary rounded-lg text-xl"
            >
              +
            </button>
          </div>
        </div>

        {/* Reps */}
        <div>
          <label className="block text-sm text-text-secondary mb-2 text-center">
            Reps
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustReps(-1)}
              className="w-12 h-12 bg-bg-tertiary rounded-lg text-xl"
            >
              -
            </button>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="flex-1 h-12 bg-bg-tertiary rounded-lg text-center text-xl"
              placeholder="0"
            />
            <button
              onClick={() => adjustReps(1)}
              className="w-12 h-12 bg-bg-tertiary rounded-lg text-xl"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Botón completar */}
      <button
        onClick={handleComplete}
        disabled={!weight || !reps}
        className="w-full py-4 bg-accent-green text-bg-primary rounded-lg font-bold text-lg disabled:opacity-50"
      >
        ✓ Serie Completada
      </button>

      {/* Acciones secundarias */}
      <div className="flex justify-center gap-4 mt-4">
        <button className="text-accent text-sm">+ Nota</button>
        <button className="text-text-secondary text-sm">Info</button>
      </div>
    </div>
  )
}
```

---

## Tareas

- [ ] Crear store Zustand para sesión
- [ ] Implementar startSession (crear en Supabase)
- [ ] Implementar completeSet (guardar serie)
- [ ] Implementar finishSession
- [ ] Crear WorkoutSessionView
- [ ] Crear ActiveExercise
- [ ] Crear SetTracker con inputs peso/reps
- [ ] Botones +/- para ajustar valores
- [ ] Validación antes de completar serie
- [ ] Navegación entre ejercicios
- [ ] Indicador de progreso (serie X de Y)
