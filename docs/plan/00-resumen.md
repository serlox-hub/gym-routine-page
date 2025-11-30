# Plan: Transformar Gym Routine Page a App de Seguimiento Interactiva

## Resumen

Migrar la aplicación de visualización estática de rutinas a una app React interactiva con:
- Cronómetro de descanso entre series
- Registro de series (peso, reps, completada)
- Referencia del entrenamiento anterior
- Notas por serie (RIR real, molestias)
- Histórico y gráficos de progresión
- Persistencia con Supabase (modo single-user inicial)

**Funcionalidad pospuesta**: Sistema de sustitución de ejercicios (para una fase posterior)

---

## Arquitectura

### Stack Tecnológico
- **Frontend**: React 18 + JavaScript + Vite
- **Estado**: Zustand (sesión activa) + TanStack Query (datos Supabase)
- **Backend**: Supabase (PostgreSQL + Auth preparado)
- **UI**: Tailwind CSS (migrar variables del dark mode actual)
- **Gráficos**: Recharts
- **Extras**: date-fns, use-sound (alertas timer)

### Estrategia de Datos
- **Todo en Supabase**: Rutinas, ejercicios, catálogos y datos de entrenamientos
- **Tablas normalizadas**: Músculos, equipamiento, agarres, ejercicios, rutinas
- **Migración inicial**: Importar datos del JSON actual a las tablas

---

## Estructura de Carpetas

```
src/
├── app/
│   ├── App.jsx
│   ├── router.jsx
│   └── providers.jsx
├── components/
│   ├── ui/                    # Button, Card, Modal, Timer, Input
│   └── layout/                # Header, BottomNav, PageLayout
├── features/
│   ├── routines/              # Vista de rutinas
│   │   ├── components/        # RoutineCard, DayCard, ExerciseItem
│   │   └── hooks/useRoutines.js
│   ├── workout-session/       # Sesión de entrenamiento activa
│   │   ├── components/        # WorkoutSessionView, ActiveExercise,
│   │   │                      # SetTracker, RestTimer, SetNotes,
│   │   │                      # PreviousWorkout
│   │   ├── hooks/             # useWorkoutSession, useRestTimer
│   │   └── store/workoutSessionStore.js
│   ├── history/               # Histórico
│   │   └── components/        # HistoryList, WorkoutSummary, Calendar
│   └── progress/              # Gráficos
│       └── components/        # ProgressDashboard, WeightChart, VolumeChart
├── lib/
│   ├── supabase/client.js
│   └── utils/                 # formatters, calculations
└── scripts/
    └── migrate-json-to-supabase.js  # Script de migración inicial
```

---

## Fases de Implementación

| Fase | Descripción | Archivo |
|------|-------------|---------|
| 1 | Setup Supabase + Modelo de Datos | [fase-01-supabase.md](./fase-01-supabase.md) |
| 2 | Setup React + Conexión Supabase | [fase-02-react-setup.md](./fase-02-react-setup.md) |
| 3 | Visualización de Rutinas | [fase-03-rutinas.md](./fase-03-rutinas.md) |
| 4 | Sesión de Entrenamiento | [fase-04-sesion.md](./fase-04-sesion.md) |
| 5 | Timer de Descanso | [fase-05-timer.md](./fase-05-timer.md) |
| 6 | Referencia Sesión Anterior | [fase-06-referencia.md](./fase-06-referencia.md) |
| 7 | Notas por Serie | [fase-07-notas.md](./fase-07-notas.md) |
| 8 | Histórico | [fase-08-historico.md](./fase-08-historico.md) |
| 9 | Gráficos de Progresión | [fase-09-graficos.md](./fase-09-graficos.md) |

---

## Notas Importantes

- **Single-user**: Sin autenticación inicial. Auth se añade después.
- **Todo en Supabase**: Catálogos, ejercicios, rutinas y sesiones normalizados.
- **Migración inicial**: Script para importar datos del JSON actual a las tablas.
- **Sustituciones**: Funcionalidad pospuesta para fase posterior.
