# Checklist de produccion

Lista de mejoras pendientes para llevar la app a produccion. Ordenadas por prioridad.
Items marcados con ~~tachado~~ fueron falsos positivos verificados contra el codigo.

## Critico

- [x] ~~**Cache invalidation en useRoutines.js**~~ — Falso positivo. Los callers SI pasan `routineId`/`dayId`. TanStack Query expone todo el objeto como `variables` en `onSuccess`.
- [x] **N+1 en importRoutine()** — Resuelto: batch de muscle_groups y exercises con `.in()` antes del loop.
- [x] **Indexes faltantes en FK** — Migration 020 creada con indices para `routine_exercises.exercise_id` y `routine_days.routine_id`.

## Alto

- [x] **Service Worker para PWA** — Implementado con vite-plugin-pwa. Assets estaticos precacheados, API Supabase con NetworkFirst (cache 5 min, timeout 3s).
- [x] **Componentes > 300 lineas con subcomponentes embebidos** — Extraidos a archivos propios:
  - `WorkoutSessionLayout.jsx` 363→279: `PRSummaryModal`, `PRNotification` a archivos separados
  - `Preferences.jsx` 342→173: `InstallAppSection`, `PreferenceToggle`, `TrainingGoalSection` a `components/Preferences/`
  - `SetDetailsModal.jsx` 320→267: `VideoPlayer` a archivo separado
- [ ] **Reemplazar alert() por toast** — 4 sitios en web usan `alert()` nativo: `NewRoutineFlow.jsx` (x2), `Exercises.jsx`, `ChatbotPromptModal.jsx`. Native ya tiene toast-message. Implementar sistema de notificaciones equivalente en web.
- [ ] **Crash analytics** — Integrar Sentry (o similar) en web y native. Cero dependencias de tracking actualmente.
- ~~**Memory leak en useRestTimer**~~ — Falso positivo. El cleanup en useEffect borra correctamente los callbacks del Set al desmontar.

## Medio

- [ ] **Deteccion de red en native** — Falta `@react-native-community/netinfo` y UI de feedback offline. El retry/queue de sets SI funciona (optimistic updates + pendingSets + retry cada 10s), pero el usuario no recibe ningun indicador visual. Prioridad UX, no funcional.
- [ ] **NOT NULL en exercise_id** — Solo faltan en `routine_exercises.exercise_id` y `session_exercises.exercise_id`. Los campos `name` de exercises/routines/days/blocks YA son NOT NULL.
- [ ] **Eliminar console.error en useCompletedSets.js** — Lineas 68 y 89 tienen `console.error` que no deberia estar en produccion.
- [ ] **Timezone en streakUtils** — `getISOWeekKey()` parsea fechas ISO de Supabase y aplica `setHours(0,0,0,0)` en hora local. Edge case: sesiones completadas cerca de medianoche UTC pueden asignarse a la semana equivocada. Impacto bajo.
- [ ] **EAS submit vacio** — `eas.json` tiene submit como placeholder vacio. Rellenar antes de publicar en stores.
- [ ] **Documentar env vars de native** — `.env.example` solo tiene vars de Supabase. Faltan `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` y `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (necesarias cuando se implemente Google OAuth en native).
- ~~**Virtualizacion de listas**~~ — Falso positivo. History filtra por mes (~30 items), Exercises es filtrable y las listas son pequenas. Exercise history usa infinite query con paginacion de 30.
- ~~**Dimensiones hardcodeadas native**~~ — Falso positivo. Charts usan `adjustToWidth` (responsive), alturas fijas son diseno intencional para mobile.
- ~~**Paginacion admin**~~ — Falso positivo. Endpoint admin-only con <50 usuarios realistas. Optimizacion prematura.

## Bajo

- [ ] **Mostrar version de la app** — No se muestra en Preferences de ninguna app. `package.json` tiene 0.0.1 (web) y `app.json` tiene 1.0.0 (native) pero no se renderizan.
- ~~**select('*') en fetchRoutines**~~ — Insignificante. La tabla routines tiene solo 7 columnas. No justifica optimizar.
- ~~**React.memo en listas**~~ — Falso positivo. Los handlers inline anulan el beneficio de memo. Las listas son pequenas (5-15 items).
- ~~**Tests para routineTemplates.js**~~ — Falso positivo. Es data estatica sin logica, no necesita tests.
