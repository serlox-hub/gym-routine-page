# Gym Tracker - Claude Instructions

## Project Overview
Monorepo with web (React + Vite) and mobile (Expo + NativeWind) apps sharing business logic via `@gym/shared`. Bilingual UI (Spanish default, English) with i18n via `i18next` + `react-i18next`. User authentication backed by Supabase.

## Tech Stack
- React 18 (JavaScript, NO TypeScript)
- Vite (web), Expo managed workflow (mobile)
- Supabase (PostgreSQL + JS client + Auth)
- TanStack Query (data fetching) — synced version across apps
- Zustand (local state) — synced version across apps
- Tailwind CSS (web) / NativeWind v4 (mobile)
- React Router DOM (web) / React Navigation (mobile)
- `@gym/shared` — shared business logic package
- i18next + react-i18next (internationalization)

## Project Structure

```
gym-routine-page/
├── apps/
│   ├── web/src/                # React + Vite
│   │   ├── components/         # UI components (same domain structure as before)
│   │   ├── hooks/              # Thin wrappers over @gym/shared hooks
│   │   ├── lib/                # Web-specific utilities (supabase.js, styles.js, etc.)
│   │   ├── pages/              # Route components
│   │   ├── stores/             # Zustand store instances (thin wrappers)
│   │   └── main.jsx            # App entry point — calls initApi/initStores
│   └── gym-native/src/         # Expo + NativeWind
│       ├── components/
│       ├── hooks/              # Thin wrappers over @gym/shared hooks
│       ├── screens/
│       └── stores/
└── packages/
    └── shared/src/             # @gym/shared
        ├── api/                # Supabase API functions (initApi pattern)
        │   ├── _client.js      # initApi(supabaseClient) + getClient()
        │   ├── exerciseApi.js
        │   ├── routineApi.js
        │   └── workoutApi.js   # barrel re-exporting sub-modules
        ├── hooks/              # Shared React hooks
        │   ├── _stores.js      # initStores() + store accessors
        │   └── useRoutines.js  # etc.
        ├── stores/             # Zustand store factories
        │   ├── createAuthStore.js
        │   └── createWorkoutStore.js
        ├── i18n/               # Internationalization
        │   ├── index.js        # initI18n(), t(), getCurrentLocale()
        │   └── locales/        # es/ and en/ JSON translation files
        ├── lib/                # Pure utility functions
        └── index.js            # Barrel — all public exports
```

## Monorepo Architecture

### @gym/shared barrel import pattern
All shared logic is consumed through the barrel:
```js
import { useRoutines, exportRoutine, QUERY_KEYS } from '@gym/shared'
```

### Injection layer (called at app startup in main.jsx / App.js)
```js
import { initApi, initStores, initNotifications, i18n, initI18n } from '@gym/shared'
import { initReactI18next } from 'react-i18next'

i18n.use(initReactI18next)
initI18n()                                // i18n (auto-inits with 'es', call before render)
initApi(supabaseClient, { gifBaseUrl })   // client before any API call; gifBaseUrl opcional
                                          // (base alternativa de GIFs, ver docs/DECISIONS.md)
initStores({ authStore, workoutStore })   // inject store instances
initNotifications(showToast)              // inject platform-specific toast function
```

### Shared + thin wrapper pattern
Hooks live in `packages/shared`. Per-app thin wrappers re-export them and inject platform-specific callbacks:

```js
// apps/web/src/hooks/useSession.js  (thin wrapper)
import { useRestoreActiveSession as _useRestoreActiveSession } from '@gym/shared'

export function useRestoreActiveSession() {
  return _useRestoreActiveSession({
    onVisibilityChange: (cb) => {
      const handler = () => { if (document.visibilityState === 'visible') cb() }
      document.addEventListener('visibilitychange', handler)
      return () => document.removeEventListener('visibilitychange', handler)
    },
  })
}
```

If a hook needs no platform-specific behavior, the wrapper is just a re-export:
```js
// apps/web/src/hooks/useRoutines.js
export * from '@gym/shared'
```

### Callback injection for platform-specific behavior
Shared hooks accept optional callback props for browser/native differences:
- `onVisibilityChange(cb)` — document visibility (web) vs AppState (RN)
- `onConnectivityChange(cb)` — network status
- `onStartError(message)` — notification on session start failure

### When modifying shared code
1. Edit in `packages/shared/src/`
2. If adding new exports, update `packages/shared/src/index.js` barrel
3. Run `npm run test:shared` for shared logic tests
4. Run `npm run check` to verify both apps still build

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | `PascalCase.jsx` | `ExerciseCard.jsx` |
| Hooks | `use[Domain].js` | `useRoutines.js` |
| Pages | `PascalCase.jsx` | `RoutineDetail.jsx` |
| Stores | `camelCaseStore.js` | `workoutStore.js` |
| Utils/Lib | `camelCase.js` | `supabase.js` |
| Constants | `SCREAMING_SNAKE_CASE` | `QUERY_KEYS` |

## Code Standards

### Language
- **Code**: English (variables, functions, components, files)
- **UI text**: Via i18n — never hardcode Spanish/English strings in components (see i18n section below)
- **Database columns**: English names, Spanish content as data values

### Component Rules
1. **One component per file** - Always
2. **Export as default** - `export default ComponentName`
3. **Max ~300 lines** - Split if significantly larger
4. **Props destructuring** - At function signature level
5. **Index files** - Every component folder has `index.js` for re-exports

### Hooks Organization
- **One file per domain** - All workout-related hooks in `useWorkout.js`
- **Group by sections** - Use comments to separate queries, mutations, utils
- **Consistent naming** - `useEntity` for queries, `useCreateEntity`/`useUpdateEntity` for mutations

```js
// ============================================
// QUERIES
// ============================================
export function useRoutines() { ... }

// ============================================
// MUTATIONS
// ============================================
export function useCreateRoutine() { ... }
```

### Imports
- Use `@gym/shared` for all shared logic:
```js
// DO:
import { useRoutines, exportRoutine, QUERY_KEYS } from '@gym/shared'

// DO (app-local components):
import { Button, Card, Modal } from '../components/ui'
```

- Use app-local thin wrappers (not @gym/shared directly) when platform callbacks are needed:
```js
// DO:
import { useRestoreActiveSession } from '../hooks/useSession'
// (wrapper injects onVisibilityChange)
```

### State Management
- **Server state**: TanStack Query (in hooks, via @gym/shared)
- **UI state**: React useState
- **Cross-component state**: Zustand stores (instances in apps, factories in @gym/shared)
- **Query key IDs must always be `String()`** — web route params are strings, native route params are numbers. To avoid type mismatches between query registration and invalidation, all hooks in `useRoutines.js` normalize IDs with `String()` before using them in query keys. Always follow this pattern.
- **"No lo sé todavía" no es "no"**: el estado de la sesión activa se resuelve preguntando al servidor, así que hasta que responde hay tres estados, no dos. `activeSessionSynced` (workout store, **no persistido**) lo distingue, y los botones de arranque lo tratan como `BUSY`. Sin esa distinción se puede arrancar un entrenamiento encima de otro. Aplica a cualquier decisión que dependa de estado de servidor todavía sin confirmar. Ver `docs/DECISIONS.md` (issue #30).

### Error Handling
- Always handle Supabase errors
- Show user-friendly messages via `t()` (never hardcoded strings)
- Use ErrorMessage component for display

### Styling
- Use Tailwind CSS classes (web) / NativeWind classes (mobile)
- Use style objects from `lib/styles.js` for consistency
- **Safe Area (native)**: Todo contenido visible debe respetar el safe area (notch, Dynamic Island, home indicator). Usar `SafeAreaView` de `react-native-safe-area-context` para layouts, o `useSafeAreaInsets()` para elementos con `position: 'absolute'` que necesitan offset manual. Nunca usar valores fijos de `top`/`bottom` sin sumar el inset correspondiente.
- **Contenedor con scroll que contiene inputs (web)**: el padding horizontal va en el propio elemento con `overflow-*-auto`, nunca delegado al padre o al hijo. `overflow-y-auto` recorta también en el eje X, y el ring de foco de `Input`/`Select`/`Textarea` (`focus:ring-1`) es un `box-shadow` que pinta 1px FUERA de la caja: sin padding propio queda cortado a izquierda y derecha. Si no se quiere cambiar la métrica visual, `px-1 -mx-1` en la caja de scroll.
- **Charts de recharts (web)**: la altura va en el propio `ResponsiveContainer` como número (`height={180}`), nunca en un div padre con `height="100%"` en el container. Recharts arranca midiendo -1x-1 y avisa por consola en cada montaje (también en el build de producción). Ver `docs/DECISIONS.md`.
- **Botón bloqueado (no disponible, pero responde)**: cuando una acción no cabe por el estado (p. ej. solo puede haber una sesión de entrenamiento a la vez), el botón NO se deja mudo. Patrón: atenuado (`opacity` 0.4–0.5) + `cursor: pointer` + **sin** feedback de hover/pulsación, y al pulsar un aviso que explica por qué. Atenuado sin hover = "no disponible"; que responda = "te digo por qué". `disabled` real se reserva para lo transitorio (cargando, mutación en vuelo), y **eso también se pinta**: atenuado + `LoadingSpinner inline`, nunca un botón intacto que se come la pulsación. Ver `TodaysWorkout` y `DayCard` en ambas plataformas, y `lib/workoutStartAction.js`.

### Color System (CRITICAL)

**Single source of truth**: `apps/web/src/lib/styles.js` y `apps/gym-native/src/lib/styles.js`. Ambos archivos DEBEN tener los mismos tokens de color (objeto `colors` idéntico).

**Rules:**
1. **NUNCA** usar hex/rgba hardcodeados en componentes. Siempre `colors.X` importado desde `lib/styles.js`
2. **Nuevo color** → añadirlo a `colors` en AMBOS `styles.js` (web + native). Añadirlo además a AMBOS `tailwind.config` **solo si se va a usar como clase utilitaria** (`bg-x`, `text-x`); los tokens que solo se usan inline vía `colors.X` (como `teal`, `pink`, `gifBg`) no hace falta duplicarlos en los configs
3. **Tailwind configs** importan desde `styles.js` — nunca hardcodear valores en los configs
4. **Opacidades decorativas** (gradientes, sombras en Landing) → usar constantes `RGB_SUCCESS` / `RGB_PURPLE` exportadas desde `styles.js` con template literals: `` `rgba(${RGB_SUCCESS}, 0.08)` ``
5. **No duplicar tokens semánticos** — si dos tokens tienen el mismo valor hex, usar uno solo (ej: `orange` cubre tanto el acento naranja como el color de dropset)
6. **`success` (lima `#A8E600`) — cuidado con el alpha sobre fondos oscuros.** Al ser amarillo-verde sin azul, en translúcido vira a oliva/caqui. Regla:
   - **Estado "seleccionado/activo"**: SÍ se usa el wash lima suave `successBg` (~0.12) como fondo, combinado con borde + texto lima sólidos. Es el patrón establecido en toda la app (chips/opciones de `NewRoutineFlow`, `OnboardingWizard`, badges como `PlanBadge`, `StreakCard`, etc.) y es el que se debe seguir por consistencia.
   - **Marcar "hecho" o teñir superficies grandes**: NO usar wash lima (viraría a oliva); usar el lima en **sólido** (borde, barra, icono, texto, check) o un neutro elevado (`bgTertiary`).
   - **Primer plano SOBRE lima sólido** (check, icono o texto dentro de un relleno lima `success`/`actionPrimary`): SIEMPRE `bgPrimary` (oscuro), NUNCA `white` — el lima es muy claro y el blanco encima no contrasta. Patrón establecido: `SetRow` (check), `OnboardingWizard`/`NewRoutineFlow` (radios).

**Tokens válidos = las claves del objeto `colors` en `apps/web/src/lib/styles.js`** (idéntico en native). Es la fuente de verdad: léela al elegir token, no la dupliques en docs ni inventes nombres.
⚠️ NO existen `accent`/`accentHover`/`accentBg`/`accentBgSubtle` — el acento naranja es `orange`/`orangeBg`; la acción primaria (lima) es `actionPrimary`/`actionPrimaryBg`.

## Internationalization (i18n)

### Architecture
- All translations live in `packages/shared/src/i18n/locales/{es,en}/` as JSON files
- i18n auto-initializes with Spanish — `t()` works immediately at module load
- Both apps use `react-i18next` for component-level translations
- Language preference persisted in `user_preferences` table (key: `language`)

### Translation namespaces
| Namespace | File | Content |
|-----------|------|---------|
| `common` | `common.json` | Buttons, labels, nav, preferences, offline banner |
| `auth` | `auth.json` | Login, signup, forgot/reset password |
| `routine` | `routine.json` | Routines, days, blocks, superset, chatbot, volume |
| `exercise` | `exercise.json` | Exercises, muscle groups, measurement types |
| `workout` | `workout.json` | Sessions, sets, rest timer, summary, history, PRs |
| `body` | `body.json` | Body weight, body measurements |
| `validation` | `validation.json` | Form validation errors |
| `data` | `data.json` | Reference data: muscle groups, block names, sensations, RIR, set types, measurement type labels |

### How to add user-facing text

**In components** (web/native) — use the `useTranslation` hook:
```jsx
import { useTranslation } from 'react-i18next'

export default function MyComponent() {
  const { t } = useTranslation()
  return <button>{t('common:buttons.save')}</button>
}
```

**In shared lib/hooks/API** — use `t` from `@gym/shared` i18n module:
```js
import { t } from '../i18n/index.js'
return { valid: false, error: t('validation:nameRequired') }
```

**Interpolation** — use `{{variable}}` syntax:
```js
t('routine:deleteConfirm', { name: routine.name })
// "¿Seguro que quieres eliminar "PPL"?"
```

### Rules for new code
1. **NEVER hardcode user-facing strings** — always use `t('namespace:key')`
2. **Add keys to BOTH** `es/*.json` AND `en/*.json` when creating new text
3. **Use existing keys** before creating new ones — check the JSON files first
4. **Namespace by domain** — use the namespace that matches the feature area
5. **Keep keys descriptive** — `routine:day.deleteConfirm` not `routine:msg1`

### Estilo de copy de UI (sin "AI smell")
Los **textos de usuario** (valores en `es/*.json` y `en/*.json`) deben sonar humanos, como los escribiría una persona. Evita los tells típicos de texto generado por IA:
- ❌ **Em dash (`—`)** en copy. Usa punto, coma o paréntesis.
- ❌ **Punto y coma (`;`)** en copy. Parte en frases cortas con punto.
- ❌ Construcciones **`Etiqueta: detalle`** redundantes, relleno grandilocuente ("máxima potencia", "lleva tu X al siguiente nivel"), listas separadas por `—`.
- ✅ Directo y concreto, frases cortas. Como una persona, no como un folleto.

⚠️ Aplica SOLO a copy de UI (valores de i18n), **no** a documentación ni comentarios de código (`CLAUDE.md`, `docs/`, JSDoc pueden usar `—`, `;`, etc. con normalidad).

### DB reference data translation
- **Muscle groups** (from `muscle_groups` table): display with `translateMuscleGroup(dbName)` from `@gym/shared`
- **Block names** (`'Calentamiento'`, `'Principal'`, `'Añadido'`): stored in DB as Spanish identifiers. Use `BLOCK_NAMES.WARMUP` etc. in code logic, `translateBlockName(dbName)` for display
- **User-generated content** (routine names, exercise names, notes): NOT translated — stays in the language the user wrote

### Constants with translated labels
Static constants evaluated at module load use getters or Proxy for lazy translation:
```js
// For new translated constants, use getter functions:
export function getSensationLabels() {
  return { 1: t('data:sensation.1'), ... }
}

// Backwards-compatible proxy exists for: SENSATION_LABELS, SET_TYPE_LABELS
```

### When modifying i18n
1. Edit translation JSON files in `packages/shared/src/i18n/locales/`
2. Always update **both** `es/` and `en/` files
3. Run `npm run test:shared` — tests auto-init i18n with Spanish
4. Run `npm run build` — verify no missing exports

## Database Schema

**Fuente de verdad del estado ACTUAL**: `apps/web/supabase/schema.sql` (dump schema-only generado, commiteado). Consulta ESE archivo para saber qué tablas/columnas/constraints/RPCs existen HOY. Las migraciones (`apps/web/supabase/migrations/`) son el ledger append-only para *aplicar* cambios, malas para *consultar* el estado actual (p. ej. `routine_blocks` se creó y luego se eliminó en la 031). Regenerar con `npm run db:schema` **desde `apps/web`** (requiere Docker; desde la raíz la CLI se inventa otro proyecto y crea un `supabase/` vacío ahí). ⚠️ Ese script empieza por `supabase db reset`, que reconstruye la BD **local** desde cero: es justo eso lo que garantiza `schema.sql == migraciones`, así que **no lo saltes dumpeando a secas** (sin reset el dump refleja tu BD local tal cual, migración nueva sin aplicar incluida, y el guard A7 no lo detecta: solo mira que `schema.sql` esté en el diff — así se perdió la RPC `duplicate_routine_day` del snapshot, ver `docs/DECISIONS.md`). El reset no cuesta nada: `supabase/seed.sql` recrea el usuario `e2e@local.test` en cada uno y los e2e ya resetean la BD ellos mismos, así que la local es desechable por diseño. El checklist de "cuando se modifique el modelo de datos" vive en `docs/routine-io.md`. Rationale y gotchas en `docs/DECISIONS.md` (issue #19). El diagrama de abajo es solo orientación de alto nivel.

**Permisos**: los de los roles de la API (`anon`, `authenticated`, `service_role`) se conceden en migraciones (ver 057), ya NO se heredan de los default privileges de la imagen de Postgres, que dejó de darlos. Una tabla nueva necesita su GRANT (o los default privileges ya restaurados) o la app responde 42501. Lo que protege los datos es RLS, no la ausencia de GRANT.

```
muscle_groups ← exercises (muscle_group_id)
    ↓
routines → routine_days → routine_exercises (→ exercises)

workout_sessions → session_exercises → completed_sets
```

Key relations:
- `exercises.muscle_group_id` → Single muscle group per exercise
- `routine_exercises` → Config del ejercicio en un día de rutina (series, reps, rir, notas); cuelga de `routine_days` vía `routine_day_id` (ya NO existe `routine_blocks`; el calentamiento es `is_warmup`, la superserie es `superset_group`)
- `session_exercises` → Ejercicio realizado en una sesión (referencia opcional a `routine_exercise_id`)
- `completed_sets` → Series realizadas, cuelgan de `session_exercises`. Tiene columna propia para los 7 campos de medición (`weight`, `reps_completed`, `time_seconds`, `distance_meters`, `calories_burned`, `level`, `pace_seconds`); cuáles se usan lo decide el ejercicio
- `routine_exercises.target_field` (+ snapshot en `session_exercises`) → **de qué campo habla el objetivo** guardado en `reps` (que es texto libre: "8-12", "20min", "5km"). El valor mantiene el nombre `reps` por historia. `routine_exercises.level` = nivel de máquina prescrito. Papeles de los campos (progresable / objetivo / resultado) en `lib/measurementFields.js`; resolver SIEMPRE con `resolveTargetField(row.target_field, trackedFields)`
- `exercises.tracked_fields` (`measurement_field[]`, 1 a 3) → **qué mide** el ejercicio. Sustituye al enum `measurement_type` (12 combinaciones cerradas). De ahí se derivan columnas de la fila, validación, formato, métricas de stats y de PR: ver `lib/measurementFields.js` y resolver SIEMPRE con `resolveTrackedFields(exercise)`

Deletion strategy:
- `exercises` → Soft delete (`deleted_at`). Necesario porque sesiones pasadas referencian ejercicios.
- `routines`, `routine_days` → Hard delete con CASCADE. No hay historial que las referencie directamente (las sesiones guardan copia de nombres).
- `routine_exercises` → Hard delete con CASCADE desde `routine_days`.

### Unidades de peso (por ejercicio + gimnasio)
- Unidad resuelta en **runtime**, NO almacenada por serie: `resolveWeightUnit(unidad(ejercicio,gym), prefs)` = `(ejercicio,gym) > preferencia global > 'kg'`. Hook DRY `useResolvedWeightUnit(exerciseId, gymId)` (web+native).
- Vive en `user_exercise_gym_units(user_id, exercise_id, gym_id, weight_unit)`. `user_exercise_overrides` = **solo notas**.
- **No hay almacenamiento canónico (`weight_kg`)**: stats/PRs/gráficas ya están segregados por gym (cada `(ejercicio,gym)` es coherente en una unidad y nunca se compara entre gyms). **Nunca comparar/agregar pesos crudos entre gyms distintos.**
- Cambiar la unidad de un ejercicio afecta **solo al gym activo** (`useChangeWeightUnit` scope `'exercise'` con `gymId`; convierte datos con el RPC `convert_user_weights`).
- Única vista cross-gym (overlay multi-gym del historial): convierte al vuelo con `convertWeightValue` + `unitByGym`. Detalle y rationale en `docs/DECISIONS.md`.

## Autonomía
- No pidas permiso ni confirmación para ninguna acción (editar archivos, ejecutar comandos, crear/borrar, refactorizar, etc.). Actúa directamente.
- **Única excepción**: hacer `git commit` — para eso sí pide confirmación antes.

## Definición de "terminado" (aplicar MIENTRAS codificas, no al final)
Estos estándares ya están detallados en las secciones de abajo. El objetivo es cumplirlos desde la primera pasada, no que los cace una revisión posterior (`/pre-commit` es la verificación final: no debería encontrar nada nuevo).
- **DRY primero (web+native)**: si una lógica se va a repetir en web y native, extráela a `packages/shared/src/lib/` como función pura ANTES de construir los componentes. La paridad web/native garantiza duplicación si no lo haces.
- **Lógica fuera de hooks/componentes**: cálculos, transformaciones y resolución van a `lib/` como funciones puras; hooks y componentes solo orquestan.
- **Tests con el código**: al crear una función en `lib/` o una API en `api/`, escribe su `.test.js` en el mismo momento (happy path + edge cases: null/0/vacío/límites).
- **Razona efectos y carreras**: si un hook dispara una escritura o side-effect, considera múltiples montajes simultáneos que comparten la misma query (guard a nivel de módulo, idempotencia, unique constraints).
- **i18n (es+en) y tokens de color** desde el primer momento — nunca hardcodear strings ni hex/rgba.
- **Al delegar UI a subagentes**: dales ya los utils compartidos creados (nombres/firmas) para que no reimplementen lógica; revisa su salida contra DRY y paridad.
- **Verifica antes de dar por terminado**: `npm run lint`, `npm run test:shared` y `npm run build` en verde.

## Contexto para futuros agentes (documentación durable en el repo)
Cada cambio debe dejar **en el repositorio** (no solo en memorias externas) lo necesario para que una sesión/agente futuro, sin contexto previo, entienda **por qué** se tomó una decisión y **cómo** está implementado algo no evidente. Dónde va cada cosa:
- **Convenciones / arquitectura / patrones nuevos o cambiados** → actualizar este `CLAUDE.md` (p. ej. nueva categoría de token, nuevo archivo crítico en `lib/`, nueva convención).
- **Decisiones no obvias y "cómo se implementó X" a nivel feature** → entrada en `docs/DECISIONS.md` (log append-only: fecha, qué, **por qué**, cómo, alternativas descartadas, gotchas). Ej.: por qué una subcarpeta concreta en un bucket, por qué una dependencia nativa concreta, por qué una versión de esquema.
- **"Porqué" local no evidente** (valor mágico, workaround, orden que importa) → comentario inline con el *por qué*, no el *qué*.
- **Env vars / config nuevas** → `.env.example` de ambas apps + descripción.
**Escueto y denso**: este contexto crece sin límite y lo cargan agentes futuros, así que cada línea debe aportar algo **no derivable leyendo el código**. Nada de relleno ni de repetir lo que ya está en el código o aquí. No documentar lo obvio: apuntar solo a decisiones, trade-offs, gotchas e implementaciones no triviales, en el mínimo de palabras que preserve el valor.

## Git Commits
- Spanish commit messages
- One feature/fix per commit
- No co-author or AI attribution lines

## PRs y auto-merge
**Al crear una PR en este repo (`gh pr create`):**
1. **Título en inglés, Conventional Commits** (`feat: ...`, `fix(scope): ...`, `chore: ...`) — el check `Formato Conventional Commits` lo rechaza si no. La descripción/body sí va en español.
2. **Activar auto-merge inmediatamente después de crearla**, sin esperar a que lo pida el usuario: `gh pr merge --auto --squash`. Es el flujo estándar del repo (ver abajo) — fusiona sola en cuanto pase el check `test`.

`main` solo permite **squash merge** (sin merge commit ni rebase): cada PR aterriza como un único commit cuyo mensaje es el título de la PR (`squash_merge_commit_title: PR_TITLE`). Ese commit es lo que `scripts/bump-version.js` escanea para decidir el bump semántico, así que **el título de la PR debe seguir Conventional Commits en inglés** (`feat:`, `fix:`, `chore:`, etc. — igual que un mensaje de commit normal, ver arriba), aunque la descripción vaya en español. Lo valida el workflow `pr-title.yml` (check requerido).
- Para activar auto-merge en una PR: `gh pr merge --auto --squash`. Se fusiona sola en cuanto el check `test` (CI) pase — no hace falta esperar ni pedir revisión.
- `main` NO exige "pull request obligatoria" en branch protection (solo status checks) para que `version.yml` pueda pushear el commit de bump directamente a `main` tras cada merge. Tampoco exige "rama al día", para que ese commit de bump no deje cada PR abierta pendiente de "Update branch".
- **`version.yml` pushea con `secrets.RELEASE_TOKEN` (PAT del dueño del repo), no con `GITHUB_TOKEN`.** Los required status checks bloquean CUALQUIER push a `main`, no solo el botón de merge — el bot de Actions no es admin del repo y no tiene bypass. Un PAT de un admin sí lo salta (`enforce_admins: false`). Detalle y alternativas descartadas en `docs/DECISIONS.md`.

## What NOT to Do
- ❌ TypeScript
- ❌ Multiple components per file
- ❌ Hooks scattered across many small files
- ❌ Generic names (`utils.js`, `helpers.js`)
- ❌ Deep folder nesting (max 2 levels in components)
- ❌ Inline styles (use Tailwind)
- ❌ Hardcoded color values (`#xxx`, `rgba(...)`) in components — use `colors.X` from `styles.js`
- ❌ Magic numbers (use constants)
- ❌ console.log in committed code
- ❌ Business logic in apps/ (belongs in packages/shared/src/lib/)
- ❌ Hardcoded user-facing strings (use `t()` from i18n)
- ❌ Inputs numéricos crudos (`<input type=number>` / `<TextInput keyboardType>` numérico) → usar `CaretEndInput` (web) / `NumberTextInput` (native) para el cursor-al-final al enfocar; `<Input type=number>` (web) ya lo hereda. Ver `docs/DECISIONS.md`
- ❌ `<input type="number">` para valores CON decimales (peso, distancia, medidas). El navegador decide el separador según SU locale: en uno de punto, teclear "82,5" guarda **825** sin avisar. Usar `DecimalInput` (o `<Input decimal>`) — web; native ya sanea la coma. Los enteros sí van en `type=number`. Ver `docs/DECISIONS.md`
- ❌ Devolver las flechitas a los `input[type=number]` de web: `index.css` las quita **globalmente** a propósito (en móvil no se usan y Chrome les reserva ~14px DENTRO del input, que en columnas estrechas recortan el valor). Decisión de app, no parche de una pantalla
- ❌ Adding translation keys to only one language (must add to both es/ and en/)
- ❌ Defaults silenciosos en el parseo de formularios (`parseInt(x) || 3`). Un campo obligatorio se **valida** y se muestra el error inline; el parser no inventa valores. Ver `routineExerciseForm.js` y `docs/DECISIONS.md`
- ❌ Etiquetas de unidad dentro de la fila de serie de la sesión (`nv ×`, `s`, `kcal`) ni anchos fijos en sus inputs. La unidad va en la **cabecera** de columna (`getSetColumns`) y la fila solo lleva inputs `w-full` en tracks `minmax(0,1fr)` — si no, la fila desborda la card. Mismo grid mida lo que mida el ejercicio. Ver `docs/DECISIONS.md`
- ❌ Pintar una duración en segundos crudos (`{timeSeconds}s`, `1200 s`) o pedirla en dos cajas mm+ss. Display: `formatDuration()`. Entrada: `SetValueInput` con campo `time`/`pace` (relleno por dígitos, `durationInput.js`). No hay unidad de tiempo configurable
- ❌ Rangos numéricos fijos para campos que dependen de lo que mide el ejercicio. El esfuerzo usa dos escalas (RIR `-1..3` si mide reps, RPE `1..5` si no): usar `getEffortOptions()` / `isValidEffortValue()`, nunca `min=0 max=5`
- ❌ Pintar un valor de esfuerzo crudo (`RIR {rir}`, `` `@${rir}` ``, `String(rir)`). Siempre `formatEffortBadge(value, trackedFields)` — en RPE el número guardado es un índice interno, la palabra es el dato. Si el componente tiene el `exercise`, resuelve los campos con `resolveTrackedFields(exercise)` (fallback único de lectura); si no lo tiene, recíbelos como prop. Ver `docs/DECISIONS.md`
- ❌ Adivinar de qué campo habla el objetivo de una rutina a partir de `tracked_fields`. El campo se GUARDA (`routine_exercises.target_field`) y se lee con `resolveTargetField()`; `getDefaultTargetField()` es solo el default del formulario y la lectura de filas antiguas. Y para comparar el objetivo con lo hecho hace falta su unidad: `parseTargetRange(target, targetField)`, que devuelve null si "20" no dice si son segundos o minutos
- ❌ Asumir que lo que se progresa es el peso ("Sube el peso" fijo, `currentWeight`, exigir peso + reps). El progresable lo decide `getProgressableField()`: peso si el ejercicio lo mide, NIVEL si no (en un cardio el nivel juega el papel del peso). Ver `docs/DECISIONS.md`
- ❌ Comparar un esfuerzo real con el prescrito a mano (`real >= objetivo`). La escala invierte el sentido (RIR: más alto = más fácil; RPE: más alto = más duro) → `metEffortTarget(real, objetivo, trackedFields)`
- ❌ Meter en la fila de serie nada que no sea un dato de la serie (referencia de la última vez, aviso de progresión, timer). Van a la subfila `SetRowMeta`, siempre en el mismo sitio, o roban ancho a los inputs. Ver `docs/DECISIONS.md`
- ❌ Differences between web and native — all screens must have the same appearance, section order, and functionality on both platforms unless technically impossible

## What TO Do
- ✅ One component = one file
- ✅ Hooks grouped by domain
- ✅ Index files for exports
- ✅ Descriptive names without abbreviations
- ✅ Comments only when logic isn't self-evident
- ✅ Handle loading/error states in components
- ✅ Extract business logic to `packages/shared/src/lib/` utilities
- ✅ Keep components "dumb" (UI only)
- ✅ Thin wrappers in apps/ inject platform callbacks, shared hooks do the work
- ✅ All user-facing text via `t()` — in components via `useTranslation()`, in shared code via `import { t } from '../i18n/index.js'`
- ✅ Translation keys in both es/ and en/ JSON files
- ✅ When working on web + React Native shared features, always verify changes work on BOTH platforms. Never assume web-only changes are sufficient

## Component Architecture: Dumb Components + Testable Utils

### Principle
All business logic should be extracted to utility functions in `packages/shared/src/lib/`. Components should only handle:
- UI rendering
- Event handling (calling utils/hooks)
- Local UI state (open/closed, hover, etc.)

### When to Extract Logic to `lib/`

Extract when logic:
- Is more than 5-10 lines
- Contains calculations or transformations
- Has multiple branches/conditions
- Could be reused elsewhere
- Needs unit testing

### Utility File Organization

| Logic Type | File | Example Functions |
|------------|------|-------------------|
| Date/time formatting | `dateUtils.js` | `formatFullDate()`, `formatRelativeDate()` |
| Time/duration | `timeUtils.js` | `formatDuration()`, `formatSecondsToMMSS()`, `calculateDurationMinutes()` |
| Workout calculations | `workoutCalculations.js` | `calculateEpley1RM()`, `calculateTotalVolume()` |
| Session transforms | `workoutTransforms.js` | `transformWorkoutSessionData()` |
| Set operations | `setUtils.js` | `isSetDataValid()`, `formatSetValue()` |
| Calendar logic | `calendarUtils.js` | `generateCalendarDays()` |
| Array operations | `arrayUtils.js` | `reorderArrayItem()`, `filterExercises()` |
| Form validation | `validation.js` | `validateSignupForm()`, `validateRoutineForm()` |
| Campos de medición del ejercicio | `measurementFields.js` | `resolveTrackedFields()`, `normalizeTrackedFields()`, `tracksReps()` |
| Papeles de los campos (objetivo / progresable) | `measurementFields.js` | `resolveTargetField()`, `getTargetableFields()`, `getDefaultTargetField()`, `getProgressableField()`, `getDefaultTarget()` |
| Progresión por serie (doble progresión) | `progressionUtils.js` | `parseTargetRange()`, `shouldSuggestProgression()`, `getProgressionLabel()` |
| Escala de esfuerzo (RIR/RPE) | `effortScale.js` | `getEffortOptions()`, `isValidEffortValue()`, `formatEffortBadge()`, `metEffortTarget()` |
| Acción de los botones de arrancar entrenamiento | `workoutStartAction.js` | `getFreeWorkoutAction()`, `getRoutineDayAction()`, `isSessionAlreadyInProgressError()` |
| Columnas de la fila de serie (sesión) | `setColumns.js` | `getSetColumns()` |
| Input de duración por dígitos (mm:ss) | `durationInput.js` | `durationDigitsToSeconds()`, `secondsToDurationDigits()`, `formatDurationDigits()` |
| Form de config de ejercicio en rutina/sesión | `routineExerciseForm.js` | `buildExerciseConfigForm()`, `validateExerciseConfigForm()`, `parseExerciseConfigForm()` |
| Prompts IA / formato JSON rutinas | `routineIO.js` | `buildChatbotPrompt()`, `ROUTINE_JSON_FORMAT` |
| Matching ejercicio→catálogo (import) | `exerciseMatch.js` | `normalizeExerciseName()`, `buildExerciseIndex()`, `resolveExerciseId()` |
| Text utilities | `textUtils.js` | `sanitizeFilename()` |

All these files live in `packages/shared/src/lib/` and are exported via `@gym/shared`.

### Archivos críticos: import/export de rutinas (JSON)

Dos archivos (no confundir): **`packages/shared/src/api/routineIOApi.js`** (export/import/duplicate, tocan BD; definen el esquema vía `ROUTINE_EXPORT_VERSION`, **actual: 8**) y **`packages/shared/src/lib/routineIO.js`** (prompts de IA + doc del formato `ROUTINE_JSON_FORMAT`/`ROUTINE_JSON_RULES`; puro, sin BD).

⚠️ **Emparejar por CLAVE ESTABLE** (`name_en` → `name_es` normalizado, vía `lib/exerciseMatch.js`), NUNCA por `name_es` solo. `importRoutine` debe seguir aceptando versiones antiguas del JSON.

**Detalle, rationale del emparejamiento y checklist de "cuando cambie el modelo de datos": ver `docs/routine-io.md`.**

### Example: Before and After

❌ **Before** - Logic embedded in component:
```jsx
// MonthlyCalendar.jsx
const calendarData = useMemo(() => {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  // ... 40 more lines of calendar logic
}, [currentDate, sessions])
```

✅ **After** - Logic in testable util:
```jsx
// MonthlyCalendar.jsx
import { generateCalendarDays } from '@gym/shared'

const calendarData = useMemo(
  () => generateCalendarDays(currentDate, sessions),
  [currentDate, sessions]
)
```

```js
// packages/shared/src/lib/calendarUtils.js
export function generateCalendarDays(currentDate, sessions) {
  // Pure logic, fully testable without React
}
```

### Creating New Components Checklist

1. [ ] Component file has single responsibility (UI only)
2. [ ] Business logic extracted to `packages/shared/src/lib/` utils
3. [ ] Utils are pure functions (no side effects)
4. [ ] Complex `useMemo`/`useCallback` calls util functions
5. [ ] Validation logic in `lib/validation.js`
6. [ ] Data transformations in appropriate util file
7. [ ] All user-facing strings use `t()` — no hardcoded Spanish/English
8. [ ] Translation keys added to both `es/*.json` and `en/*.json`

### Updating Existing Components Checklist

1. [ ] Identify embedded business logic (>5 lines in useMemo/handlers)
2. [ ] Extract to appropriate util file in `packages/shared/src/lib/`
3. [ ] Export from `packages/shared/src/index.js`
4. [ ] Import via `@gym/shared` and call from component
5. [ ] Verify component still works
6. [ ] Add tests for extracted util

### Utility Function Guidelines

1. **Pure functions** - Same input = same output, no side effects
2. **Single responsibility** - One function, one job
3. **Descriptive names** - `calculateEpley1RM` not `calc1RM`
4. **Handle edge cases** - null, undefined, empty arrays
5. **JSDoc comments** - Only for complex functions

```js
/**
 * Calculate estimated 1 rep max using Epley formula
 * @param {number} weight - Weight lifted
 * @param {number} reps - Repetitions performed
 * @returns {number} Estimated 1RM
 */
export function calculateEpley1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}
```

## Testing

### Test File Structure
```
packages/shared/src/lib/
├── dateUtils.js
├── dateUtils.test.js
├── workoutCalculations.js
├── workoutCalculations.test.js
└── ...

packages/shared/src/api/
├── routineApi.test.js
└── ...

packages/shared/src/hooks/
├── useRoutines.test.js
└── ...
```

### Running Tests
```bash
npm run check            # lint + tests (web + shared) + build (root; NO incluye e2e)
npm run test:shared      # run tests in packages/shared only
npm run test:run -w apps/web  # run web tests only
npm run lint             # lint all workspaces
npm run build            # verify build works
```

**Los e2e (Playwright) solo corren contra la Supabase LOCAL**, aquí y en CI (issue #55): `npm run test:e2e -w apps/web` empieza por `supabase db reset`, o sea que necesita Docker y el stack levantado (`npx supabase start` desde `apps/web`) y **reconstruye la BD local entera**. `scripts/assertLocalSupabase.js` (hook `pretest:e2e`, y también importado por `playwright.config.js`) aborta si `VITE_SUPABASE_URL` no es `127.0.0.1`/`localhost`: los specs escriben datos de verdad y nadie los limpia después. Sin el reset la suite empieza a fallar sola a la tercera ejecución seguida (los datos se acumulan y las rutinas creadas rompen locators de `createRoutine.spec.js`). ⚠️ **`test:e2e:ui` NO resetea**, a propósito: en el UI Mode relanzas a mano dentro de una ventana que sigue viva, así que un reset solo limpiaría la primera pasada, y encima se llevaría el estado del fallo que estás investigando. Si iterando empieza a fallar solo, lanza `npx supabase db reset` a mano. Credenciales en `apps/web/.env.example`; rationale en `docs/DECISIONS.md`.
