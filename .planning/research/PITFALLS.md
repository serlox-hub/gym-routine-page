# Domain Pitfalls — Tech Debt Reduction in a React + React Native Monorepo

**Domain:** Tech debt reduction — deduplication, testing, file splitting in a cross-platform monorepo
**Project:** Gym Tracker (web React + Expo React Native, npm workspaces, `@gym/shared`)
**Researched:** 2026-03-16

---

## Critical Pitfalls

Mistakes that cause breakage across both platforms, silent regressions, or invalidate the entire cleanup effort.

---

### Pitfall 1: Barrel Re-export Breaks Both Apps Silently

**What goes wrong:** When splitting `workoutApi.js` (SIZE-01) or `routineApi.js` (SIZE-02) into sub-modules, the existing barrel (`packages/shared/src/index.js`) exports directly from those files. If any function is accidentally left out of the new sub-module barrel, every consumer in both `apps/web` and `apps/gym-native` that imports from `@gym/shared` gets `undefined` at runtime — not a build error. JavaScript doesn't throw on missing named exports from barrel re-exports until the function is actually called.

**Why it happens:** The split is done file-by-file, the developer verifies the new file individually, but forgets to update the intermediate barrel (e.g., a new `workoutApi.js` that re-exports from sub-modules). Metro (RN) and Vite (web) bundle silently with holes.

**Consequences:** Silent runtime crash during a workout session. The bug may not surface until a specific code path is hit (e.g., ending a session).

**Prevention:**
- After any split, run `npm run build -w apps/web` AND `npx expo export -w apps/gym-native` to catch missing re-exports at bundle time.
- Add a smoke test import: after SIZE-01, write a one-line test that imports every function that was previously exported from `workoutApi.js` and asserts it is a function, not undefined.
- The intermediate barrel pattern is already in the plan (`workoutApi.js` re-exports from sub-modules) — do not skip creating it.

**Detection:** `undefined is not a function` errors in production; build succeeds but runtime fails on first call to any split function.

**Applies to:** SIZE-01 (workoutApi split), SIZE-02 (routineApi split), DUP-03 (routineIO move to shared API).

---

### Pitfall 2: Platform-Specific Code Leaks Into the Shared Package

**What goes wrong:** When moving hooks to `packages/shared/src/hooks/` (DUP-01, DUP-02), the shared implementation accidentally imports a platform-specific API — `window.addEventListener`, `document`, `AppState`, or `FileReader`. This causes the RN app to crash on import (Metro evaluates the module, hits a web API, throws) or the web app to fail with "AppState is not defined."

**Why it happens:** `useSyncPendingSets` in both apps is 95% identical. The only difference is the visibility listener: web uses `window.addEventListener('online', ...)` and RN uses `AppState.addEventListener('change', ...)`. It's easy to copy the web version to shared and miss the RN-specific branch. The existing codebase already has this exact bug in `apps/gym-native/src/lib/routineIO.js:333` (BUG-02: `FileReader` used in RN).

**Consequences:** The RN app crashes at startup or at the import of the affected hook. Both apps are broken until the shared package is fixed and republished/symlinked.

**Prevention:**
- The plan's callback injection pattern (`onVisibilityChange(callback)`) is correct — enforce it. Shared hooks must accept all platform-specific behavior as injected callbacks, never import browser or RN globals directly.
- After moving any hook to shared, run `npm run lint -w apps/gym-native` immediately. The ESLint config for RN should flag `window`, `document`, and `FileReader` as undefined.
- Pattern to verify: the shared file's import section must contain zero platform-specific imports (`react-native`, `AppState`, `window`, `document`, `FileReader`, `Blob`, `URL.createObjectURL`).

**Detection:** Metro bundler error on `npx expo start`; lint error `no-undef` on `window`/`document` in the shared package.

**Applies to:** DUP-01 (useCompletedSets + useSession), DUP-02 (useWorkoutHistory), DUP-03 (routineIO).

---

### Pitfall 3: Pending Sets Queue Uses Stale Session ID After Zustand Rehydration

**What goes wrong:** The `pendingSets` queue in `createWorkoutStore` is persisted via Zustand's persist middleware (AsyncStorage on RN, localStorage on web). If the user force-kills the app mid-session and reopens it, the persisted state restores a `sessionId` and a non-empty `pendingSets`. If a new session is then started, `useSyncPendingSets` retries the old pending sets against the new `sessionId`, creating orphaned `completed_sets` rows in the database under the wrong session.

**Why it happens:** The `useSyncPendingSets` hook reads `sessionId` from the store at hook instantiation, not from the pending set payload. The pending set payload does store its own `sessionId` (the correct one), but a new session call to `startSession()` overwrites the store's `sessionId` before the sync loop drains. This is documented in `CONCERNS.md` as a known fragile area.

**Consequences:** Silent data corruption — completed sets are written to the wrong workout session. This becomes visible when DUP-01 moves this hook to shared, because the shared implementation will be used by both platforms simultaneously and the bug surface doubles.

**Prevention:**
- Before implementing DUP-01, add a guard in `startSession()`: if `pendingSets` is non-empty, either drain it first (await) or clear it with a warning log. The session lifecycle must own the pending queue.
- The test for `createWorkoutStore` (TEST-02 context) should include a scenario: start session → add pending set → simulate app kill/rehydrate → start new session → assert pending set is not inserted into new session.
- Use `payload.sessionId` (not store's `sessionId`) when retrying in `useSyncPendingSets`. This is already the case in the current implementation — verify this is preserved when moving to shared.

**Detection:** `completed_sets` rows appearing under a session the user did not complete. Silent; only caught with integration tests or by inspecting the database.

**Applies to:** DUP-01 (useCompletedSets + useSession shared migration), TEST-02 (createAuthStore tests — same pattern risk).

---

### Pitfall 4: Dependency Version Upgrade Breaks TanStack Query Cache Behavior

**What goes wrong:** DX-01 upgrades `@tanstack/react-query` in `apps/web` from `^5.62.0` to `^5.90.21` — a jump of ~28 minor versions. TanStack Query v5 has had multiple behavioral changes to `staleTime` defaults, `refetchOnWindowFocus` semantics, and `useInfiniteQuery` page structure between 5.62 and 5.90. The upgrade may silently change when queries refetch, causing the workout session or routine list to show stale data, or trigger unexpected refetches during an active workout.

**Why it happens:** Minor versions in TanStack Query v5 have introduced opt-in-by-default behavior changes, particularly around `gcTime` (formerly `cacheTime`) and structural sharing. The web app has no query-layer tests (TEST-01, TEST-03 are not yet done), so behavioral regressions are invisible.

**Consequences:** Routine list refetches during active workout (user sees flicker). History hooks behave differently on web vs RN (DUP-02 divergence gets worse). Cache invalidation in `useCompleteSet.onSuccess` may change timing.

**Prevention:**
- Do DX-01 (version sync) AFTER TEST-01 and TEST-03 are complete, not before. Tests provide a regression net.
- Before upgrading, check the TanStack Query v5 changelog between 5.62 and 5.90 for breaking changes (specifically: `refetchOnWindowFocus`, `structuralSharing`, `throwOnError` defaults).
- After upgrading, run the full web test suite and manually test: complete a set, end session, open history. Verify no unexpected refetches.

**Detection:** Test failures after DX-01; flicker on workout page during set completion; history not updating immediately after session end.

**Applies to:** DX-01 (version sync), before this: TEST-01 and TEST-03 should already pass.

---

## Moderate Pitfalls

---

### Pitfall 5: Supabase Mock Chain Breaks When API Functions Are Split

**What goes wrong:** The recommended test pattern for TEST-01 (API tests) mocks `getClient()` and returns a chainable mock: `{ from: vi.fn(() => mockSupabase), select: vi.fn(() => mockSupabase), ... }`. When `workoutApi.js` is split (SIZE-01), the new sub-files also call `getClient()` and use the same chain. However, each sub-file that gets split may have a different chain depth (e.g., `completedSetsApi.js` chains `.from().upsert()` while `sessionExercisesApi.js` chains `.from().select().eq().order()`). A single flat mock object shared across tests will return wrong data for some assertions if `vi.clearAllMocks()` is not called between each test, or if the chain mock doesn't return the right shape.

**Prevention:**
- Write the API tests (TEST-01) AFTER the split (SIZE-01, SIZE-02), not before. Testing pre-split code that will immediately be restructured wastes effort and the tests will need rewriting.
- Use `beforeEach(() => { vi.clearAllMocks() })` in every API test file without exception.
- For each test, explicitly mock the chain return value for the specific function under test, not a generic shared mock. The `DEUDA-TECNICA-V2.md` test pattern is correct as a starting point but needs per-function chain depth.

**Detection:** Tests pass individually but fail when run together; mock returns wrong data for second test in a file.

**Applies to:** TEST-01 (API layer tests), SIZE-01, SIZE-02.

---

### Pitfall 6: Thin Wrapper Pattern Introduces Duplicate TanStack Query Cache Keys

**What goes wrong:** After DUP-01 moves `useCompletedSets` to shared, both the shared hook and the per-app thin wrapper may register mutations that call `queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })`. If the thin wrapper adds its own `onSuccess` without removing the shared hook's `onSuccess`, the cache invalidation fires twice. With TanStack Query v5, double invalidation is usually harmless but can cause two sequential re-renders and potential flicker on the workout screen.

**Prevention:**
- The thin wrapper must only inject the platform callback (e.g., `onVisibilityChange`) and re-export the shared hook's return value. It must not add any additional `onSuccess`/`onError` logic.
- After implementing each DUP-*, verify: `grep -r "invalidateQueries" apps/web/src/hooks/useCompletedSets.js apps/gym-native/src/hooks/useCompletedSets.js` should return zero results after the migration (the invalidation lives in shared).

**Detection:** React DevTools profiler shows double re-render on set completion; TanStack Query DevTools shows the same query being invalidated twice in one mutation cycle.

**Applies to:** DUP-01, DUP-02, DUP-03.

---

### Pitfall 7: Component Split Loses Local State (Array Index as React Key)

**What goes wrong:** SIZE-03 (WorkoutExerciseCard refactor) and SIZE-04 (ExerciseHistoryModal) involve extracting sub-components. The current `WorkoutExerciseCard` uses `key={i + 1}` for set rows (documented in `CONCERNS.md`). If the sub-component extraction changes the key generation or the component tree structure, React will unmount and remount set rows during renders, causing user-typed weight/reps values in uncontrolled inputs to be lost mid-workout.

**Why it happens:** Extracting `SetsList` as a sub-component changes where the `key` prop lives in the tree. If the key strategy isn't explicitly carried over and documented, the default behavior is React re-creating DOM nodes.

**Consequences:** User types weight into a set input, a re-render occurs (e.g., a set above it is completed), and the input resets. This is a user-visible data loss event during active workout.

**Prevention:**
- SIZE-03 depends on BUG-01 (already noted in the plan). Do not skip this dependency.
- Before extracting `SetsList`, audit the current key strategy in `WorkoutExerciseCard.jsx` and document it in a comment. The stable key pattern `${sessionExerciseId}-${setNumber}` should be adopted as part of the refactor, not deferred.
- After SIZE-03, manually test: start workout → add exercises → type weight into second set → complete first set → verify second set input is unchanged.

**Detection:** Input values disappearing after completing a different set in the same exercise card.

**Applies to:** SIZE-03 (WorkoutExerciseCard), SIZE-04 (ExerciseHistoryModal).

---

### Pitfall 8: routineIO Move Exposes the N+1 Query Bug in Both Apps

**What goes wrong:** `DUP-03` moves `exportRoutine`, `importRoutine`, and `duplicateRoutine` to `packages/shared/src/api/routineApi.js`. The current implementation has an N+1 query pattern: for a 5-day routine, it makes 12+ DB round-trips. When this code is moved to shared, both apps use the same implementation. If the N+1 bug is fixed at the same time (the right call), it requires a more complex nested Supabase select. If it is NOT fixed, the shared function propagates the performance problem to both apps and makes it harder to fix later.

**Prevention:**
- Fix the N+1 query during DUP-03, not after. The fix is to add `id` to the initial days query: `select('id, name, estimated_duration_min, sort_order')`. This eliminates the extra per-day lookup and is a one-line change with high confidence.
- Do not move broken code to shared without fixing the known bug. The CONCERNS.md performance section documents exactly what to change.

**Detection:** Slow export/import for routines with 4+ days; each day triggers an extra DB query visible in Supabase logs.

**Applies to:** DUP-03 (routineIO to shared API).

---

## Minor Pitfalls

---

### Pitfall 9: CLAUDE.md Update Causes AI to Place New Files in Wrong Locations

**What goes wrong:** DX-02 updates `CLAUDE.md` to reflect the monorepo. If done poorly (e.g., removing the old `src/` structure without adding the new monorepo paths), subsequent AI-assisted sessions may create hooks or components in `apps/web/src/` instead of the correct location in `packages/shared/src/hooks/`.

**Prevention:**
- DX-02 is the lowest risk item but the highest-leverage one for future AI sessions. Update the "Project Structure" section to show all three workspaces (`apps/web`, `apps/gym-native`, `packages/shared`).
- Explicitly document the decision rule: "Logic that works identically on both platforms → `packages/shared/`. Platform-specific UI and lifecycle → per-app."
- Do DX-02 last, after all structural changes are committed, so the documented structure matches the actual final state.

**Applies to:** DX-02.

---

### Pitfall 10: Vitest Fake Timers Conflict With TanStack Query in Hook Tests

**What goes wrong:** TEST-03 tests hooks that use `useQuery` and `useMutation`. If any test uses `vi.useFakeTimers()` to test retry delays or polling intervals (e.g., `useSyncPendingSets`'s 10-second interval), TanStack Query's internal scheduler may stall and never resolve promises, causing tests to time out or hang. This is a known issue between TanStack Query and Vitest's fake timer implementation (sinonjs timers).

**Prevention:**
- Avoid `vi.useFakeTimers()` in hook tests. Test the timeout behavior via unit tests of the underlying utility, not through the hook.
- If timers are needed, use `vi.advanceTimersByTimeAsync()` (Vitest 1.x) instead of `vi.advanceTimersByTime()` (synchronous version stalls promises).
- Wrap hook tests in `renderHook` with a `QueryClientProvider` wrapper, using a fresh `QueryClient` per test with `defaultOptions: { queries: { retry: false } }` to avoid retry delays.

**Applies to:** TEST-03 (hooks), TEST-01 (API functions that have retry logic).

---

## Phase-Specific Warnings

| Task | Likely Pitfall | Mitigation |
|------|---------------|------------|
| BUG-01 (hooks conditional) | Splitting into `RegularExerciseCard` copies the array-index key problem | Fix the key strategy during the split, not after |
| BUG-02 (FileReader in RN) | Deleting "dead" code that is actually reached via a non-obvious UI path | Trace the call site before deleting; add a manual test of the RN import flow |
| DUP-01 (useCompletedSets shared) | `window.addEventListener('online')` leaks into shared | Inject as `onReconnect` callback; lint check shared imports after |
| DUP-02 (useWorkoutHistory) | `useInfiniteQuery` vs `useQuery` divergence hidden in shared | Only move identical functions; document the divergence explicitly in the shared file |
| DUP-03 (routineIO shared) | Moving N+1 bug to shared without fixing it | Fix the days query to include `id` before moving |
| TEST-01 (API tests) | Writing tests for pre-split code that is immediately restructured | Sequence: SIZE-01/02 first, then TEST-01 |
| TEST-02 (authStore) | `onAuthStateChange` subscription cleanup not tested | Test that `initialize()` calls `supabase.auth.onAuthStateChange` and that cleanup is returned |
| TEST-03 (hooks) | Fake timers stalling TanStack Query | Use `retry: false` in test QueryClient; avoid fake timers |
| SIZE-01/02 (API splits) | Missing function in barrel re-export is invisible until runtime | Enumerate all exported functions before and after split; smoke-test import |
| SIZE-03 (WorkoutExerciseCard) | Lost input state from React key change | Adopt stable key pattern before extracting sub-components |
| DX-01 (version sync) | TanStack Query behavior change | Do after TEST-01/03 exist; check changelog for 5.62→5.90 |
| DX-02 (CLAUDE.md) | Outdated structure confuses future AI sessions | Update after all structural changes are committed |

---

## Sources

- CONCERNS.md (project) — fragile areas: optimistic sets queue, array index as key, exportRoutine N+1 query
- DEUDA-TECNICA-V2.md (project) — task specifications with known risks per task
- [The Hidden Costs of Barrel Files](https://articles.wesionary.team/the-hidden-costs-of-barrel-files-25de560b9f63) — barrel file circular dependency and bundle size risks
- [TanStack Query Testing Strategies (DeepWiki)](https://deepwiki.com/TanStack/query/5.4-testing-strategies) — Vitest fake timer incompatibility with TanStack Query
- [Query never updates when using Vitest fake timers (GitHub issue)](https://github.com/TanStack/query/issues/6994) — confirmed fake timer issue
- [Expo monorepo guide](https://docs.expo.dev/guides/monorepos/) — package hoisting pitfalls in npm workspaces + Expo
- [Zustand persist race condition (pmndrs/zustand)](https://github.com/pmndrs/zustand/issues/394) — rehydration race condition with AsyncStorage
- [React Native monorepo shared hooks (Medium)](https://medium.com/redmadrobot-mobile/react-native-monorepo-with-shared-code-and-hooks-51cc3b87d795) — platform-specific API leakage into shared packages
