# Codebase Structure

**Analysis Date:** 2026-03-15

## Directory Layout

```
src/
├── components/           # UI components grouped by domain
│   ├── ui/              # Reusable primitives (Button, Card, Modal, Input, etc.)
│   │   └── index.js     # Re-exports all UI components
│   ├── Auth/            # Authentication components (PrivateRoute)
│   ├── Home/            # Home page components (QuickActions, RoutineList, NewRoutineFlow)
│   ├── Landing/         # Landing/public page components
│   ├── Routine/         # Routine editing components (AddDayModal, BlockSection, etc.)
│   ├── Workout/         # Active workout session components (SetRow, SessionExerciseList, etc.)
│   ├── Exercise/        # Exercise management components
│   ├── History/         # Workout history/calendar components
│   ├── BodyWeight/      # Body weight tracking components
│   └── ErrorBoundary.jsx # Global error boundary component
├── hooks/               # Custom React hooks (one file per domain)
│   ├── useAuth.js       # Authentication state and actions
│   ├── useExercises.js  # Exercise queries and CRUD mutations
│   ├── useRoutines.js   # Routine queries and CRUD mutations
│   ├── useSession.js    # Session restoration and completion
│   ├── useWorkout.js    # Barrel export of workout-related hooks
│   ├── useCompletedSets.js    # Set completion mutations and queries
│   ├── useSessionExercises.js # Session exercise queries and mutations
│   ├── useWorkoutHistory.js   # Workout history queries
│   ├── useRestTimer.js  # Rest timer mutations
│   ├── useBodyWeight.js # Body weight tracking hooks
│   ├── useBodyMeasurements.js # Body measurement tracking hooks
│   ├── usePreferences.js      # User preferences queries/mutations
│   ├── useAdmin.js      # Admin functions hooks
│   └── useDrag.js       # Drag and drop utilities
├── lib/                 # Utilities, configs, and business logic
│   ├── api/             # Supabase API calls (one file per domain)
│   │   ├── exerciseApi.js         # Exercise CRUD, stats
│   │   ├── routineApi.js          # Routine and structure CRUD
│   │   ├── workoutApi.js          # Workout session and set operations
│   │   ├── bodyWeightApi.js       # Weight tracking
│   │   ├── bodyMeasurementsApi.js # Measurements tracking
│   │   ├── preferencesApi.js      # User preferences
│   │   └── adminApi.js            # Admin operations
│   ├── supabase.js      # Supabase client initialization
│   ├── queryClient.js   # TanStack Query client config
│   ├── constants.js     # App-wide constants (QUERY_KEYS, colors, enums)
│   ├── styles.js        # Design tokens and style objects
│   ├── dateUtils.js     # Date formatting and parsing
│   ├── timeUtils.js     # Duration and time formatting
│   ├── setUtils.js      # Set data validation and formatting
│   ├── workoutCalculations.js     # Epley 1RM, volume, etc.
│   ├── workoutTransforms.js       # Session data transformations
│   ├── calendarUtils.js # Calendar generation and utilities
│   ├── arrayUtils.js    # Array manipulation (reorder, filter, etc.)
│   ├── measurementTypes.js        # Exercise measurement type definitions
│   ├── validation.js    # Form and data validation functions
│   ├── routineIO.js     # Routine import/export (JSON)
│   ├── routineTemplates.js        # Pre-built routine templates
│   ├── routineExerciseForm.js     # Routine exercise form defaults
│   ├── supersetUtils.js # Superset utilities
│   ├── measurementConstants.js    # Body measurement types
│   └── bodyMeasurementCalculations.js # Measurement calculations
├── pages/               # Route components (one per route)
│   ├── Home.jsx         # Main dashboard
│   ├── Landing.jsx      # Public landing page
│   ├── Login.jsx        # Login form
│   ├── Signup.jsx       # Signup form
│   ├── ForgotPassword.jsx      # Password recovery request
│   ├── ResetPassword.jsx       # Password reset form
│   ├── RoutineDetail.jsx       # Routine editor
│   ├── NewRoutine.jsx   # New routine creation
│   ├── WorkoutSession.jsx      # Active workout session
│   ├── FreeWorkoutSession.jsx  # Unplanned workout
│   ├── SessionDetail.jsx       # Completed session review
│   ├── History.jsx      # Workout history calendar
│   ├── Exercises.jsx    # Exercise browser
│   ├── NewExercise.jsx  # Add new exercise
│   ├── EditExercise.jsx # Edit exercise
│   ├── ExerciseProgress.jsx    # Exercise history and stats
│   ├── BodyMetrics.jsx  # Body weight and measurements tracking
│   ├── Preferences.jsx  # User settings
│   └── AdminUsers.jsx   # Admin user management
├── stores/              # Zustand state stores
│   ├── authStore.js     # Authentication and user session (persisted)
│   └── workoutStore.js  # Active workout and session state (persisted)
├── test/                # Test utilities and setup
│   └── setup.js         # Test environment configuration
├── App.jsx              # Root router and layout component
├── main.jsx             # React entry point with providers
└── index.css            # Global styles

```

## Directory Purposes

**src/components/ui/:**
- Purpose: Reusable UI primitives
- Contains: Button, Card, Modal, Input, Select, Textarea, Badge, Spinner, ErrorMessage, ConfirmModal, DropdownMenu, PageHeader, BottomActions, etc.
- Key files: `index.js` re-exports all primitives for clean imports
- Pattern: One component per file, no business logic, purely presentational

**src/components/[Domain]/:**
- Purpose: Feature-specific components (grouped by domain)
- Example domains: Auth, Home, Routine, Workout, Exercise, History, Landing, BodyWeight
- Contains: Complex components that use multiple hooks and UI primitives
- Index file: Each domain folder has `index.js` that re-exports its components
- Example: `src/components/Routine/` contains AddDayModal, BlockSection, DayCard, ExercisePickerModal, etc.

**src/hooks/:**
- Purpose: Encapsulate all data fetching and state subscription logic
- Naming: `use[Domain].js` (useExercises.js) or `use[Domain].test.js` for tests
- Each file: Exports multiple related functions (queries and mutations for same domain)
- Exports: Never default export, always named exports
- No circular dependencies: Hooks can import other hooks (useAuth), but shouldn't import components

**src/lib/:**
- Purpose: Pure utilities, configs, and API integration layer
- Three sub-categories:
  - `api/`: Supabase client calls (no business logic, just raw data operations)
  - Utilities: Pure functions (dateUtils, setUtils, validation, etc.)
  - Config: Client initialization (supabase, queryClient) and constants
- Pattern: All functions are pure (no side effects), exported as named exports
- Test organization: Test file lives next to source (dateUtils.js + dateUtils.test.js)

**src/pages/:**
- Purpose: Route-level components that compose the full page/feature
- Naming: PascalCase.jsx, one component per file
- No index file needed (Router imports directly)
- Responsibility: Fetch data via hooks, compose sub-components, handle page-level logic
- Size: Can be >150 lines (but should split sub-components into components/ folder)

**src/stores/:**
- Purpose: Cross-component state that doesn't belong in TanStack Query
- Contains: Zustand store definitions
- Pattern: `camelCaseStore.js` (authStore.js, workoutStore.js)
- Persistence: Both stores use `persist` middleware to restore from localStorage

**src/test/:**
- Purpose: Test utilities and configuration
- Contains: Test setup for vitest/jest, mock factories, helpers

## Key File Locations

**Entry Points:**
- `src/main.jsx`: React app initialization with providers
- `src/App.jsx`: Router configuration and lazy route loading
- `index.html`: HTML template (in project root)

**Configuration:**
- `.env`: Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- `vite.config.js`: Vite build configuration
- `tailwind.config.js`: Tailwind CSS configuration

**Core Logic:**
- `src/lib/supabase.js`: Supabase client (all API calls use this)
- `src/stores/authStore.js`: Authentication state and session management
- `src/stores/workoutStore.js`: Active workout state and optimistic updates
- `src/hooks/useAuth.js`: Auth state hook (bridges authStore to components)
- `src/hooks/useWorkout.js`: Barrel export for all workout-related hooks

**Styling:**
- `src/lib/styles.js`: Design tokens (colors, component styles)
- `src/index.css`: Global Tailwind imports
- Individual components: Tailwind classes + inline style objects

**Testing:**
- `src/lib/*.test.js`: Unit tests for utilities (dateUtils.test.js, setUtils.test.js, etc.)
- `src/components/ui/Modal.test.jsx`: Component tests
- `src/stores/workoutStore.test.js`: Store logic tests
- `src/hooks/useWorkout.test.js`: Hook tests
- `src/test/setup.js`: Test environment configuration

## Naming Conventions

**Files:**

| Type | Convention | Example | Location |
|------|-----------|---------|----------|
| Components | `PascalCase.jsx` | `ExerciseCard.jsx` | `src/components/` |
| Pages | `PascalCase.jsx` | `RoutineDetail.jsx` | `src/pages/` |
| Hooks | `use[Domain].js` | `useExercises.js` | `src/hooks/` |
| Stores | `camelCaseStore.js` | `authStore.js` | `src/stores/` |
| Utilities | `camelCase.js` | `dateUtils.js` | `src/lib/` |
| API modules | `[domain]Api.js` | `routineApi.js` | `src/lib/api/` |
| Constants | `SCREAMING_SNAKE_CASE` | `QUERY_KEYS` | `src/lib/constants.js` |
| Tests | `[source].test.js` or `[source].test.jsx` | `dateUtils.test.js` | Same folder as source |
| Index files | `index.js` | Barrel exports | Every component folder |

**Directories:**

| Type | Convention | Example |
|------|-----------|---------|
| Domain folders | `PascalCase` (first letter capital) | `src/components/Routine/`, `src/components/Exercise/` |
| Logic folders | `camelCase` (lowercase) | `src/lib/api/`, `src/hooks/`, `src/stores/` |

**Code Identifiers:**

| Type | Convention | Example |
|------|-----------|---------|
| Component names | `PascalCase` | `ExerciseCard`, `SetRow`, `RoutineForm` |
| Function names | `camelCase` | `calculateEpley1RM()`, `formatSetValue()` |
| Variable names | `camelCase` | `exerciseId`, `completedSets`, `isLoading` |
| Constants | `SCREAMING_SNAKE_CASE` | `QUERY_KEYS`, `REST_TIME_DEFAULT`, `RIR_OPTIONS` |
| Boolean variables/functions | Prefix with `is`, `has`, `can` | `isLoading`, `hasError`, `canUploadVideo` |

## Where to Add New Code

**New Feature:**
1. Primary code: `src/pages/[Feature].jsx` (route component)
2. Sub-components: `src/components/[Domain]/` (group related components)
3. Data fetching: `src/hooks/use[Domain].js` (queries and mutations)
4. API calls: `src/lib/api/[domain]Api.js` (Supabase operations)
5. Business logic: `src/lib/[concern]Utils.js` (pure functions)
6. Tests: `src/lib/[concern]Utils.test.js` and `src/hooks/use[Domain].test.js`

**New UI Component (Reusable):**
1. Definition: `src/components/ui/[ComponentName].jsx`
2. Export: Add to `src/components/ui/index.js`
3. Usage: Import from `src/components/ui` in any component or page
4. Tests: `src/components/ui/[ComponentName].test.jsx` (if complex)

**New Hook for Existing Feature:**
1. If domain file exists: Add to existing `src/hooks/use[Domain].js`
2. If new domain: Create `src/hooks/use[Domain].js`
3. Follow pattern: Group queries first, then mutations, each with comment sections
4. Tests: Add to `src/hooks/use[Domain].test.js`

**New Utility Function:**
1. Identify category: Is it date? → dateUtils.js, Set? → setUtils.js, etc.
2. Add to appropriate `src/lib/[concern]Utils.js`
3. Keep pure (no side effects, no React imports)
4. Test: Add to corresponding `.test.js` file
5. Export as named export: `export function myFunction() {}`

**New API Integration:**
1. Create or add to: `src/lib/api/[domain]Api.js`
2. Function signature: `async function fetchOrMutateData() { ... }`
3. Always throw on error (don't catch)
4. Return data directly (not wrapped)
5. Used by: Hooks wrap these in useQuery/useMutation

**New Page Route:**
1. Create: `src/pages/[PageName].jsx`
2. Add route to `src/App.jsx` (lazy loaded)
3. If protected: Wrap in `<PrivateRoute>`
4. Export as default: `export default [PageName]`

**New Zustand Store:**
1. Create: `src/stores/[concernName]Store.js`
2. Use `create()` and `persist()` if state should survive reload
3. Define state + actions in single object
4. Export as default: `export default use[Concern]Store`
5. Usage in hooks: Subscribe via hook or get state directly

## Special Directories

**src/components/ui/:**
- Purpose: Primitive components
- Generated: No
- Committed: Yes
- Index file: Must be kept in sync with all component exports
- Import rule: Always use barrel export (`import { Button, Card } from '../components/ui'`)

**src/lib/api/:**
- Purpose: Supabase client integration
- Generated: No
- Committed: Yes
- Important file: `routineIO.js` (handles routine import/export schema)
  - When modifying routine data model, update:
    1. `exportRoutine()` function (add fields to JSON schema)
    2. `importRoutine()` function (parse fields from JSON)
    3. `buildChatbotPrompt()` (if AI prompt affected)
    4. Consider incrementing schema version if breaking change
    5. Update `routineIO.test.js` tests

**src/lib/:**
- Purpose: All business logic, utilities, constants
- Generated: No
- Committed: Yes
- Test files: Live in same directory with `.test.js` extension
- No component imports: Utilities never import React components

**node_modules/, .next/, build/, dist/:**
- Generated: Yes
- Committed: No (.gitignore)

---

*Structure analysis: 2026-03-15*
