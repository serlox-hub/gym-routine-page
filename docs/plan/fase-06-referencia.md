# Fase 6: Referencia de Sesión Anterior

## Objetivos
1. Query para obtener último entrenamiento del ejercicio
2. Componente PreviousWorkout con datos anteriores
3. Indicadores visuales (mejor/peor que antes)

---

## Query Supabase

### Último entrenamiento de un ejercicio
```javascript
// src/features/workout-session/hooks/usePreviousWorkout.js
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase/client'

export function usePreviousWorkout(exerciseId) {
  return useQuery({
    queryKey: ['previousWorkout', exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('completed_sets')
        .select(`
          set_number,
          weight,
          reps_completed,
          rir_actual,
          notas,
          performed_at,
          workout_sessions!inner (
            started_at,
            status
          )
        `)
        .eq('exercise_id', exerciseId)
        .eq('workout_sessions.status', 'completed')
        .order('performed_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Agrupar por sesión y tomar solo la más reciente
      if (!data || data.length === 0) return null

      const lastSessionDate = data[0].workout_sessions.started_at
      const lastSessionSets = data.filter(
        set => set.workout_sessions.started_at === lastSessionDate
      )

      return {
        date: lastSessionDate,
        sets: lastSessionSets.map(set => ({
          setNumber: set.set_number,
          weight: set.weight,
          reps: set.reps_completed,
          rir: set.rir_actual,
          notes: set.notas
        }))
      }
    },
    enabled: !!exerciseId,
    staleTime: 1000 * 60 * 10 // 10 minutos
  })
}
```

---

## Componente PreviousWorkout

### src/features/workout-session/components/PreviousWorkout.jsx
```javascript
import { usePreviousWorkout } from '../hooks/usePreviousWorkout'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function PreviousWorkout({ exerciseId }) {
  const { data: previous, isLoading } = usePreviousWorkout(exerciseId)

  if (isLoading) {
    return (
      <div className="bg-bg-secondary rounded-lg p-3 animate-pulse">
        <div className="h-4 bg-bg-tertiary rounded w-24 mb-2"></div>
        <div className="h-6 bg-bg-tertiary rounded w-full"></div>
      </div>
    )
  }

  if (!previous) {
    return (
      <div className="bg-bg-secondary rounded-lg p-3 text-text-muted text-sm">
        Primera vez haciendo este ejercicio
      </div>
    )
  }

  const dateStr = formatDistanceToNow(new Date(previous.date), {
    addSuffix: true,
    locale: es
  })

  return (
    <div className="bg-bg-secondary rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm text-text-secondary">Sesión anterior</h4>
        <span className="text-xs text-text-muted">{dateStr}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {previous.sets.map((set, index) => (
          <div
            key={index}
            className="flex-shrink-0 bg-bg-tertiary rounded px-3 py-2 text-center min-w-[70px]"
          >
            <div className="text-xs text-text-muted">S{set.setNumber}</div>
            <div className="font-bold">{set.weight}kg</div>
            <div className="text-sm text-text-secondary">×{set.reps}</div>
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div className="mt-2 text-xs text-text-muted">
        Max: {Math.max(...previous.sets.map(s => s.weight))}kg |
        Total: {previous.sets.reduce((acc, s) => acc + s.weight * s.reps, 0).toFixed(0)}kg vol
      </div>
    </div>
  )
}
```

---

## Indicadores de Comparación

### src/features/workout-session/components/ComparisonIndicator.jsx
```javascript
export function ComparisonIndicator({ current, previous, type = 'weight' }) {
  if (!previous) return null

  const diff = current - previous
  const percentChange = ((diff / previous) * 100).toFixed(1)

  if (diff === 0) {
    return (
      <span className="text-text-muted text-xs">= igual</span>
    )
  }

  const isImprovement = type === 'weight' ? diff > 0 : diff > 0
  const color = isImprovement ? 'text-accent-green' : 'text-accent-red'
  const arrow = diff > 0 ? '↑' : '↓'

  return (
    <span className={`text-xs ${color}`}>
      {arrow} {Math.abs(diff)}{type === 'weight' ? 'kg' : ''} ({percentChange}%)
    </span>
  )
}
```

### Uso en SetTracker
```javascript
// Dentro de SetTracker
const { data: previous } = usePreviousWorkout(exercise.exerciseId)
const previousSet = previous?.sets.find(s => s.setNumber === setNumber)

return (
  <div>
    {/* Input de peso */}
    <input value={weight} ... />

    {/* Comparación */}
    {previousSet && weight && (
      <ComparisonIndicator
        current={parseFloat(weight)}
        previous={previousSet.weight}
        type="weight"
      />
    )}

    {/* Sugerencia basada en anterior */}
    {previousSet && !weight && (
      <button
        onClick={() => setWeight(previousSet.weight.toString())}
        className="text-xs text-accent"
      >
        Usar {previousSet.weight}kg (anterior)
      </button>
    )}
  </div>
)
```

---

## Expandir para Ver Más

```javascript
export function PreviousWorkoutExpanded({ exerciseId }) {
  const [expanded, setExpanded] = useState(false)
  const { data: previous } = usePreviousWorkout(exerciseId)

  if (!previous) return null

  return (
    <div className="bg-bg-secondary rounded-lg p-3">
      {/* Vista compacta siempre visible */}
      <PreviousWorkoutCompact previous={previous} />

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-accent mt-2"
      >
        {expanded ? 'Ver menos' : 'Ver historial completo'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border">
          {/* Últimas 5 sesiones */}
          <PreviousWorkoutHistory exerciseId={exerciseId} />
        </div>
      )}
    </div>
  )
}
```

---

## Hook para Historial Completo

```javascript
export function usePreviousWorkoutHistory(exerciseId, limit = 5) {
  return useQuery({
    queryKey: ['workoutHistory', exerciseId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('completed_sets')
        .select(`
          set_number,
          weight,
          reps_completed,
          workout_sessions!inner (
            id,
            started_at,
            status
          )
        `)
        .eq('exercise_id', exerciseId)
        .eq('workout_sessions.status', 'completed')
        .order('performed_at', { ascending: false })
        .limit(limit * 5) // Asumiendo max 5 series por sesión

      if (error) throw error

      // Agrupar por sesión
      const sessions = {}
      data.forEach(set => {
        const sessionId = set.workout_sessions.id
        if (!sessions[sessionId]) {
          sessions[sessionId] = {
            id: sessionId,
            date: set.workout_sessions.started_at,
            sets: []
          }
        }
        sessions[sessionId].sets.push({
          setNumber: set.set_number,
          weight: set.weight,
          reps: set.reps_completed
        })
      })

      return Object.values(sessions)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit)
    },
    enabled: !!exerciseId
  })
}
```

---

## Tareas

- [ ] Crear hook usePreviousWorkout
- [ ] Crear componente PreviousWorkout compacto
- [ ] Implementar scroll horizontal para series
- [ ] Crear ComparisonIndicator
- [ ] Integrar en SetTracker
- [ ] Botón "Usar peso anterior"
- [ ] Vista expandida con historial
- [ ] Hook usePreviousWorkoutHistory
- [ ] Mostrar resumen (max peso, volumen total)
