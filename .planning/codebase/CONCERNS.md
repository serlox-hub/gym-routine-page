# Codebase Concerns

**Analysis Date:** 2026-03-15

## Tech Debt

### Broad SELECT Queries in Routine API
- **Issue:** Three queries in `src/lib/api/routineApi.js` use `select('*')` without specifying columns, fetching all fields
- **Files:** `src/lib/api/routineApi.js:10, :20, :31`
- **Impact:** Inefficient queries in `fetchRoutines()`, `fetchRoutine()`, `fetchRoutineDays()` - fetches unnecessary columns like `created_at`, `updated_at`, etc. Can degrade performance with large datasets
- **Fix approach:** Specify only required columns: `select('id, name, description, goal, user_id, is_favorite, created_at')` or similar based on actual usage

### Silent Exercise Skipping in Import Flow
- **Issue:** When importing routines, exercises not found in exerciseMap or database are silently skipped without warning or logging
- **Files:** `src/lib/routineIO.js:434-459`
- **Impact:** Users could import a routine expecting all exercises, but some exercises get silently dropped if not found. Creates data integrity issues - routine structure incomplete without user awareness
- **Fix approach:** Collect skipped exercises and return them in `importRoutine()` response so caller can warn user: `{ routine, skippedExercises: [...] }`. Optionally throw error if critical exercises are missing

### Multiple Promise Chains in Export Function
- **Issue:** `exportRoutine()` uses nested async/await with multiple sequential queries that could be parallelized
- **Files:** `src/lib/routineIO.js:182-245`
- **Impact:** N+1 query pattern - fetches all routine data, then for each day iterates through blocks sequentially. Slow for large routines with many days
- **Fix approach:** Fetch all blocks at once for all days (one query), then process in JavaScript instead of Promise.all per day

### Null/Undefined Handling in Exports
- **Issue:** `muscle_group?.name` optional chaining returns undefined when muscle group is null
- **Files:** `src/lib/routineIO.js:273`
- **Impact:** Exported JSON includes `"muscle_group_name": undefined` which could cause issues when parsing imported file. Should be null or omitted
- **Fix approach:** Use `muscle_group?.name || null` or filter falsy values before stringifying

## Known Bugs

### Race Condition: Deleted Exercises in Active Sessions
- **Symptoms:** Session history shows exercises with `deleted_at` timestamp. When viewing session details, deleted exercises appear with null/stale muscle group data
- **Files:** `src/lib/api/workoutApi.js:414` (fetches `deleted_at`), `src/components/Workout/WorkoutExerciseCard.jsx` (renders exercise)
- **Trigger:** User deletes an exercise while another user has an active or recently-completed session using that exercise, then views that session detail
- **Workaround:** Exercises use soft delete by design (`deleted_at` column), so historical data is preserved. Components should handle deleted exercises gracefully (show "Deleted exercise" instead of crashing)
- **Fix approach:** Add null check and display placeholder: `exercise.name || 'Ejercicio eliminado'` in components rendering exercises

### Incomplete Muscle Group Reference in Exercise Stats
- **Symptoms:** Inconsistent data in `fetchExerciseStats()` - some exercises in sessions may not have muscle group references loaded
- **Files:** `src/lib/api/exerciseApi.js:44-50`
- **Impact:** Filtering by muscle group in history modal may miss exercises, or routine stats incomplete
- **Fix approach:** Add `.eq('exercise.deleted_at', null)` filters when fetching exercises to exclude soft-deleted ones

## Security Considerations

### Environment Variables Exposure Risk
- **Risk:** `.env.local`, `.env.pro`, and other env files present in repository root (not in .gitignore)
- **Files:** `.env.local`, `.env.pro` (found during exploration - content not read per policy)
- **Current mitigation:** Appears to use `.gitignore` to prevent commits, but local env files are sensitive
- **Recommendations:** Verify `.env*` entries are in `.gitignore`. Use `EXPO_PUBLIC_*` prefix only for safe values in React Native (gym-native/.env). Never commit real secrets. Implement secret rotation if Supabase keys leaked

### Import Function SQL Injection Vector
- **Risk:** While using Supabase client (parameterized), the imported JSON format accepts `exercise_name` field that's matched directly against database
- **Files:** `src/lib/routineIO.js:438-440` (maybeSingle query filters by name)
- **Current mitigation:** Supabase client parameterizes queries, so SQL injection unlikely. But name matching could match wrong exercises if user has duplicates
- **Recommendations:** Validate `exercise_name` format before query. Add case-insensitive matching option. Warn if multiple exercises with same name exist

## Performance Bottlenecks

### Large Routine Export with Many Days
- **Problem:** `exportRoutine()` makes one query per day (nested Promise.all), plus one query per block per day. For a 6-day routine with 2 blocks each = 12+ queries
- **Files:** `src/lib/routineIO.js:182-245`
- **Cause:** Sequential processing in Promise.all of days, then nested fetches per day
- **Improvement path:** Fetch all blocks at once with Supabase PostgREST nested select. Use single query: `routine_days(id, ..., routine_blocks(...))`

### Exercise History Modal Loads Full Session Data
- **Problem:** `ExerciseHistoryModal.jsx` may load full `workout_sessions` join with multiple nested relations for each set
- **Files:** `src/lib/api/workoutApi.js:479-517` (fetchExerciseHistory returns full completed_sets)
- **Cause:** Not profiled, but likely fetching more fields than needed for history display
- **Improvement path:** Create leaner query that selects only `weight, reps, performed_at` needed for history display. Defer full set details to separate query if user clicks detail

### Workout Session Initialization Complexity
- **Problem:** Starting a new session calls `start_workout_session` RPC, then immediately fetches session data, then exercises, then completed sets
- **Files:** `src/hooks/useSession.js`, `src/lib/api/workoutApi.js:34-44`
- **Cause:** Multiple round-trips - RPC call, then SELECT queries
- **Improvement path:** Have RPC return full session data in one call instead of separate fetches

## Fragile Areas

### Import/Export Feature (routineIO.js)
- **Files:** `src/lib/routineIO.js` (501 lines), `src/lib/routineIO.test.js` (273 lines)
- **Why fragile:**
  - Version 4 schema is critical - any data model changes require coordinated updates to `exportRoutine()`, `importRoutine()`, `buildChatbotPrompt()`
  - Missing exercises in import silently skip rather than fail loudly
  - No validation of JSON structure before processing - malformed imports can create partial routines
  - `Promise.all` in export doesn't handle individual promise rejections (if one day fails, entire export fails)
- **Safe modification:**
  1. Write tests for edge cases: exercises with null muscle_group, routines with no blocks, etc.
  2. Wrap Promise.all with error handling: `Promise.allSettled()` to catch partial failures
  3. Add pre-import validation function that checks JSON schema before processing
  4. Increment version number when changing schema
- **Test coverage:** `routineIO.test.js` covers happy paths but missing: malformed JSON recovery, partial failures, duplicate exercise names

### Routine/Exercise Soft Delete Logic
- **Files:** `src/lib/api/exerciseApi.js` (soft delete with `deleted_at`), `src/lib/api/routineApi.js` (hard delete with CASCADE)
- **Why fragile:** Mixed deletion strategies
  - Exercises: soft delete (preserves session history)
  - Routines/Blocks: hard delete with CASCADE (deletes all child records)
  - Inconsistent approach creates orphaned records
- **Safe modification:**
  1. Document which tables support each strategy in database schema
  2. Create helper function `deleteExerciseSoftly()` vs `deleteRoutineHardly()` to make intent explicit
  3. Add test that verifies soft-deleted exercises still appear in session history
  4. Add cascade test that verifies deleting routine doesn't leave orphaned blocks

### Session Exercise Ordering and Reordering
- **Files:** `src/lib/api/workoutApi.js:325-336` (reorderSessionExercises RPC)
- **Why fragile:**
  - `reorderSessionExercises` RPC takes array of IDs and updates `sort_order` sequentially
  - No validation that all session exercises are included in reorder request
  - If user reorders partial list, remaining exercises get sort_order gaps or duplicates
  - Race condition: concurrent reorder requests could conflict
- **Safe modification:**
  1. Verify all session exercise IDs are present before calling RPC: `assert orderedIds.length === totalCount`
  2. Add optimistic locking or version field to prevent concurrent conflicts
  3. Add test for partial reorder edge case

## Scaling Limits

### Supabase Row-Level Security (RLS) Queries
- **Current capacity:** Each fetch query includes joins across 3-4 table levels (exercises → muscle_groups, routine_exercises → routine_blocks, etc.). Supabase RLS policies evaluate on every row
- **Limit:** With 100+ exercises per user and 1000+ completed sets, query latency may increase significantly
- **Scaling path:**
  1. Profile queries with large datasets using Supabase analytics
  2. Add database indexes on common filters: `exercises(user_id, deleted_at)`, `workout_sessions(user_id, status, started_at)`
  3. Consider materialized views for expensive aggregations (exercise stats, monthly summaries)
  4. Implement pagination/cursor-based queries for history (currently unbounded)

### Persistent Store Size (Zustand)
- **Current capacity:** `workoutStore.js` persists `completedSets` object with `${sessionExerciseId}-${setNumber}` keys
- **Limit:** Browser localStorage (5-10MB limit) - if session has 1000 sets with video URLs and notes, could exceed quota
- **Scaling path:**
  1. Implement lazy-load of completed sets from server
  2. Compress set data before persisting (strip calculated fields)
  3. Add session cleanup to clear old session data after completion

## Dependencies at Risk

### React Native Migration In Progress
- **Risk:** Dual codebase maintenance - `src/` (React web) and `gym-native/` (React Native) with shared `routineIO.js` logic
- **Impact:** Changes to routine import/export require updates in two places
- **Migration plan:**
  1. Move `routineIO.js` and related utilities to shared package or monorepo structure
  2. Create wrapper adapters for platform-specific features (e.g., `downloadRoutineAsJson` is no-op in RN)
  3. Establish test suite that runs on both platforms

### Supabase SDK Version Management
- **Risk:** Dependencies on Supabase JS client for RPC functions, RLS policies, and real-time features
- **Impact:** SDK breaking changes could break RPC calls, authentication flow
- **Migration plan:**
  1. Pin Supabase version in package.json (currently flexible)
  2. Test upgrade process quarterly
  3. Maintain compatibility layer for RPC function signatures

## Missing Critical Features

### Error Recovery for Failed Imports
- **Problem:** If `importRoutine()` partially succeeds (creates routine but fails on exercises), user is left with incomplete routine and no way to retry
- **Blocks:** Users cannot reliably import routines from AI responses or shared files

### Audit Trail for Routine Changes
- **Problem:** No history of who modified routine, when, or what changed
- **Blocks:** Cannot revert bad edits, cannot track routine evolution

### Bulk Exercise Operations
- **Problem:** No way to batch-delete exercises, bulk-update measurement types
- **Blocks:** Managing 100+ exercises is tedious (one-by-one delete)

## Test Coverage Gaps

### Session Restoration from Crashed App
- **What's not tested:** Workflow where app crashes during active session, user reopens app, session is restored from localStorage, user continues
- **Files:** `src/hooks/useSession.js` (restoreSession), `src/stores/workoutStore.js` (restoreSession)
- **Risk:** Restored session could have stale `completedSets` that conflict with server state. No test verifies sync correctness
- **Priority:** High - data integrity issue

### Import with Missing Exercise Definitions
- **What's not tested:** Importing JSON with `exercise_name` that doesn't exist in user's exercises and no `exercises[]` definitions provided
- **Files:** `src/lib/routineIO.js:308-465` (importRoutine)
- **Risk:** Routine created with no exercises, user unaware
- **Priority:** High - data loss risk

### Deleted Exercise Handling in Components
- **What's not tested:** Rendering a session that includes a deleted exercise. Does UI crash or show graceful fallback?
- **Files:** `src/components/Workout/WorkoutExerciseCard.jsx`, `src/components/History/SessionDetail.jsx`
- **Risk:** Production crash when viewing old session with deleted exercise
- **Priority:** High - UX crash

### Concurrent Session Writes
- **What's not tested:** Two rapid upserts to same `completed_sets` record. Does Supabase handle race condition? Or does last-write-wins lose data?
- **Files:** `src/lib/api/workoutApi.js:97-122` (upsertCompletedSet)
- **Risk:** Lost set data in concurrent update scenarios (unlikely in single-user app but critical if shared sessions added)
- **Priority:** Medium - future-proofing for collaboration features

### Empty Blocks in Routine Import
- **What's not tested:** Importing JSON with day that has block with zero exercises
- **Files:** `src/lib/routineIO.js:413-460` (block.exercises loop)
- **Risk:** Creates empty "Calentamiento" or "Principal" block that clutters UI
- **Priority:** Low - cosmetic issue

---

*Concerns audit: 2026-03-15*
