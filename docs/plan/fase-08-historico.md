# Fase 8: Histórico

## Objetivos
1. Vista calendario con días entrenados marcados
2. Lista de sesiones con resumen (duración, volumen)
3. Detalle de sesión (todos los ejercicios/series)

---

## Hook useWorkoutHistory

### src/features/history/hooks/useWorkoutHistory.js
```javascript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase/client'

export function useWorkoutHistory(year, month) {
  return useQuery({
    queryKey: ['workoutHistory', year, month],
    queryFn: async () => {
      const startDate = new Date(year, month, 1).toISOString()
      const endDate = new Date(year, month + 1, 0).toISOString()

      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          started_at,
          completed_at,
          duration_minutes,
          status,
          sensacion_general,
          routine_days (
            dia_numero,
            nombre,
            routines (nombre)
          )
        `)
        .gte('started_at', startDate)
        .lte('started_at', endDate)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })

      if (error) throw error
      return data
    }
  })
}

export function useSessionDetail(sessionId) {
  return useQuery({
    queryKey: ['sessionDetail', sessionId],
    queryFn: async () => {
      // Obtener sesión
      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          routine_days (
            dia_numero,
            nombre,
            routines (nombre)
          )
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError

      // Obtener series completadas
      const { data: sets, error: setsError } = await supabase
        .from('completed_sets')
        .select(`
          *,
          exercises (
            nombre,
            nombre_en
          )
        `)
        .eq('session_id', sessionId)
        .order('performed_at')

      if (setsError) throw setsError

      // Calcular estadísticas
      const totalVolume = sets.reduce((acc, set) =>
        acc + (set.weight || 0) * (set.reps_completed || 0), 0
      )
      const totalSets = sets.filter(s => s.completed).length
      const exercises = [...new Set(sets.map(s => s.exercises.nombre))]

      return {
        ...session,
        sets,
        stats: {
          totalVolume,
          totalSets,
          exerciseCount: exercises.length
        }
      }
    },
    enabled: !!sessionId
  })
}
```

---

## Componente Calendar

### src/features/history/components/WorkoutCalendar.jsx
```javascript
import { useState } from 'react'
import { useWorkoutHistory } from '../hooks/useWorkoutHistory'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths
} from 'date-fns'
import { es } from 'date-fns/locale'

export function WorkoutCalendar({ onSelectDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const { data: sessions = [] } = useWorkoutHistory(year, month)

  // Crear mapa de días con entrenamientos
  const workoutDays = sessions.reduce((acc, session) => {
    const dateKey = format(new Date(session.started_at), 'yyyy-MM-dd')
    acc[dateKey] = session
    return acc
  }, {})

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Calcular días vacíos al inicio (para alinear con día de la semana)
  const startDay = monthStart.getDay()
  const emptyDays = Array(startDay === 0 ? 6 : startDay - 1).fill(null)

  return (
    <div className="bg-bg-secondary rounded-lg p-4">
      {/* Header con navegación */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2"
        >
          ←
        </button>
        <h3 className="text-lg font-bold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2"
        >
          →
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
          <div key={day} className="text-center text-xs text-text-muted py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-1">
        {/* Días vacíos */}
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Días del mes */}
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const session = workoutDays[dateKey]
          const isToday = isSameDay(day, new Date())

          return (
            <button
              key={dateKey}
              onClick={() => session && onSelectDate(session)}
              className={`
                aspect-square rounded-lg flex items-center justify-center text-sm
                ${isToday ? 'ring-2 ring-accent' : ''}
                ${session ? 'bg-accent-green text-bg-primary font-bold' : 'bg-bg-tertiary'}
                ${!session && 'text-text-muted'}
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 mt-4 text-xs text-text-secondary">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-accent-green" />
          <span>Entrenamiento</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded ring-2 ring-accent" />
          <span>Hoy</span>
        </div>
      </div>
    </div>
  )
}
```

---

## Lista de Sesiones

### src/features/history/components/SessionList.jsx
```javascript
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function SessionList({ sessions, onSelect }) {
  if (!sessions?.length) {
    return (
      <div className="text-center text-text-muted py-8">
        No hay entrenamientos este mes
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sessions.map(session => (
        <SessionCard
          key={session.id}
          session={session}
          onClick={() => onSelect(session)}
        />
      ))}
    </div>
  )
}

function SessionCard({ session, onClick }) {
  const date = new Date(session.started_at)
  const dayName = format(date, 'EEEE', { locale: es })
  const dateStr = format(date, 'd MMM', { locale: es })

  return (
    <button
      onClick={onClick}
      className="w-full bg-bg-secondary rounded-lg p-4 text-left hover:bg-bg-tertiary transition-colors"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-accent capitalize">{dayName}</span>
            <span className="text-text-muted">{dateStr}</span>
          </div>
          <h4 className="font-semibold mt-1">
            {session.routine_days?.nombre || 'Entrenamiento'}
          </h4>
          <p className="text-sm text-text-secondary">
            {session.routine_days?.routines?.nombre}
          </p>
        </div>

        <div className="text-right">
          {session.duration_minutes && (
            <div className="text-lg font-bold">
              {session.duration_minutes} min
            </div>
          )}
          {session.sensacion_general && (
            <div className="text-sm">
              {['😫', '😕', '😐', '🙂', '💪'][session.sensacion_general - 1]}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
```

---

## Detalle de Sesión

### src/features/history/components/SessionDetail.jsx
```javascript
import { useSessionDetail } from '../hooks/useWorkoutHistory'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function SessionDetail({ sessionId, onClose }) {
  const { data: session, isLoading } = useSessionDetail(sessionId)

  if (isLoading) {
    return <div className="p-4">Cargando...</div>
  }

  if (!session) {
    return <div className="p-4">Sesión no encontrada</div>
  }

  // Agrupar series por ejercicio
  const exerciseGroups = session.sets.reduce((acc, set) => {
    const name = set.exercises.nombre
    if (!acc[name]) {
      acc[name] = []
    }
    acc[name].push(set)
    return acc
  }, {})

  return (
    <div className="bg-bg-secondary rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">
              {session.routine_days?.nombre}
            </h2>
            <p className="text-text-secondary">
              {format(new Date(session.started_at), "EEEE d 'de' MMMM", { locale: es })}
            </p>
          </div>
          <button onClick={onClose} className="text-text-secondary">✕</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{session.duration_minutes || '-'}</div>
            <div className="text-xs text-text-muted">minutos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{session.stats.totalSets}</div>
            <div className="text-xs text-text-muted">series</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {(session.stats.totalVolume / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-text-muted">kg volumen</div>
          </div>
        </div>
      </div>

      {/* Ejercicios */}
      <div className="p-4 space-y-4">
        {Object.entries(exerciseGroups).map(([name, sets]) => (
          <div key={name} className="bg-bg-tertiary rounded-lg p-3">
            <h4 className="font-medium mb-2">{name}</h4>
            <div className="flex gap-2 flex-wrap">
              {sets.map((set, i) => (
                <div
                  key={i}
                  className="bg-bg-secondary px-3 py-1 rounded text-sm"
                >
                  {set.weight}kg × {set.reps_completed}
                  {set.rir_actual !== null && (
                    <span className="text-accent-purple ml-1">
                      R{set.rir_actual}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {sets.some(s => s.notas) && (
              <p className="text-xs text-text-muted mt-2">
                {sets.find(s => s.notas)?.notas}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Notas generales */}
      {session.notas && (
        <div className="p-4 border-t border-border">
          <h4 className="text-sm text-text-secondary mb-1">Notas</h4>
          <p className="text-sm">{session.notas}</p>
        </div>
      )}
    </div>
  )
}
```

---

## Página de Histórico

### src/features/history/pages/HistoryPage.jsx
```javascript
import { useState } from 'react'
import { WorkoutCalendar } from '../components/WorkoutCalendar'
import { SessionList } from '../components/SessionList'
import { SessionDetail } from '../components/SessionDetail'
import { useWorkoutHistory } from '../hooks/useWorkoutHistory'

export function HistoryPage() {
  const [selectedSession, setSelectedSession] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const { data: sessions } = useWorkoutHistory(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  )

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Histórico</h1>

      {/* Calendario */}
      <WorkoutCalendar
        onSelectDate={(session) => setSelectedSession(session)}
      />

      {/* Lista de sesiones del mes */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Este mes</h2>
        <SessionList
          sessions={sessions}
          onSelect={(session) => setSelectedSession(session)}
        />
      </div>

      {/* Modal de detalle */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <SessionDetail
            sessionId={selectedSession.id}
            onClose={() => setSelectedSession(null)}
          />
        </div>
      )}
    </div>
  )
}
```

---

## Tareas

- [ ] Crear hook useWorkoutHistory
- [ ] Crear hook useSessionDetail
- [ ] Crear componente WorkoutCalendar
- [ ] Navegación entre meses
- [ ] Marcar días con entrenamientos
- [ ] Crear SessionList
- [ ] Crear SessionCard con resumen
- [ ] Crear SessionDetail
- [ ] Agrupar series por ejercicio
- [ ] Mostrar estadísticas (duración, volumen, series)
- [ ] Crear HistoryPage
- [ ] Modal para ver detalle de sesión
