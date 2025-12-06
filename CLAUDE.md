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
│   └── styles.js        # Shared style objects
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
