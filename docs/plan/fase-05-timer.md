# Fase 5: Timer de Descanso

## Objetivos
1. Implementar RestTimer con countdown visual
2. Auto-iniciar al completar serie
3. Alertas sonoras/vibración al terminar
4. Controles: saltar, +30s, -30s

---

## Hook useRestTimer

### src/features/workout-session/hooks/useRestTimer.js
```javascript
import { useEffect, useRef } from 'react'
import { useWorkoutStore } from '../store/workoutSessionStore'
import useSound from 'use-sound'

export function useRestTimer() {
  const {
    restTimerActive,
    restTimeRemaining,
    tickTimer,
    skipRest
  } = useWorkoutStore()

  const intervalRef = useRef(null)
  const [playBeep] = useSound('/sounds/beep.mp3')
  const [playDone] = useSound('/sounds/done.mp3')

  useEffect(() => {
    if (restTimerActive && restTimeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        tickTimer()
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [restTimerActive, tickTimer])

  // Alerta cuando quedan 10 segundos
  useEffect(() => {
    if (restTimeRemaining === 10) {
      playBeep()
    }
  }, [restTimeRemaining, playBeep])

  // Alerta cuando termina
  useEffect(() => {
    if (restTimerActive && restTimeRemaining === 0) {
      playDone()
      // Vibración si está disponible
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
    }
  }, [restTimerActive, restTimeRemaining, playDone])

  return {
    isActive: restTimerActive,
    timeRemaining: restTimeRemaining,
    skip: skipRest
  }
}
```

---

## Componente RestTimer

### src/features/workout-session/components/RestTimer.jsx
```javascript
import { useWorkoutStore } from '../store/workoutSessionStore'
import { useRestTimer } from '../hooks/useRestTimer'

export function RestTimer() {
  const { restTimeRemaining, skipRest, startRestTimer } = useWorkoutStore()
  const { isActive } = useRestTimer()

  const minutes = Math.floor(restTimeRemaining / 60)
  const seconds = restTimeRemaining % 60
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Calcular porcentaje para barra de progreso
  const initialTime = useWorkoutStore.getState().exercises[
    useWorkoutStore.getState().currentExerciseIndex
  ]?.descanso || 120

  const progress = ((initialTime - restTimeRemaining) / initialTime) * 100

  const addTime = (delta) => {
    const newTime = Math.max(0, restTimeRemaining + delta)
    // Actualizar el tiempo directamente
    useWorkoutStore.setState({ restTimeRemaining: newTime })
  }

  if (!isActive) return null

  return (
    <div className="fixed inset-0 bg-bg-primary/95 flex flex-col items-center justify-center z-50">
      {/* Título */}
      <h2 className="text-2xl text-text-secondary mb-8">DESCANSO</h2>

      {/* Tiempo */}
      <div className="text-8xl font-bold mb-4">{timeDisplay}</div>

      {/* Barra de progreso */}
      <div className="w-64 h-2 bg-bg-tertiary rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controles */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => addTime(-30)}
          className="px-6 py-3 bg-bg-secondary rounded-lg text-lg"
        >
          -30s
        </button>

        <button
          onClick={skipRest}
          className="px-8 py-3 bg-accent text-bg-primary rounded-lg text-lg font-bold"
        >
          SALTAR
        </button>

        <button
          onClick={() => addTime(30)}
          className="px-6 py-3 bg-bg-secondary rounded-lg text-lg"
        >
          +30s
        </button>
      </div>

      {/* Info siguiente ejercicio */}
      <NextExercisePreview />
    </div>
  )
}

function NextExercisePreview() {
  const { exercises, currentExerciseIndex, completedSets } = useWorkoutStore()
  const currentExercise = exercises[currentExerciseIndex]
  const setsCompleted = completedSets[currentExercise?.id]?.length || 0
  const totalSets = currentExercise?.series || 0

  const isLastSet = setsCompleted >= totalSets
  const nextExercise = isLastSet
    ? exercises[currentExerciseIndex + 1]
    : null

  if (nextExercise) {
    return (
      <div className="text-center text-text-secondary">
        <p className="text-sm">Siguiente ejercicio:</p>
        <p className="text-lg text-text-primary">
          {nextExercise.nombre} ({nextExercise.series}×{nextExercise.reps})
        </p>
      </div>
    )
  }

  return (
    <div className="text-center text-text-secondary">
      <p className="text-sm">Siguiente serie:</p>
      <p className="text-lg text-text-primary">
        Serie {setsCompleted + 1} de {totalSets}
      </p>
    </div>
  )
}
```

---

## Estilos del Timer

```css
/* Animación de pulso cuando queda poco tiempo */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.timer-warning {
  animation: pulse 1s infinite;
  color: var(--accent-orange);
}

.timer-critical {
  animation: pulse 0.5s infinite;
  color: var(--accent-red);
}
```

### Con clases condicionales
```javascript
const timerClass = restTimeRemaining <= 5
  ? 'timer-critical'
  : restTimeRemaining <= 10
  ? 'timer-warning'
  : ''
```

---

## Archivos de Sonido

Crear o descargar sonidos simples:
- `/public/sounds/beep.mp3` - Beep corto para aviso 10s
- `/public/sounds/done.mp3` - Sonido de finalización

---

## Mini-Timer (siempre visible)

Para cuando el usuario quiere ver datos mientras descansa:

```javascript
// src/features/workout-session/components/MiniTimer.jsx
export function MiniTimer({ onExpand }) {
  const { restTimeRemaining, restTimerActive } = useWorkoutStore()

  if (!restTimerActive) return null

  const minutes = Math.floor(restTimeRemaining / 60)
  const seconds = restTimeRemaining % 60

  return (
    <button
      onClick={onExpand}
      className="fixed top-4 right-4 bg-accent px-4 py-2 rounded-full font-mono font-bold z-40"
    >
      {minutes}:{seconds.toString().padStart(2, '0')}
    </button>
  )
}
```

---

## Tareas

- [ ] Crear hook useRestTimer con interval
- [ ] Integrar use-sound para alertas
- [ ] Implementar vibración
- [ ] Crear componente RestTimer (overlay)
- [ ] Barra de progreso visual
- [ ] Controles +30s, -30s, Saltar
- [ ] Preview del siguiente ejercicio/serie
- [ ] Animaciones para tiempos críticos
- [ ] Mini-timer opcional
- [ ] Añadir archivos de sonido
