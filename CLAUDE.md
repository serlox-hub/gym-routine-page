# Gym Tracker - Claude Instructions

## Project Overview
Workout tracking app built with React + Vite + Supabase. Spanish UI with user authentication.

## Tech Stack
- React 18 (JavaScript, NO TypeScript)
- Vite
- Supabase (PostgreSQL + JS client + Auth)
- TanStack Query (data fetching)
- Zustand (local state)
- Tailwind CSS
- React Router DOM

## Project Structure

```
src/
├── components/           # UI components grouped by domain
│   ├── ui/              # Primitives (Button, Card, Modal, etc.)
│   │   └── index.js     # Re-exports all ui components
│   ├── Auth/            # Authentication components
│   │   └── index.js
│   ├── Exercise/        # Exercise-related components
│   │   └── index.js
│   ├── History/         # History/calendar components
│   │   └── index.js
│   ├── Routine/         # Routine management components
│   │   └── index.js
│   └── Workout/         # Active workout session components
│       └── index.js
├── hooks/               # Custom React hooks (one file per domain)
│   ├── useAuth.js       # Authentication hooks
│   ├── useExercises.js  # Exercise CRUD + queries
│   ├── useRoutines.js   # Routine CRUD + queries
│   └── useWorkout.js    # Session, history, timer hooks
├── lib/                 # Utilities and configurations
│   ├── supabase.js      # Supabase client
│   ├── constants.js     # App-wide constants (QUERY_KEYS, etc.)
│   ├── styles.js        # Shared style objects
│   ├── dateUtils.js     # Date formatting functions
│   ├── timeUtils.js     # Time/duration formatting
│   ├── setUtils.js      # Set validation and formatting
│   ├── workoutCalculations.js  # 1RM, volume calculations
│   ├── workoutTransforms.js    # Session data transformations
│   ├── calendarUtils.js        # Calendar generation
│   ├── arrayUtils.js           # Array manipulation
│   ├── measurementTypes.js     # Exercise measurement types
│   └── validation.js           # Form validation
├── pages/               # Route components (one per route)
├── stores/              # Zustand stores
│   ├── authStore.js
│   └── workoutStore.js
└── main.jsx             # App entry point
```

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
3. **Max 150 lines** - Split if larger
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
- Use index files for cleaner imports:
```js
// DO:
import { Button, Card, Modal } from '../components/ui'
import { useRoutines, useCreateRoutine } from '../hooks/useRoutines'

// DON'T:
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
```

### State Management
- **Server state**: TanStack Query (in hooks)
- **UI state**: React useState
- **Cross-component state**: Zustand stores

### Error Handling
- Always handle Supabase errors
- Show user-friendly messages in Spanish
- Use ErrorMessage component for display

### Styling
- Use Tailwind CSS classes
- Use style objects from `lib/styles.js` for consistency
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

## What TO Do
- ✅ One component = one file
- ✅ Hooks grouped by domain
- ✅ Index files for exports
- ✅ Descriptive names without abbreviations
- ✅ Comments only when logic isn't self-evident
- ✅ Handle loading/error states in components
- ✅ Extract business logic to `lib/` utilities
- ✅ Keep components "dumb" (UI only)

## Component Architecture: Dumb Components + Testable Utils

### Principle
All business logic should be extracted to utility functions in `src/lib/`. Components should only handle:
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

### Archivo crítico: routineIO.js

⚠️ **IMPORTANTE**: `src/lib/routineIO.js` contiene la lógica de importación y exportación de rutinas en formato JSON. Este archivo:

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
import { generateCalendarDays } from '../lib/calendarUtils.js'

const calendarData = useMemo(
  () => generateCalendarDays(currentDate, sessions),
  [currentDate, sessions]
)
```

```js
// lib/calendarUtils.js
export function generateCalendarDays(currentDate, sessions) {
  // Pure logic, fully testable without React
}
```

### Creating New Components Checklist

1. [ ] Component file has single responsibility (UI only)
2. [ ] Business logic extracted to `src/lib/` utils
3. [ ] Utils are pure functions (no side effects)
4. [ ] Complex `useMemo`/`useCallback` calls util functions
5. [ ] Validation logic in `lib/validation.js`
6. [ ] Data transformations in appropriate util file

### Updating Existing Components Checklist

1. [ ] Identify embedded business logic (>5 lines in useMemo/handlers)
2. [ ] Extract to appropriate util file
3. [ ] Import util and call from component
4. [ ] Verify component still works
5. [ ] Add tests for extracted util

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
src/lib/
├── dateUtils.js
├── dateUtils.test.js
├── timeUtils.js
├── timeUtils.test.js
├── workoutCalculations.js
├── workoutCalculations.test.js
└── ...
```

### Running Tests
```bash
npm run lint     # Check for linting errors
npm run build    # Verify build works
```
