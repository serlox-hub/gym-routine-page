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
initApi(supabaseClient)                   // inject Supabase client before any API call
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

### Error Handling
- Always handle Supabase errors
- Show user-friendly messages via `t()` (never hardcoded strings)
- Use ErrorMessage component for display

### Styling
- Use Tailwind CSS classes (web) / NativeWind classes (mobile)
- Use style objects from `lib/styles.js` for consistency
- **Safe Area (native)**: Todo contenido visible debe respetar el safe area (notch, Dynamic Island, home indicator). Usar `SafeAreaView` de `react-native-safe-area-context` para layouts, o `useSafeAreaInsets()` para elementos con `position: 'absolute'` que necesitan offset manual. Nunca usar valores fijos de `top`/`bottom` sin sumar el inset correspondiente.

### Color System (CRITICAL)

**Single source of truth**: `apps/web/src/lib/styles.js` y `apps/gym-native/src/lib/styles.js`. Ambos archivos DEBEN tener los mismos tokens de color (objeto `colors` idéntico).

**Rules:**
1. **NUNCA** usar hex/rgba hardcodeados en componentes. Siempre `colors.X` importado desde `lib/styles.js`
2. **Nuevo color** → añadirlo a `colors` en AMBOS `styles.js` (web + native) y a AMBOS `tailwind.config` (web + native)
3. **Tailwind configs** importan desde `styles.js` — nunca hardcodear valores en los configs
4. **Opacidades decorativas** (gradientes, sombras en Landing) → usar constantes `RGB_ACCENT` / `RGB_PURPLE` exportadas desde `styles.js` con template literals: `` `rgba(${RGB_ACCENT}, 0.08)` ``
5. **No duplicar tokens semánticos** — si dos tokens tienen el mismo valor hex, usar uno solo (ej: `orange` cubre tanto el acento naranja como el color de dropset)

**Token categories:**
- Fondos: `bgPrimary`, `bgSecondary`, `bgAlt`, `bgTertiary`, `bgHover`
- Texto: `textPrimary`, `textSecondary`, `textMuted`, `textLight`, `textDisabled`, `textDark`, `white`, `black`
- Acentos: `accent`, `accentHover`, `success`, `warning`, `danger`, `purple`, `purpleAccent`, `teal`, `pink`, `orange`, `actionPrimary`
- Fondos semánticos (alpha): `accentBg`, `accentBgSubtle`, `purpleBg`, `purpleAccentBg`, `successBg`, `warningBg`, `orangeBg`, `dangerBg`, `actionPrimaryBg`, `overlay`
- Bordes: `border`

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

```
exercises (muscle_group_id → muscle_groups)
    ↓
routine_exercises
    ↓
routine_blocks
    ↓
routine_days
    ↓
routines

workout_sessions → completed_sets
```

Key relations:
- `exercises.muscle_group_id` → Single muscle group per exercise
- `routine_exercises` → Exercise config in a routine (series, reps, tempo, notas)
- `completed_sets` → Actual performed sets with weight/reps

Deletion strategy:
- `exercises` → Soft delete (`deleted_at`). Necesario porque sesiones pasadas referencian ejercicios.
- `routines`, `routine_days`, `routine_blocks` → Hard delete con CASCADE. No hay historial que las referencie directamente (las sesiones guardan copia de nombres).
- `routine_exercises` → Hard delete con CASCADE desde routine_blocks.

## Git Commits
- Spanish commit messages
- One feature/fix per commit
- No co-author or AI attribution lines

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
- ❌ Adding translation keys to only one language (must add to both es/ and en/)
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
| Time/duration | `timeUtils.js` | `formatSecondsToMMSS()`, `calculateDurationMinutes()` |
| Workout calculations | `workoutCalculations.js` | `calculateEpley1RM()`, `calculateTotalVolume()` |
| Session transforms | `workoutTransforms.js` | `transformWorkoutSessionData()` |
| Set operations | `setUtils.js` | `isSetDataValid()`, `formatSetValue()` |
| Calendar logic | `calendarUtils.js` | `generateCalendarDays()` |
| Array operations | `arrayUtils.js` | `reorderArrayItem()`, `filterExercises()` |
| Form validation | `validation.js` | `validateSignupForm()`, `validateRoutineForm()` |
| Measurement types | `measurementTypes.js` | `measurementTypeUsesWeight()` |
| Import/Export rutinas | `routineIO.js` | `importRoutine()`, `exportRoutine()` |
| Text utilities | `textUtils.js` | `sanitizeFilename()` |

All these files live in `packages/shared/src/lib/` and are exported via `@gym/shared`.

### Archivo crítico: routineIO.js

⚠️ **IMPORTANTE**: `packages/shared/src/lib/routineIO.js` contiene la lógica de importación y exportación de rutinas en formato JSON. Este archivo:

- Define el **esquema de exportación** (versión actual: 4)
- Mapea la estructura de la base de datos al formato JSON y viceversa
- Genera el prompt para crear rutinas con IA

**Cuando se modifique el modelo de datos** (tablas `routines`, `routine_days`, `routine_blocks`, `routine_exercises`, `exercises`):
1. Actualizar `exportRoutine()` para incluir los nuevos campos en el JSON
2. Actualizar `importRoutine()` para leer los nuevos campos del JSON
3. Actualizar `buildChatbotPrompt()` si afecta al prompt de IA
4. Considerar incrementar la versión del esquema si hay cambios breaking
5. Actualizar los tests en `routineIO.test.js`

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
npm run check            # lint + test:shared + test:web + e2e + build (root)
npm run test:shared      # run tests in packages/shared only
npm run test:run -w apps/web  # run web tests only
npm run lint             # lint all workspaces
npm run build            # verify build works
```
