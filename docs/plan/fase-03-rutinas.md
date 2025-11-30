# Fase 3: Visualización de Rutinas (desde Supabase)

## Objetivos
1. Hook useRoutines para cargar rutina completa
2. Migrar componentes: RoutineCard, DayCard, ExerciseItem
3. Mostrar datos desde las tablas normalizadas

---

## Query para Obtener Rutina Completa

```sql
SELECT
    r.id as routine_id,
    r.nombre as rutina,
    r.objetivo,
    rd.id as day_id,
    rd.dia_numero,
    rd.nombre as dia_nombre,
    rd.duracion_estimada_min,
    rb.id as block_id,
    rb.nombre as bloque,
    rb.orden as bloque_orden,
    re.id as routine_exercise_id,
    re.orden as ejercicio_orden,
    re.series,
    re.reps,
    re.rir,
    re.descanso_seg,
    re.tempo,
    re.tempo_razon,
    re.notas as ejercicio_notas,
    re.es_calentamiento,
    e.id as exercise_id,
    e.nombre as ejercicio,
    e.nombre_en,
    e.altura_polea,
    eq.nombre as equipamiento,
    et.nombre as equipamiento_tipo,
    gt.nombre as tipo_agarre,
    gw.nombre as apertura_agarre,
    m.nombre as musculo_principal,
    mg.nombre as grupo_muscular
FROM routines r
JOIN routine_days rd ON rd.routine_id = r.id
JOIN routine_blocks rb ON rb.routine_day_id = rd.id
JOIN routine_exercises re ON re.routine_block_id = rb.id
JOIN exercises e ON e.id = re.exercise_id
LEFT JOIN equipment eq ON eq.id = e.equipment_id
LEFT JOIN equipment_types et ON et.id = eq.equipment_type_id
LEFT JOIN grip_types gt ON gt.id = e.grip_type_id
LEFT JOIN grip_widths gw ON gw.id = e.grip_width_id
LEFT JOIN exercise_muscles em ON em.exercise_id = e.id AND em.es_principal = true
LEFT JOIN muscles m ON m.id = em.muscle_id
LEFT JOIN muscle_groups mg ON mg.id = m.muscle_group_id
WHERE r.id = $1
ORDER BY rd.dia_numero, rb.orden, re.orden;
```

---

## Hook useRoutines

### src/features/routines/hooks/useRoutines.js
```javascript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase/client'

export function useRoutines() {
  return useQuery({
    queryKey: ['routines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routines')
        .select('id, nombre, objetivo, frecuencia_dias')

      if (error) throw error
      return data
    }
  })
}

export function useRoutineDetail(routineId) {
  return useQuery({
    queryKey: ['routine', routineId],
    queryFn: async () => {
      // Query completa con joins
      const { data, error } = await supabase.rpc('get_routine_detail', {
        routine_id: routineId
      })

      if (error) throw error
      return transformRoutineData(data)
    },
    enabled: !!routineId
  })
}

// Transforma datos planos en estructura jerárquica
function transformRoutineData(flatData) {
  // Agrupar por días, bloques, ejercicios
  const days = {}

  flatData.forEach(row => {
    if (!days[row.day_id]) {
      days[row.day_id] = {
        id: row.day_id,
        numero: row.dia_numero,
        nombre: row.dia_nombre,
        duracion: row.duracion_estimada_min,
        bloques: {}
      }
    }

    const day = days[row.day_id]
    if (!day.bloques[row.block_id]) {
      day.bloques[row.block_id] = {
        id: row.block_id,
        nombre: row.bloque,
        orden: row.bloque_orden,
        ejercicios: []
      }
    }

    day.bloques[row.block_id].ejercicios.push({
      id: row.routine_exercise_id,
      exerciseId: row.exercise_id,
      nombre: row.ejercicio,
      nombreEn: row.nombre_en,
      series: row.series,
      reps: row.reps,
      rir: row.rir,
      descanso: row.descanso_seg,
      tempo: row.tempo,
      tempoRazon: row.tempo_razon,
      notas: row.ejercicio_notas,
      esCalentamiento: row.es_calentamiento,
      equipamiento: row.equipamiento,
      equipamientoTipo: row.equipamiento_tipo,
      agarre: row.tipo_agarre,
      aperturaAgarre: row.apertura_agarre,
      alturaPolea: row.altura_polea,
      musculoPrincipal: row.musculo_principal,
      grupoMuscular: row.grupo_muscular
    })
  })

  // Convertir objetos a arrays ordenados
  return Object.values(days).map(day => ({
    ...day,
    bloques: Object.values(day.bloques).sort((a, b) => a.orden - b.orden)
  })).sort((a, b) => a.numero - b.numero)
}
```

---

## Componentes

### RoutineCard
```javascript
// src/features/routines/components/RoutineCard.jsx
export function RoutineCard({ routine, expanded, onToggle }) {
  return (
    <div className="bg-bg-secondary border border-border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full p-4 flex justify-between items-center"
      >
        <div>
          <h2 className="text-xl font-bold">{routine.nombre}</h2>
          <p className="text-text-secondary">{routine.objetivo}</p>
        </div>
        <ChevronIcon expanded={expanded} />
      </button>

      {expanded && (
        <div className="border-t border-border">
          {routine.dias.map(dia => (
            <DayCard key={dia.id} day={dia} />
          ))}
        </div>
      )}
    </div>
  )
}
```

### DayCard
```javascript
// src/features/routines/components/DayCard.jsx
export function DayCard({ day }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex justify-between items-center"
      >
        <div>
          <span className="text-accent">Día {day.numero}</span>
          <h3 className="font-semibold">{day.nombre}</h3>
        </div>
        <span className="text-text-secondary">{day.duracion} min</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {day.bloques.map(bloque => (
            <BlockSection key={bloque.id} block={bloque} />
          ))}

          <button className="w-full py-3 bg-accent-green text-bg-primary rounded-lg font-bold">
            Iniciar Entrenamiento
          </button>
        </div>
      )}
    </div>
  )
}
```

### ExerciseItem
```javascript
// src/features/routines/components/ExerciseItem.jsx
export function ExerciseItem({ exercise }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="bg-bg-tertiary rounded-lg p-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{exercise.nombre}</h4>
          <p className="text-sm text-accent-green">{exercise.musculoPrincipal}</p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold">
            {exercise.series}×{exercise.reps}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-2 flex-wrap">
        <span className="px-2 py-1 bg-accent-purple/20 text-accent-purple rounded text-xs">
          RIR {exercise.rir}
        </span>
        <span className="px-2 py-1 bg-accent-orange/20 text-accent-orange rounded text-xs">
          {exercise.descanso}s
        </span>
        {exercise.tempo && (
          <span className="px-2 py-1 bg-bg-secondary rounded text-xs font-mono">
            {exercise.tempo}
          </span>
        )}
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-border text-sm text-text-secondary">
          <p><strong>Equipo:</strong> {exercise.equipamiento}</p>
          {exercise.agarre && (
            <p><strong>Agarre:</strong> {exercise.agarre} - {exercise.aperturaAgarre}</p>
          )}
          {exercise.notas && <p className="mt-2">{exercise.notas}</p>}
        </div>
      )}

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-xs text-accent mt-2"
      >
        {showDetails ? 'Menos info' : 'Más info'}
      </button>
    </div>
  )
}
```

---

## Tareas

- [ ] Crear función RPC en Supabase para obtener rutina completa
- [ ] Implementar hook useRoutines
- [ ] Implementar hook useRoutineDetail
- [ ] Crear función transformRoutineData
- [ ] Crear componente RoutineCard
- [ ] Crear componente DayCard
- [ ] Crear componente BlockSection
- [ ] Crear componente ExerciseItem
- [ ] Crear página HomePage con lista de rutinas
- [ ] Añadir botón "Iniciar Entrenamiento" en cada día
