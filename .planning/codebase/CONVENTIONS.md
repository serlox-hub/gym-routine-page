# Coding Conventions

**Analysis Date:** 2026-03-15

## Naming Patterns

**Files:**
- Components: `PascalCase.jsx` — `ExerciseCard.jsx`, `BodyWeightModal.jsx`
- Hooks: `camelCase.js` — `useRoutines.js`, `useWorkout.js`
- Pages: `PascalCase.jsx` — `RoutineDetail.jsx`, `Exercises.jsx`
- Stores: `camelCaseStore.js` — `workoutStore.js`, `authStore.js`
- Utilities: `camelCase.js` — `dateUtils.js`, `arrayUtils.js`
- API modules: `camelCaseApi.js` — `routineApi.js`, `exerciseApi.js`
- Constants: `SCREAMING_SNAKE_CASE` — `QUERY_KEYS`, `RIR_OPTIONS`, `SESSION_STATUS`

**Functions:**
- Queries/utilities: `camelCase` — `formatFullDate()`, `calculateEpley1RM()`, `filterBySearchTerm()`
- React components: `PascalCase` — `ExerciseCard`, `Modal`, `Button`
- Event handlers: `camelCase` with action prefix — `onSubmit`, `onClick`, `onDelete`, `onMoveToDay`
- Mutations: `useCreateRoutine()`, `useUpdateExercise()`, `useDeleteRoutineDay()`
- Internal utils: `camelCase` — `calculateNextSortOrder()`, `normalizeSearchText()`

**Variables:**
- Local state: `camelCase` — `form`, `selectedMuscleGroupId`, `showHistory`
- Constants: `SCREAMING_SNAKE_CASE` — `DEFAULT_FORM`, `VARIANTS`, `SIZES`
- Objects: `camelCase` — `inputStyle`, `menuItems`, `positionOptions`

**Types/Objects:**
- Enum-like objects: `SCREAMING_SNAKE_CASE` — `MUSCLE_GROUP_COLORS`, `SENSATION_LABELS`
- Style objects: `camelCase` followed by purpose — `colors`, `inputStyle`, `buttonSecondaryStyle`

## Code Style

**Formatting:**
- No explicit prettier config detected
- Code uses consistent spacing and 2-space indentation
- Tailwind CSS classes for styling (no inline styles except for dynamic values)
- No TypeScript (JavaScript only)

**Linting:**
- Tool: ESLint (modern flat config format in `eslint.config.js`)
- No-console warnings enabled
- Prefer const: error (strict enforcement)
- No-var: error (strict enforcement)
- Unused variables with `_` prefix are allowed (e.g., `_variableName`)

**ESLint Rules in Effect:**
- `react/react-in-jsx-scope`: off (React 18 JSX transform)
- `react/prop-types`: off (No PropTypes required)
- `react-hooks/rules-of-hooks`: error
- `react-hooks/exhaustive-deps`: warn
- `no-console`: warn (warnings allowed)
- `prefer-const`: error
- `no-var`: error

## Import Organization

**Order:**
1. React/third-party libraries: `import { useState } from 'react'`
2. Third-party hooks/utilities: `import { useQuery } from '@tanstack/react-query'`
3. Icons: `import { Pencil, Trash2, Loader2 } from 'lucide-react'`
4. Local components: `import { Card, DropdownMenu } from '../ui/index.js'`
5. Local hooks: `import { useRoutines } from '../../hooks/useRoutines.js'`
6. Local utilities/constants: `import { colors } from '../../lib/styles.js'`
7. Local stores: `import { useWorkoutStore } from '../../stores/workoutStore.js'`

**Path Aliases:**
- `@`: Maps to `src/` directory (configured in vite.config.js)
- Relative imports preferred over aliases in actual codebase

**Barrel Files (Index Exports):**
- Used extensively: `src/components/ui/index.js`, `src/components/Routine/index.js`
- Pattern: `export { default as ComponentName } from './ComponentName.jsx'`
- Benefits: Cleaner imports — `import { Button, Card } from '../ui'` instead of multiple imports

## Error Handling

**Pattern:**
- Custom hooks return `{ data, isLoading, error }` from TanStack Query
- Components check `isLoading` and `error` states
- `ErrorMessage` component displays errors to users (see `src/components/ui/ErrorMessage.jsx`)
- Spanish error messages for user-facing content
- Supabase errors caught at hook level and exposed via `error` property

**Example Pattern:**
```js
// In hooks
export function useRoutines() {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINES],
    queryFn: fetchRoutines
  })
}

// In components
const { data, isLoading, error } = useRoutines()
if (error) return <ErrorMessage message={error.message} />
if (isLoading) return <LoadingSpinner />
```

**Validation Pattern:**
- All validation functions return `{ valid: boolean, error: string|null }`
- Example: `validateSignupForm()`, `validateLoginForm()`, `validateRoutineForm()` in `src/lib/validation.js`
- Business logic (trimming, sanitizing) in separate functions: `prepareRoutineData()`

## Logging

**Framework:** `console` (no custom logging library)

**Patterns:**
- No `console.log` in committed code (ESLint warns against it)
- Errors logged only in development/debugging, cleaned before commit
- No logging statements in utility functions (keep pure)

## Comments

**When to Comment:**
- Complex calculations: `// 100kg x 10 reps = 100 * (1 + 10/30) = 100 * 1.333 = 133`
- Non-obvious business logic (e.g., form data transformations)
- Important rules or constraints

**JSDoc/TSDoc:**
- Used for public utility functions with complex logic
- Pattern: Description, `@param`, `@returns`
- Example from `dateUtils.js`:
```js
/**
 * Formatea una fecha en formato largo (ej: "lunes, 15 de enero de 2024")
 * @param {string} dateStr - Fecha en formato ISO
 * @param {string} locale - Locale para formateo (default: 'es-ES')
 * @returns {string}
 */
export function formatFullDate(dateStr, locale = 'es-ES') { ... }
```

**Inline Comments:**
- Block-level dividers for hook organization:
```js
// ============================================
// QUERIES
// ============================================
```
- Rare single-line comments for non-obvious logic only

## Function Design

**Size Guidelines:**
- Components: Max ~150 lines (split larger components)
- Hooks: Grouped by domain, each hook focused on single responsibility
- Utilities: Kept small and focused (one job per function)

**Parameters:**
- Components: Props destructured at signature level
- Hooks: Use optional parameters with default values
- Utilities: Explicit parameters (no object spreading unless needed)

**Return Values:**
- Utilities: Return data directly or null if empty
- Hooks: Follow TanStack Query pattern — `{ data, isLoading, error }`
- Mutation hooks: Return TanStack mutation object with `mutationFn`, `onSuccess`, `onError`

**Arrow Functions vs Named:**
- Named functions for exports and main logic
- Arrow functions for inline callbacks and short helpers

## Module Design

**Exports:**
- Components: Default export — `export default ComponentName`
- Utilities: Named exports — `export function utilityName() { ... }`
- Stores: Default export with Zustand instance — `export default useWorkoutStore`
- Hooks: Named exports from hook files (multiple per file, grouped by domain)

**Barrel Files:**
- Every component directory has `index.js` for re-exports
- Pattern: `export { default as ComponentName } from './ComponentName.jsx'`
- Used in all directories: `ui/`, `Auth/`, `Exercise/`, `Routine/`, `Workout/`, etc.

## State Management

**Pattern Distribution:**
- Server state (data from Supabase): TanStack Query in hooks
- UI state (local): React `useState`
- Cross-component state (persistent): Zustand stores (`workoutStore.js`, `authStore.js`)

**Zustand Store Pattern (workoutStore.js example):**
- Single store instance with multiple state slices
- Methods for state mutations
- Used for: active session data, rest timer state, UI flags
- Persisted to localStorage via `persist` middleware

## Component Architecture

**Pattern:**
- Dumb/UI-focused components (minimal logic)
- Business logic extracted to `src/lib/` utilities
- Hooks for data fetching and state management
- Components receive props and call utility functions

**Example Structure:**
```jsx
// Component - UI focused
import { useRoutines } from '../../hooks/useRoutines'
import { validateRoutineForm } from '../../lib/validation'

function RoutineForm({ onSubmit }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const { data, error } = useRoutines()

  const handleSubmit = () => {
    const { valid, error } = validateRoutineForm(form)
    if (!valid) return setError(error)
    onSubmit(form)
  }

  return <form>{/* JSX */}</form>
}
```

```js
// Utility - testable, pure
export function validateRoutineForm({ name }) {
  if (!name?.trim()) {
    return { valid: false, error: 'El nombre es obligatorio' }
  }
  return { valid: true, error: null }
}
```

## Database Column Naming

- Spanish names used in database: `nombre`, `descripcion`, `peso`, `series`, `repeticiones`
- JavaScript field names are camelCase versions: `name`, `description`, `weight`, `series`, `reps`
- API response keys use snake_case from database: `muscle_group_id`, `created_at`, `updated_at`

## Critical Utility File: routineIO.js

**Location:** `src/lib/routineIO.js`

**Purpose:** Handles import/export of routines in JSON format for AI-powered routine creation

**Key Functions:**
- `buildChatbotPrompt()` — Generates prompt for AI routine creation
- `buildAdaptRoutinePrompt()` — Generates prompt for converting existing routines to JSON
- `ROUTINE_JSON_FORMAT` — Schema documentation for JSON format (version 4)
- `ROUTINE_JSON_RULES` — Validation rules and required fields

**When Modifying Database Schema:**
1. Update `ROUTINE_JSON_FORMAT` to include new fields
2. Update `ROUTINE_JSON_RULES` if new validation needed
3. Update any export/import functions that process the JSON
4. Update related tests in `routineIO.test.js`
5. Consider version increment if breaking changes

---

*Convention analysis: 2026-03-15*
