# Gym Tracker - Claude Instructions

## Project Overview
Monorepo with web (React + Vite) and mobile (Expo + NativeWind) apps sharing business logic via `@gym/shared`. Spanish UI with user authentication backed by Supabase.

## Tech Stack
- React 18 (JavaScript, NO TypeScript)
- Vite (web), Expo managed workflow (mobile)
- Supabase (PostgreSQL + JS client + Auth)
- TanStack Query (data fetching) — synced version across apps
- Zustand (local state) — synced version across apps
- Tailwind CSS (web) / NativeWind v4 (mobile)
- React Router DOM (web) / React Navigation (mobile)
- `@gym/shared` — shared business logic package

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
import { initApi, initStores, initNotifications } from '@gym/shared'

initApi(supabaseClient)           // inject Supabase client before any API call
initStores({ authStore, workoutStore })  // inject store instances
initNotifications(showToast)      // inject platform-specific toast function
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
- **UI text**: Spanish (user-facing strings)
- **Database columns**: Spanish (nombre, descripcion, etc.)

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
- Show user-friendly messages in Spanish
- Use ErrorMessage component for display

### Styling
- Use Tailwind CSS classes (web) / NativeWind classes (mobile)
- Use style objects from `lib/styles.js` for consistency (web)
- Design tokens: `colors.textPrimary`, `colors.bgSecondary`, etc.

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
- ❌ Magic numbers (use constants)
- ❌ console.log in committed code
- ❌ Business logic in apps/ (belongs in packages/shared/src/lib/)

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
