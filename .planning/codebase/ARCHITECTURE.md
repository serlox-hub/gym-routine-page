# Architecture

**Analysis Date:** 2026-03-15

## Pattern Overview

**Overall:** Layered architecture with clear separation between UI, data fetching, state management, and business logic.

**Key Characteristics:**
- React + Vite frontend with component-based UI
- TanStack Query (React Query) for server state and data synchronization
- Zustand stores for cross-component UI and session state
- Supabase PostgreSQL backend with row-level security
- Optimistic UI updates with server state reconciliation
- Domain-grouped hooks and components

## Layers

**UI Components Layer:**
- Purpose: Render UI, handle user interactions, maintain local UI state
- Location: `src/components/` (organized by domain: `ui/`, `Auth/`, `Home/`, `Routine/`, `Workout/`, `Exercise/`, `History/`, `Landing/`, `BodyWeight/`)
- Contains: React components with JSX, one per file, max 150 lines
- Depends on: Hooks, stores, utility functions
- Used by: Pages, other components

**Pages Layer:**
- Purpose: Route-level components that compose feature flows
- Location: `src/pages/`
- Contains: Full-page components mapping to routes (Home.jsx, RoutineDetail.jsx, WorkoutSession.jsx, etc.)
- Depends on: Components, hooks, stores
- Used by: Router (App.jsx)

**Hooks Layer:**
- Purpose: Encapsulate all data fetching (queries, mutations), state subscriptions, and business logic composition
- Location: `src/hooks/` (one file per domain)
- Contains: Custom React hooks exported as `use[Domain]` or `use[Operation][Domain]`
  - `useAuth.js`: Auth state and actions
  - `useExercises.js`: Exercise CRUD and queries
  - `useRoutines.js`: Routine CRUD and queries
  - `useSession.js`: Workout session restoration and completion
  - `useWorkout.js`: Exports from session, sets, exercises, history, timer
  - `useCompletedSets.js`: Set completion mutations
  - `useSessionExercises.js`: Session exercise queries and mutations
  - `useWorkoutHistory.js`: History queries
  - `useRestTimer.js`: Rest timer mutations
  - `useBodyWeight.js`, `useBodyMeasurements.js`, `usePreferences.js`, `useAdmin.js`: Domain-specific queries/mutations
- Depends on: TanStack Query, Zustand stores, API layer
- Used by: Components, pages

**Store Layer (Zustand):**
- Purpose: Maintain cross-component state (authentication, active workout session)
- Location: `src/stores/`
- Contains:
  - `authStore.js`: User session, authentication methods, password recovery
  - `workoutStore.js`: Active session ID, completed sets (optimistic cache), rest timer state
- Pattern: Zustand with `persist` middleware for session restoration across page reloads
- Used by: useAuth hook (bridges to store), components via store subscription

**API Layer:**
- Purpose: Supabase client calls encapsulated by domain
- Location: `src/lib/api/`
- Contains:
  - `exerciseApi.js`: Exercise queries, CRUD, stats
  - `routineApi.js`: Routine and routine structure CRUD
  - `workoutApi.js`: Session start, set completion, session completion
  - `bodyWeightApi.js`: Weight tracking
  - `bodyMeasurementsApi.js`: Measurement tracking
  - `preferencesApi.js`: User preferences
  - `adminApi.js`: Admin functions
- Pattern: Async functions that call `supabase` client, throw errors on failure
- Used by: Hooks (wrapped in useQuery/useMutation)

**Utility/Library Layer:**
- Purpose: Pure functions for calculations, transformations, validations, and constants
- Location: `src/lib/`
- Contains:
  - `supabase.js`: Supabase client initialization
  - `queryClient.js`: TanStack Query client configuration
  - `constants.js`: QUERY_KEYS, RIR_OPTIONS, muscle group colors, session status enums
  - `styles.js`: Design tokens (colors, component styles as objects)
  - `dateUtils.js`: Date formatting
  - `timeUtils.js`: Duration/time formatting
  - `setUtils.js`: Set validation, formatting
  - `workoutCalculations.js`: 1RM, volume calculations
  - `workoutTransforms.js`: Session data transformations
  - `calendarUtils.js`: Calendar generation
  - `arrayUtils.js`: Array manipulation (reorder, filter)
  - `measurementTypes.js`: Exercise measurement types
  - `validation.js`: Form validation
  - `routineIO.js`: Routine import/export (JSON format)
  - `routineTemplates.js`: Pre-built routine templates
  - `routineExerciseForm.js`: Form field defaults for routine exercises
- Pattern: Pure functions (no side effects), one function per concern
- Used by: Components (in useMemo/handlers), hooks

**Root Entry:**
- Location: `src/main.jsx`, `src/App.jsx`
- Wraps app with: QueryClientProvider, Suspense, Router, ErrorBoundary
- Initializes: Session restoration, pending sets sync on app load

## Data Flow

**Authenticating User:**

1. User navigates to /login
2. `Login` page renders form
3. Form submits to `useAuth().login(email, password)`
4. `useAuth` hook calls `authStore.login()` (Zustand action)
5. `authStore.login()` calls Supabase auth API, updates Zustand store with session/user
6. Component re-renders with authenticated state
7. Router redirects to `/` (Home page)
8. `useRestoreActiveSession()` hook fetches active session from database, restores to `workoutStore`

**Loading Data (Query):**

1. Component calls hook: `const { data, isLoading, error } = useRoutines()`
2. Hook wraps `fetchRoutines()` in `useQuery({ queryKey: [QUERY_KEYS.ROUTINES], queryFn: fetchRoutines })`
3. TanStack Query caches by key, fetches once, revalidates on stale time
4. `fetchRoutines()` calls Supabase, filters by user_id, returns data
5. Component receives `data` (array of routines)
6. Component renders loading state if `isLoading`, error state if `error`, content if `data`

**Mutating Data (Mutation):**

1. Component calls hook: `const mutation = useCreateRoutine()`
2. Component calls: `mutation.mutate({ name, ... })`
3. Hook wraps `apiCreateRoutine()` in `useMutation()`
4. `apiCreateRoutine()` calls Supabase insert, returns new record
5. `onSuccess` callback invalidates related query keys (e.g., ROUTINES)
6. TanStack Query refetches invalidated queries automatically
7. Component receives `mutation.data` with new routine

**Active Workout Session:**

1. User starts workout via `startWorkoutSession()`
2. Session created in database, session exercises populated
3. Store action `useWorkoutStore(state => state.startSession(sessionId, ...))` updates local state
4. User marks sets as complete in `SetRow` component
5. Store action `completeSet(sessionExerciseId, setNumber, data)` optimistically updates local cache
6. `useCompletedSets()` mutation fires, sends to server async
7. On success, mutation `onSuccess` updates dbId in store
8. If mutation fails, set moved to `pendingSets` queue
9. On app visibility change, `useSyncPendingSets()` retries pending mutations
10. Session completion: `completeWorkoutSession()` marks status as completed, ends session

**Rest Timer:**

1. User starts rest timer via `startRestTimer(seconds)`
2. Store saves `restTimerEndTime = Date.now() + seconds * 1000`
3. `useRestTimer()` mutation registers interval that calls `tickTimer()`
4. `tickTimer()` checks `getTimeRemaining()` which calculates from timestamps
5. When remaining <= 0, timer stops automatically
6. Timer can be skipped or time adjusted via store actions

**State Management Decision Tree:**

- **Is it auth state?** → `authStore.js` (Zustand)
- **Is it active session or completed sets?** → `workoutStore.js` (Zustand with persist)
- **Is it server data that needs caching/sync?** → TanStack Query in hooks
- **Is it local UI state (modal open, hover)?** → `useState` in component
- **Is it cross-component but not persisted?** → Zustand store

## Key Abstractions

**Hook Wrapper Pattern (Query + Mutation):**
- Purpose: Encapsulate all server interactions for a domain
- Examples: `useRoutines()`, `useExercises()`, `useSession()`
- Pattern: Export `use[Resource]` for queries and `use[Create/Update/Delete][Resource]` for mutations
- Benefit: Components stay dumb, hooks handle caching, error handling, invalidation

```javascript
// In hook file (useRoutines.js):
export function useRoutines() {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINES],
    queryFn: fetchRoutines
  })
}

export function useCreateRoutine() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: (routine) => apiCreateRoutine({ userId, routine }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

// In component:
const { data: routines } = useRoutines()
const createMutation = useCreateRoutine()
const handleCreate = () => createMutation.mutate({ name: '...' })
```

**Optimistic UI with Zustand:**
- Purpose: Show immediate UI feedback while server request is in flight
- Pattern: Store action updates immediately, mutation sync runs async
- Example: Set completion in workout session
- Rollback: If mutation fails, set moves to `pendingSets` for retry

```javascript
// In component:
const completeSet = useWorkoutStore(state => state.completeSet)
const handleComplete = (sessionExerciseId, setNumber, data) => {
  completeSet(sessionExerciseId, setNumber, data) // Immediate UI update
  completedSetsMutation.mutate({ sessionExerciseId, setNumber, data }) // Async sync
}
```

**Transform Layer (workoutTransforms.js):**
- Purpose: Convert database response shapes to component-friendly structures
- Example: `buildSessionExercisesFromBlocks()` transforms nested routine blocks into flat session exercises list
- Benefit: Keeps API responses separate from component props

**Validation Utilities:**
- Purpose: Encapsulate business rules outside components
- Examples: `setUtils.js` (set data validation), `validation.js` (form validation)
- Pattern: Pure functions that return boolean or error string
- Used in: Components (show/hide UI), mutations (before sending)

## Entry Points

**HTML Entry:**
- Location: `index.html` (root div with id="root")

**JavaScript Entry:**
- Location: `src/main.jsx`
- Responsibilities:
  - Render React root
  - Wrap with QueryClientProvider (TanStack Query)
  - Wrap with ErrorBoundary
  - Import App component
  - Initialize mobile dev console (eruda) in development

**App Router:**
- Location: `src/App.jsx`
- Responsibilities:
  - BrowserRouter setup
  - Route definitions (public and private)
  - Lazy-load all pages with Suspense
  - Render ActiveSessionBanner (shows ongoing workout)
  - Render SessionRestorer (restores session on mount)
  - Password recovery redirect logic

**Protected Routes:**
- Component: `src/components/Auth/PrivateRoute.jsx`
- Logic: Checks `useAuth().isAuthenticated`, shows loading or error if not

## Error Handling

**Strategy:** Layered error handling from Supabase errors → hooks → components → ErrorBoundary

**Patterns:**

1. **Supabase API Errors:**
   - API functions throw errors if Supabase returns error
   - Error message includes operation context

2. **Hook-Level Errors:**
   - TanStack Query captures errors, stores in `.error`
   - Mutations can define error side effects in `onError`
   - Error object contains: `message`, HTTP status, code

3. **Component-Level Handling:**
   - Components check `error` from hook
   - Render `<ErrorMessage message={error.message} />`
   - Can trigger retry via `query.refetch()` or `mutation.reset()`

4. **Global Error Boundary:**
   - `src/components/ErrorBoundary.jsx` catches unhandled React errors
   - Shows error message and "Retry" / "Reload Page" buttons
   - Used in main.jsx to wrap entire app

5. **Set Sync Failures:**
   - Failed set mutations moved to `pendingSets` in workoutStore
   - `useSyncPendingSets()` hook retries on visibility change
   - Manual retry available in UI

**Example:**
```javascript
function SetRow() {
  const { data: set, error } = useGetSet(setId)

  if (error) return <ErrorMessage message={error.message} />
  if (!set) return <LoadingSpinner />

  return <div>{set.weight}kg</div>
}
```

## Cross-Cutting Concerns

**Logging:**
- Pattern: No structured logging library; console.log removed in production via linting rule
- For production monitoring: Would use Supabase logs or external service (not currently integrated)

**Validation:**
- Form validation: `src/lib/validation.js` exports pure validator functions
- Set validation: `src/lib/setUtils.js` checks weight/reps/time rules
- Used in: Component handlers (prevent bad data) and mutation `mutationFn` (server-side check)

**Authentication & Authorization:**
- Auth: Supabase Auth (email/password, Google OAuth)
- Session: JWT in localStorage (handled by Supabase SDK)
- RLS: Database uses Row-Level Security policies (Supabase enforces user_id = current_user_id)
- Admin checks: `useIsAdmin()` hook queries user_settings table for `is_admin = 'true'`
- Premium checks: `useIsPremium()` checks `can_upload_video` setting

**State Sync Across Tabs:**
- Zustand persist middleware uses localStorage for session state
- If user logs out in one tab, page reload in another tab detects no token
- App uses `document.visibilitychange` event to sync active session on focus

---

*Architecture analysis: 2026-03-15*
