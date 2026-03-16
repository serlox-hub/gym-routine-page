---
phase: 01-estabilizar
plan: 01
subsystem: ui
tags: [react-native, hooks, components, dead-code]

# Dependency graph
requires: []
provides:
  - WorkoutExerciseCard sin violación de hooks condicionales (RegularExerciseCard a nivel de módulo)
  - routineIO.js RN sin dead code de FileReader ni downloadRoutineAsJson
affects: [02-deduplicar, 04-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Delegación condicional a nivel de componente: WarmupExerciseCard vs RegularExerciseCard, ambos a scope de módulo"

key-files:
  created: []
  modified:
    - apps/gym-native/src/components/Workout/WorkoutExerciseCard.jsx
    - apps/gym-native/src/lib/routineIO.js

key-decisions:
  - "RegularExerciseCard extraído a scope de módulo (no dentro de WorkoutExerciseCard) para identidad de componente estable en React"
  - "WorkoutExerciseCard mantiene solo lógica de delegación: warmup check + pass-through de props"

patterns-established:
  - "Delegación condicional de componente: early return a WarmupCard, default return a RegularCard — ambos a scope de módulo"

requirements-completed: [BUG-01, BUG-02]

# Metrics
duration: 2min
completed: 2026-03-16
---

# Phase 1 Plan 01: Estabilizar - Crash Risks Summary

**RegularExerciseCard extraído a scope de módulo eliminando hooks condicionales; dead code FileReader/downloadRoutineAsJson eliminado del módulo RN**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-16T12:45:47Z
- **Completed:** 2026-03-16T12:47:33Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- WorkoutExerciseCard (RN) ya no tiene hooks llamados después de un return condicional — riesgo de crash eliminado
- RegularExerciseCard definido a nivel de módulo con identidad de componente estable para React
- readJsonFile y downloadRoutineAsJson eliminados de routineIO.js RN — no había import de ninguno en la app
- Lint pasa limpio en ambos workspaces (gym-native y web) sin ningún comentario eslint-disable

## Task Commits

Cada tarea commiteada atómicamente:

1. **Task 1: Extract RegularExerciseCard to fix hooks violation** - `2d21c2c` (fix)
2. **Task 2: Delete dead code from RN routineIO.js** - `be35df2` (fix)

**Plan metadata:** (pendiente commit de docs)

## Files Created/Modified
- `apps/gym-native/src/components/Workout/WorkoutExerciseCard.jsx` - RegularExerciseCard extraído a scope de módulo; WorkoutExerciseCard queda como delegador puro
- `apps/gym-native/src/lib/routineIO.js` - downloadRoutineAsJson y readJsonFile eliminados; eslint-disable no-undef eliminado

## Decisions Made
- RegularExerciseCard no envuelto en `memo` — solo el wrapper exterior `WorkoutExerciseCard` mantiene memo, según especificación del plan
- Props pasados directamente desde WorkoutExerciseCard a RegularExerciseCard; los store selectors y usePreviousWorkout se mueven dentro de RegularExerciseCard para mantener la lista de props limpia

## Deviations from Plan

None - plan ejecutado exactamente como estaba especificado.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- BUG-01 y BUG-02 resueltos — desbloqueado para fase 02-deduplicar
- SIZE-03 (que dependía de BUG-01 estar resuelto) puede proceder
- Lint limpio en ambas plataformas como baseline para siguientes planes

---
*Phase: 01-estabilizar*
*Completed: 2026-03-16*
