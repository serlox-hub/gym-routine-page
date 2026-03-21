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
- [x] **Reemplazar alert() por toast** — Componente Toast en web con misma apariencia que native. initNotifications conectado. 5 alert() reemplazados por getNotifier().show().
- [x] **Crash analytics** — Sentry integrado en web (`@sentry/react`) y native (`@sentry/react-native`). Solo activo en produccion. Requiere configurar `VITE_SENTRY_DSN` (web) y `EXPO_PUBLIC_SENTRY_DSN` (native) con el DSN de sentry.io.
- ~~**Memory leak en useRestTimer**~~ — Falso positivo. El cleanup en useEffect borra correctamente los callbacks del Set al desmontar.

## Medio

- [x] **Deteccion de red en native** — @react-native-community/netinfo instalado. OfflineBanner muestra aviso cuando no hay conexion. onConnectivityChange inyectado en useSyncPendingSets para sincronizar al reconectar.
- [x] **NOT NULL en exercise_id** — Migration 021 con NOT NULL para `routine_exercises.exercise_id` y `session_exercises.exercise_id`.C
- [x] **Eliminar console.error en useCompletedSets.js** — Reemplazados por catch vacios con comentario explicativo.
- ~~**Timezone en streakUtils**~~ — Aceptable. JS parsea ISO strings a hora local, que es el comportamiento correcto (la semana se calcula segun cuando entreno el usuario en su timezone).
- [ ] **EAS submit vacio** — `eas.json` tiene submit como placeholder vacio. Rellenar antes de publicar en stores.
- [x] **Documentar env vars** — `.env.example` actualizado en native (Google OAuth + Sentry) y creado en web (Supabase + Sentry).
- ~~**Virtualizacion de listas**~~ — Falso positivo. History filtra por mes (~30 items), Exercises es filtrable y las listas son pequenas. Exercise history usa infinite query con paginacion de 30.
- ~~**Dimensiones hardcodeadas native**~~ — Falso positivo. Charts usan `adjustToWidth` (responsive), alturas fijas son diseno intencional para mobile.
- ~~**Paginacion admin**~~ — Falso positivo. Endpoint admin-only con <50 usuarios realistas. Optimizacion prematura.

## Bajo

- [x] **Mostrar version de la app** — Version visible al final de Preferences en web (desde package.json via Vite define) y native (desde app.json).
- ~~**select('*') en fetchRoutines**~~ — Insignificante. La tabla routines tiene solo 7 columnas. No justifica optimizar.
- ~~**React.memo en listas**~~ — Falso positivo. Los handlers inline anulan el beneficio de memo. Las listas son pequenas (5-15 items).
- ~~**Tests para routineTemplates.js**~~ — Falso positivo. Es data estatica sin logica, no necesita tests.
