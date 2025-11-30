# Fase 9: Gráficos de Progresión

## Objetivos
1. Integrar Recharts
2. Gráfico peso máximo por ejercicio (últimas N semanas)
3. Gráfico volumen semanal
4. Selector de ejercicio para ver progresión específica

---

## Hook useProgressData

### src/features/progress/hooks/useProgressData.js
```javascript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase/client'
import { subWeeks, format, startOfWeek, endOfWeek } from 'date-fns'

// Progresión de un ejercicio específico
export function useExerciseProgress(exerciseId, weeks = 12) {
  return useQuery({
    queryKey: ['exerciseProgress', exerciseId, weeks],
    queryFn: async () => {
      const startDate = subWeeks(new Date(), weeks).toISOString()

      const { data, error } = await supabase
        .from('completed_sets')
        .select(`
          weight,
          reps_completed,
          performed_at,
          workout_sessions!inner (status)
        `)
        .eq('exercise_id', exerciseId)
        .eq('workout_sessions.status', 'completed')
        .gte('performed_at', startDate)
        .order('performed_at')

      if (error) throw error

      // Agrupar por semana
      const weeklyData = {}
      data.forEach(set => {
        const weekStart = format(
          startOfWeek(new Date(set.performed_at), { weekStartsOn: 1 }),
          'yyyy-MM-dd'
        )

        if (!weeklyData[weekStart]) {
          weeklyData[weekStart] = {
            week: weekStart,
            maxWeight: 0,
            totalVolume: 0,
            totalSets: 0,
            avgReps: 0,
            repsSum: 0
          }
        }

        const w = weeklyData[weekStart]
        w.maxWeight = Math.max(w.maxWeight, set.weight || 0)
        w.totalVolume += (set.weight || 0) * (set.reps_completed || 0)
        w.totalSets += 1
        w.repsSum += set.reps_completed || 0
      })

      // Calcular promedios y formatear
      return Object.values(weeklyData)
        .map(w => ({
          ...w,
          avgReps: w.totalSets > 0 ? Math.round(w.repsSum / w.totalSets) : 0,
          weekLabel: format(new Date(w.week), 'd MMM')
        }))
        .sort((a, b) => new Date(a.week) - new Date(b.week))
    },
    enabled: !!exerciseId
  })
}

// Volumen semanal total
export function useWeeklyVolume(weeks = 12) {
  return useQuery({
    queryKey: ['weeklyVolume', weeks],
    queryFn: async () => {
      const startDate = subWeeks(new Date(), weeks).toISOString()

      const { data, error } = await supabase
        .from('completed_sets')
        .select(`
          weight,
          reps_completed,
          performed_at,
          workout_sessions!inner (status)
        `)
        .eq('workout_sessions.status', 'completed')
        .gte('performed_at', startDate)
        .order('performed_at')

      if (error) throw error

      // Agrupar por semana
      const weeklyData = {}
      data.forEach(set => {
        const weekStart = format(
          startOfWeek(new Date(set.performed_at), { weekStartsOn: 1 }),
          'yyyy-MM-dd'
        )

        if (!weeklyData[weekStart]) {
          weeklyData[weekStart] = {
            week: weekStart,
            totalVolume: 0,
            totalSets: 0,
            workouts: new Set()
          }
        }

        const w = weeklyData[weekStart]
        w.totalVolume += (set.weight || 0) * (set.reps_completed || 0)
        w.totalSets += 1
      })

      return Object.values(weeklyData)
        .map(w => ({
          week: w.week,
          weekLabel: format(new Date(w.week), 'd MMM'),
          volume: Math.round(w.totalVolume),
          volumeK: (w.totalVolume / 1000).toFixed(1),
          sets: w.totalSets
        }))
        .sort((a, b) => new Date(a.week) - new Date(b.week))
    }
  })
}

// Lista de ejercicios para el selector
export function useExerciseList() {
  return useQuery({
    queryKey: ['exerciseList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select(`
          id,
          nombre,
          exercise_muscles!inner (
            es_principal,
            muscles (nombre, muscle_groups (nombre))
          )
        `)
        .order('nombre')

      if (error) throw error

      return data.map(ex => ({
        id: ex.id,
        nombre: ex.nombre,
        musculo: ex.exercise_muscles.find(m => m.es_principal)?.muscles?.nombre,
        grupo: ex.exercise_muscles.find(m => m.es_principal)?.muscles?.muscle_groups?.nombre
      }))
    }
  })
}
```

---

## Gráfico de Peso Máximo

### src/features/progress/components/WeightProgressChart.jsx
```javascript
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { useExerciseProgress } from '../hooks/useProgressData'

export function WeightProgressChart({ exerciseId, exerciseName }) {
  const { data, isLoading } = useExerciseProgress(exerciseId)

  if (isLoading) {
    return <div className="h-64 bg-bg-secondary rounded-lg animate-pulse" />
  }

  if (!data?.length) {
    return (
      <div className="h-64 bg-bg-secondary rounded-lg flex items-center justify-center text-text-muted">
        No hay datos suficientes
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-lg p-4">
      <h3 className="text-sm text-text-secondary mb-4">
        Peso máximo - {exerciseName}
      </h3>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            dataKey="weekLabel"
            stroke="#8b949e"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#8b949e"
            fontSize={12}
            tickLine={false}
            domain={['dataMin - 2', 'dataMax + 2']}
            tickFormatter={(v) => `${v}kg`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '8px'
            }}
            formatter={(value) => [`${value} kg`, 'Peso máx']}
          />
          <Line
            type="monotone"
            dataKey="maxWeight"
            stroke="#58a6ff"
            strokeWidth={2}
            dot={{ fill: '#58a6ff', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-xl font-bold">
            {Math.max(...data.map(d => d.maxWeight))}kg
          </div>
          <div className="text-xs text-text-muted">PR</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold">
            {data[data.length - 1]?.maxWeight || 0}kg
          </div>
          <div className="text-xs text-text-muted">Último</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-accent-green">
            +{((data[data.length - 1]?.maxWeight || 0) - (data[0]?.maxWeight || 0)).toFixed(1)}kg
          </div>
          <div className="text-xs text-text-muted">Progreso</div>
        </div>
      </div>
    </div>
  )
}
```

---

## Gráfico de Volumen Semanal

### src/features/progress/components/VolumeChart.jsx
```javascript
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { useWeeklyVolume } from '../hooks/useProgressData'

export function VolumeChart() {
  const { data, isLoading } = useWeeklyVolume()

  if (isLoading) {
    return <div className="h-64 bg-bg-secondary rounded-lg animate-pulse" />
  }

  if (!data?.length) {
    return (
      <div className="h-64 bg-bg-secondary rounded-lg flex items-center justify-center text-text-muted">
        No hay datos suficientes
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-lg p-4">
      <h3 className="text-sm text-text-secondary mb-4">
        Volumen semanal total
      </h3>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
          <XAxis
            dataKey="weekLabel"
            stroke="#8b949e"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#8b949e"
            fontSize={12}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '8px'
            }}
            formatter={(value) => [`${(value / 1000).toFixed(1)}k kg`, 'Volumen']}
          />
          <Bar
            dataKey="volume"
            fill="#3fb950"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Promedio */}
      <div className="text-center mt-4 pt-4 border-t border-border">
        <div className="text-xl font-bold">
          {(data.reduce((acc, d) => acc + d.volume, 0) / data.length / 1000).toFixed(1)}k kg
        </div>
        <div className="text-xs text-text-muted">Promedio semanal</div>
      </div>
    </div>
  )
}
```

---

## Selector de Ejercicio

### src/features/progress/components/ExerciseSelector.jsx
```javascript
import { useState } from 'react'
import { useExerciseList } from '../hooks/useProgressData'

export function ExerciseSelector({ value, onChange }) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const { data: exercises = [] } = useExerciseList()

  const filtered = exercises.filter(ex =>
    ex.nombre.toLowerCase().includes(search.toLowerCase()) ||
    ex.musculo?.toLowerCase().includes(search.toLowerCase())
  )

  // Agrupar por grupo muscular
  const grouped = filtered.reduce((acc, ex) => {
    const group = ex.grupo || 'Otro'
    if (!acc[group]) acc[group] = []
    acc[group].push(ex)
    return acc
  }, {})

  const selectedExercise = exercises.find(ex => ex.id === value)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-bg-secondary rounded-lg p-3 text-left flex justify-between items-center"
      >
        <span>{selectedExercise?.nombre || 'Seleccionar ejercicio'}</span>
        <span className="text-text-muted">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary rounded-lg border border-border shadow-lg z-10 max-h-80 overflow-y-auto">
          {/* Buscador */}
          <div className="p-2 sticky top-0 bg-bg-secondary">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ejercicio..."
              className="w-full bg-bg-tertiary rounded px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          {/* Lista agrupada */}
          {Object.entries(grouped).map(([group, exs]) => (
            <div key={group}>
              <div className="px-3 py-1 text-xs text-text-muted bg-bg-tertiary sticky top-12">
                {group}
              </div>
              {exs.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => {
                    onChange(ex.id)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary ${
                    ex.id === value ? 'bg-accent/20 text-accent' : ''
                  }`}
                >
                  <div>{ex.nombre}</div>
                  <div className="text-xs text-text-muted">{ex.musculo}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Dashboard de Progresión

### src/features/progress/pages/ProgressPage.jsx
```javascript
import { useState } from 'react'
import { VolumeChart } from '../components/VolumeChart'
import { WeightProgressChart } from '../components/WeightProgressChart'
import { ExerciseSelector } from '../components/ExerciseSelector'
import { useExerciseList } from '../hooks/useProgressData'

export function ProgressPage() {
  const [selectedExercise, setSelectedExercise] = useState(null)
  const { data: exercises = [] } = useExerciseList()

  const exerciseName = exercises.find(e => e.id === selectedExercise)?.nombre

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Progresión</h1>

      {/* Volumen semanal */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Volumen Semanal</h2>
        <VolumeChart />
      </section>

      {/* Progresión por ejercicio */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Por Ejercicio</h2>

        <ExerciseSelector
          value={selectedExercise}
          onChange={setSelectedExercise}
        />

        {selectedExercise && (
          <div className="mt-4">
            <WeightProgressChart
              exerciseId={selectedExercise}
              exerciseName={exerciseName}
            />
          </div>
        )}
      </section>

      {/* Ejercicios más frecuentes (acceso rápido) */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Acceso Rápido</h2>
        <div className="flex gap-2 flex-wrap">
          {exercises.slice(0, 6).map(ex => (
            <button
              key={ex.id}
              onClick={() => setSelectedExercise(ex.id)}
              className={`px-3 py-2 rounded-lg text-sm ${
                selectedExercise === ex.id
                  ? 'bg-accent text-bg-primary'
                  : 'bg-bg-secondary'
              }`}
            >
              {ex.nombre.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
```

---

## Tareas

- [ ] Instalar Recharts
- [ ] Crear hook useExerciseProgress
- [ ] Crear hook useWeeklyVolume
- [ ] Crear hook useExerciseList
- [ ] Crear WeightProgressChart con LineChart
- [ ] Crear VolumeChart con BarChart
- [ ] Personalizar estilos de Recharts (dark mode)
- [ ] Crear ExerciseSelector con búsqueda
- [ ] Agrupar ejercicios por grupo muscular
- [ ] Crear ProgressPage
- [ ] Mostrar estadísticas (PR, progreso, promedio)
- [ ] Acceso rápido a ejercicios frecuentes
