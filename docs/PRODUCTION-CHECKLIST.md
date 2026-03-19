# Checklist de produccion

Lista de mejoras pendientes para llevar la app a produccion. Ordenadas por prioridad.

## Critico

- [ ] **Cache invalidation rota en useRoutines.js** — Mutations como `useUpdateRoutineDay`, `useDeleteRoutineDay`, `useReorderRoutineDays`, `useDeleteRoutineExercise`, `useUpdateRoutineExercise`, `useReorderRoutineExercises`, `useDuplicateRoutineExercise` referencian `variables.routineId` / `variables.dayId` que no existen en los params. La invalidacion usa `undefined` y la UI queda con datos stale. (`packages/shared/src/hooks/useRoutines.js:156-235`)
- [ ] **N+1 en importRoutine()** — Por cada ejercicio importado hace 2 queries individuales (muscle_group + exercise). Con 50 ejercicios = 100 queries. Solucion: batch con `.in()` y construir mapa antes del loop. (`packages/shared/src/api/routineIOApi.js:154-212`)
- [ ] **Indexes faltantes en FK** — Crear migration con indices para: `routine_exercises.exercise_id`, `session_exercises.exercise_id`, `session_exercises.routine_exercise_id`, `routine_days.routine_id`, `routine_blocks.routine_day_id`. Afecta rendimiento de joins a escala.

## Alto

- [ ] **Service Worker para PWA** — PWA declarada en manifest pero sin SW. Sin soporte offline ni cache de assets. Implementar con vite-plugin-pwa. (`apps/web/`)
- [ ] **Deteccion de red en native** — No hay indicador offline ni retry UI. Integrar `@react-native-community/netinfo` y mostrar banner cuando no hay conexion. (`apps/gym-native/`)
- [ ] **Memory leak en useRestTimer** — `timerUpdateCallbacks` es un Set a nivel de modulo que acumula callbacks si el componente se monta/desmonta repetidamente. Usar cleanup robusto o WeakRef. (`packages/shared/src/hooks/useRestTimer.js:8-26`)
- [ ] **Componentes > 300 lineas con subcomponentes embebidos** — Extraer subcomponentes a archivos propios:
  - `WorkoutSessionLayout.jsx` (363 lineas): extraer `PRSummaryModal` y `PRNotification`
  - `Preferences.jsx` (342 lineas): extraer `InstallAppSection`, `PreferenceToggle`, `PremiumFeature`, `TrainingGoalSection`
  - `SetDetailsModal.jsx` (320 lineas): extraer `VideoPlayer`
  - `RoutineDetail.jsx` (321 lineas): extraer logica de estado a custom hook
- [ ] **Reemplazar alert() por toast** — 4 sitios en web usan `alert()` nativo: `NewRoutineFlow.jsx`, `ChatbotPromptModal.jsx`, `AdaptRoutineModal.jsx`, `Exercises.jsx`. Usar el sistema de notificaciones existente.
- [ ] **Crash analytics** — Integrar Sentry (o similar) en web y native para rastrear errores de produccion.

## Medio

- [ ] **Virtualizacion de listas largas** — Ejercicios y sesiones pueden tener 100+ items. Implementar `react-window` en web para `History.jsx` y `Exercises.jsx`.
- [ ] **NOT NULL en columnas requeridas** — Crear migration para anadir NOT NULL a: `exercises.name`, `routines.name`, `routine_days.name`, `routine_blocks.name`, `routine_exercises.exercise_id`.
- [ ] **Eliminar console.error en hooks** — `useCompletedSets.js:68,89` tiene console.error que no deberia estar en produccion. Silenciar o manejar con el sistema de notificaciones.
- [ ] **Timezone en streakUtils** — `getISOWeekKey()` usa `new Date()` sin manejo explicito de UTC. Puede desfasar 1 dia segun timezone del usuario. Normalizar a hora local del usuario. (`packages/shared/src/lib/streakUtils.js:30-40`)
- [ ] **Dimensiones hardcodeadas en native** — Reemplazar valores fijos por responsive:
  - `VideoPlayer.jsx`: altura fija 200px
  - `ExerciseProgressChart.jsx`: ancho fijo 280px (usar `useWindowDimensions`)
  - `RestTimer.jsx` y `ActiveSessionBanner.jsx`: offsets magicos (60, 100, 120) a constantes
- [ ] **Configurar EAS submit** — `eas.json` tiene submit vacio. Rellenar con credenciales de App Store y Google Play antes de publicar. (`apps/gym-native/eas.json:45-47`)
- [ ] **Paginacion en admin** — `fetchAllUsers()` carga todos los usuarios en memoria. Anadir paginacion al RPC o usar `.range()`. (`packages/shared/src/api/adminApi.js:3-39`)

## Bajo

- [ ] **Optimizar select en fetchRoutines** — Usa `select('*')`. Para la vista de lista, seleccionar solo `id, name, is_favorite, created_at`. (`packages/shared/src/api/routineQueryApi.js:10`)
- [ ] **React.memo en componentes de lista** — Anadir `React.memo` a `ExerciseCard`, `DayCard` y filas de sesion para evitar re-renders innecesarios.
- [ ] **Tests para routineTemplates.js** — Archivo de logica sin test file. (`packages/shared/src/lib/routineTemplates.js`)
- [ ] **Mostrar version de la app** — Anadir version visible en pantalla de Preferencias para que el usuario pueda reportar que version usa.
- [ ] **Documentar env vars de native** — `.env.example` no incluye `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` ni `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
