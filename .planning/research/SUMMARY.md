# Project Research Summary

**Project:** Gym Tracker — Tech Debt Reduction (monorepo web + RN)
**Domain:** Technical debt reduction in a React + React Native npm workspaces monorepo
**Researched:** 2026-03-16
**Confidence:** HIGH

## Executive Summary

This is a tech debt reduction project on an existing, working monorepo. The stack is already decided and validated — no technology replacement is needed or recommended. The work consists of 15 discrete tasks across five categories: bug fixes (2), code deduplication (3), test coverage (3), file splitting (4), and developer experience (3). The overarching goal is to move duplicated logic from `apps/web` and `apps/gym-native` into `packages/shared`, add tests to the now-untested API and store layers, and split oversized files for readability and testability.

The recommended execution order follows a strict dependency graph: fix the two production-risk bugs first (one causes React hook crashes, one is a guaranteed FileReader crash in RN), then eliminate duplication before writing tests so tests target their final home, then split large files to bound test scope, then write the tests, then do housekeeping. DX-03 (root scripts) is a 10-minute task that should be done at the start of any phase to make all subsequent verification easier. This order is not arbitrary — it is derived from hard dependency constraints: BUG-01 must precede SIZE-03, DUP tasks must precede TEST-03, and SIZE-01/02 should precede TEST-01.

The three critical risks are: (1) barrel re-exports that silently omit functions, causing runtime crashes with no build-time warning; (2) platform-specific browser/RN APIs leaking into `packages/shared`, breaking the other platform at import time; and (3) upgrading TanStack Query from 5.62 to 5.90 without a test safety net, which can silently change cache invalidation behavior. All three are preventable with the right sequencing and verification steps documented in the research.

---

## Key Findings

### Recommended Stack

The existing stack is complete and should not be extended except for one tool: `syncpack` to fix dependency version drift between workspaces. All other infrastructure (Vitest, @testing-library/react, ESLint v9, Playwright) is already in place and configured. The shared package tests already run through the web app's vitest config — no separate test runner for `packages/shared` is needed or beneficial.

The only new dev dependency is `syncpack` (one command: `npm install -D syncpack`), which is the industry-standard tool for exactly this problem (version mismatches between workspaces). Three packages are out of sync: `@supabase/supabase-js` (web 2.49 vs native 2.98), `@tanstack/react-query` (web 5.62 vs native 5.90), `zustand` (web 5.0.2 vs native 5.0.11).

**Core technologies (existing, no change):**
- `Vitest + @testing-library/react`: unit and hook tests — already configured, runs shared package tests via web config
- `ESLint v9 flat config + @gym/eslint-config`: linting across both apps — working, catches platform API leaks in RN
- `syncpack`: dependency version alignment — only new addition, one-command fix for 3 known mismatches
- `npm workspaces`: monorepo orchestration — working, no need for Turborepo/Nx at this project size

### Expected Features (Tasks)

**Must complete (blocking or crash-risk):**
- BUG-01: React hooks violation in `WorkoutExerciseCard` (RN) — causes silent crashes; blocks SIZE-03
- BUG-02: `FileReader` usage in `apps/gym-native/src/lib/routineIO.js` — guaranteed crash if code path runs; 15-minute fix
- DX-03: Root scripts (`check`, `test:shared`, `deps:check`) — 10 minutes; enables consistent verification for all subsequent tasks

**High ROI (duplication removal, ~1,400 lines):**
- DUP-03: Move `exportRoutine`, `importRoutine`, `duplicateRoutine` to `packages/shared` — ~500 lines, independent of all other DUP tasks; fix the N+1 query during the move
- DUP-01: Move `useCompletedSets` + `useSession` to shared with injected `onVisibilityChange` callback — ~700 lines; hardest DUP task due to platform-specific visibility API
- DUP-02: Move `useWorkoutHistory` to shared — ~250 lines; only move identical hooks, leave divergent `useInfiniteQuery` vs `useQuery` difference per-app

**Test coverage (before file splits, after deduplication):**
- TEST-01: API layer (`workoutApi.js`, `routineApi.js`) — currently 0% coverage on 598-line and 427-line files; mock `getClient()` via `initApi(mockSupabase)` pattern
- TEST-02: `createAuthStore` — 0 tests vs `createWorkoutStore`'s 21; same factory pattern already established
- TEST-03: Hook tests for shared hooks — write after DUP-01/02 so tests target the final shared implementations

**File splitting (readability + bounded test scope):**
- SIZE-01: Split `workoutApi.js` into session/sets/exercises sub-modules with barrel re-export
- SIZE-02: Split `routineApi.js` into query/mutation sub-modules with barrel re-export
- SIZE-03: Extract sub-components from `WorkoutExerciseCard` — requires BUG-01 complete; adopt stable key pattern
- SIZE-04: Extract sub-components from `ExerciseHistoryModal`

**Housekeeping (defer if time-constrained):**
- DX-01: Align dependency versions with syncpack — safest after TEST-01/03 exist as regression net
- DX-02: Rewrite CLAUDE.md to reflect monorepo structure — best done last when architecture is stable

**Anti-features (do not do):**
- Bundling multiple tasks in one commit
- Adding new features during cleanup
- Moving hooks to shared before understanding their behavior (tests first, or verify first)
- Using `export *` in barrel files (breaks tree-shaking)
- TypeScript migration (explicitly out of scope)
- Migrating `useQuery` to `useInfiniteQuery` in RN as part of DUP-02 (feature change, not dedup)

### Architecture Approach

The monorepo has a strict layered architecture with clear component boundaries. `packages/shared` contains the API layer (pure async functions, zero React), Zustand factory functions, TanStack Query hooks, and pure utilities. Platform apps provide the Supabase client, storage adapters, and store instances via injection contracts (`initApi`, `initStores`, `initNotifications`). The boundary is enforced by rule: `packages/shared` must never import from `apps/*` and must never import platform-specific APIs (`window`, `document`, `AppState`, `FileReader`). The injection pattern — proven in phases 3-5 of the monorepo migration — handles all platform divergence by accepting callbacks for platform-specific behavior.

**Major components:**
1. `packages/shared/src/api/` — Supabase operations; zero React; mocked via `initApi(mockSupabase)`; target of SIZE-01, SIZE-02, DUP-03, TEST-01
2. `packages/shared/src/hooks/` — TanStack Query wrappers; target of DUP-01, DUP-02, TEST-03
3. `packages/shared/src/stores/` — Zustand factory functions; `createWorkoutStore` has 21 tests; `createAuthStore` has 0; target of TEST-02
4. `apps/*/src/hooks/` — thin wrappers (3-10 lines) that inject platform callbacks into shared hooks; anything larger is a sign the abstraction is wrong
5. `apps/*/src/lib/routineIO.js` — 353 and 345 lines of near-identical code; pure Supabase logic moves to shared, platform I/O stays per-app

### Critical Pitfalls

1. **Barrel re-export silently omits a function** — JavaScript doesn't throw on missing named exports until the function is called at runtime. After any split (SIZE-01, SIZE-02, DUP-03), enumerate all previously-exported functions and verify the barrel covers each one. Run `npm run build -w apps/web` as minimum verification. Write a smoke-test import that asserts each function `!== undefined`.

2. **Platform API leaks into `packages/shared`** — Copying `useSyncPendingSets` or `routineIO` to shared without removing `window.addEventListener`, `document`, or `FileReader` breaks the other platform at import time (Metro crashes immediately). After moving any hook or function to shared, verify the import section contains zero platform-specific imports. The ESLint RN config will catch `window`/`document` as `no-undef` — run lint immediately after each DUP task.

3. **TanStack Query upgrade breaks cache behavior without a test net** — Upgrading from 5.62 to 5.90 (28 minor versions) risks silent changes to `refetchOnWindowFocus`, `staleTime`, and `structuralSharing` defaults. Do DX-01 only after TEST-01 and TEST-03 are in place. Check the changelog for behavior changes in the 5.62–5.90 range before upgrading.

4. **Pending sets queue uses stale session ID after rehydration** — If `pendingSets` is non-empty when a new session starts (app killed mid-workout), `useSyncPendingSets` may retry old sets against the new session ID, silently corrupting workout data. Before implementing DUP-01, add a guard in `startSession()` and include a rehydration test scenario in TEST-02.

5. **React key strategy lost during component extraction** — `WorkoutExerciseCard` currently uses `key={i + 1}` (array index). Extracting `SetsList` without adopting a stable key (`${sessionExerciseId}-${setNumber}`) causes React to unmount/remount set inputs during re-renders, losing user-typed weight values mid-workout. Adopt the stable key during SIZE-03, not after.

---

## Implications for Roadmap

### Phase 1: Stop the Bleeding
**Rationale:** Two tasks carry production crash risk. BUG-01 (hooks violation) can cause silent crashes in RN; BUG-02 (FileReader) is a guaranteed crash if the import code path runs. These must be fixed before any refactoring touches the same files. DX-03 costs 10 minutes and enables the `check` command used to verify every subsequent task.
**Delivers:** No active crashes, verification tooling in place
**Addresses:** BUG-01, BUG-02, DX-03
**Avoids:** Propagating bugs into refactored code; broken SIZE-03 if BUG-01 not fixed first

### Phase 2: Eliminate Duplication
**Rationale:** ~1,400 lines of duplicated logic across both apps is the primary structural debt. This must happen before writing tests — if tests target per-app hooks that are then moved to shared, those tests need to be rewritten or relocated. Move code to its final home first, then test it there.
**Delivers:** Single implementation of session hooks, workout history hooks, and routine I/O functions; ~1,400 lines removed from app directories
**Addresses:** DUP-03, DUP-01, DUP-02
**Avoids:** Writing tests against code about to be deleted (TEST-03 ordering constraint); propagating N+1 query bug to both apps (fix during DUP-03)

### Phase 3: Make Large Files Testable
**Rationale:** Writing tests against 598-line and 427-line monolith files yields test files that are themselves hard to navigate. Splitting first creates focused modules with clear boundaries. A barrel re-export preserves the public interface — no consumer changes required. After this phase, TEST-01 can target bounded sub-modules.
**Delivers:** `workoutApi.js` split into 3 focused files; `routineApi.js` split into 2; barrel re-exports maintain existing `@gym/shared` import paths
**Addresses:** SIZE-01, SIZE-02
**Avoids:** Barrel re-export holes (enumerate exports before/after split; build smoke test)

### Phase 4: Test Coverage
**Rationale:** With duplication eliminated and API files split, the code is in its final shape. Tests written now will not need to be moved or rewritten. The API layer has 0% coverage on the two largest files; `createAuthStore` has 0 tests despite having complex auth state transitions; shared hooks need tests that target the shared implementations directly.
**Delivers:** ~60% coverage on API layer; `createAuthStore` test parity with `createWorkoutStore`; hook tests for three highest-risk shared hooks
**Addresses:** TEST-01, TEST-02, TEST-03
**Avoids:** Fake timers stalling TanStack Query (use `retry: false` in test `QueryClient`; avoid `vi.useFakeTimers()` in hook tests)

### Phase 5: Housekeeping
**Rationale:** Component splits and dependency upgrades are lower risk but benefit from the full test suite being in place. SIZE-03 requires BUG-01 (done in Phase 1). DX-01 (version sync) is safest after TEST-01/03 provide a regression net. DX-02 (CLAUDE.md rewrite) is best done last so it documents the architecture that actually exists after all refactors.
**Delivers:** Large components split into focused sub-components; dependency versions aligned across workspaces; CLAUDE.md accurate for future sessions
**Addresses:** SIZE-03, SIZE-04, DX-01, DX-02
**Avoids:** React key loss during component extraction (adopt stable key in SIZE-03); TanStack Query behavior regression (check changelog before DX-01)

### Phase Ordering Rationale

- Phase 1 before all others: crash-risk tasks cannot be deferred; BUG-01 is a hard dependency for SIZE-03
- Phase 2 before Phase 4: DUP tasks must precede TEST-03 so hook tests target the shared implementations
- Phase 3 before Phase 4: API splits create bounded modules; TEST-01 is cleaner when targeting sub-files
- Phase 5 last: SIZE-03 needs BUG-01 (Phase 1); DX-01 needs test coverage (Phase 4); DX-02 should reflect final state
- DX-03 can be in Phase 1 or done as first task of any phase — it has no dependencies and enables verification for everything that follows

### Research Flags

Phases with standard patterns (no additional research needed):
- **Phase 1:** Both bugs have clear, documented fixes. DX-03 is script configuration. No unknowns.
- **Phase 3:** Barrel re-export pattern is well-established; splitting files is mechanical once domain boundaries are defined.
- **Phase 5:** Component extraction follows standard React single-responsibility pattern; dependency upgrade is mechanical with a test suite in place.

Phases that may benefit from a quick review before execution:
- **Phase 2:** The `onVisibilityChange` callback injection pattern (DUP-01) is novel to this codebase. Review the existing `initNotifications` implementation as the canonical example before coding. The N+1 fix in DUP-03 needs the specific Supabase nested select syntax confirmed against the existing schema.
- **Phase 4:** The `initApi` mock chain pattern (TEST-01) needs to match the actual chain depth per function. Review actual Supabase call chains in each sub-module before writing mocks — wrong chain depth causes tests to pass with wrong data.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings from direct codebase inspection. Only new tool (syncpack) verified via official docs and widespread adoption. |
| Features | HIGH | Tasks are concrete and inventoried in DEUDA-TECNICA-V2.md. Dependencies derived from actual code relationships. |
| Architecture | HIGH | All constraints derived from direct file inspection, not inference. Existing injection patterns in codebase provide proof-of-concept for all DUP approaches. |
| Pitfalls | HIGH | Critical pitfalls are grounded in documented project concerns (CONCERNS.md), confirmed GitHub issues (TanStack Query fake timers, Zustand rehydration), and one live bug already present in the codebase (BUG-02 FileReader). |

**Overall confidence:** HIGH

### Gaps to Address

- **DUP-02 divergence:** `useWorkoutHistory` has `useQuery` in web and `useInfiniteQuery` in RN. The plan says to move only identical hooks and document the divergence. Before Phase 2, confirm which specific functions within `useWorkoutHistory` are byte-for-byte identical and which are divergent. This is a 15-minute grep exercise, not a blocker.
- **Supabase chain depth per API function:** TEST-01 requires a mock that returns the right shape for each chain. Before writing tests, catalog the actual chain pattern for each function in `workoutApi.js` and `routineApi.js` sub-modules. No new tooling needed — just read the files.
- **BUG-02 call site verification:** Before deleting `FileReader` usage in `apps/gym-native/src/lib/routineIO.js`, verify that the import flow is genuinely unreachable in the current RN UI. The research recommends tracing the call site before deleting. This takes 5 minutes.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `/Users/sergio/MyProjects/gym-routine-page/.planning/codebase/ARCHITECTURE.md` — component boundaries, layer definitions
- `/Users/sergio/MyProjects/gym-routine-page/.planning/codebase/STRUCTURE.md` — file inventory, duplication counts
- `/Users/sergio/MyProjects/gym-routine-page/docs/DEUDA-TECNICA-V2.md` — task specifications, known risks per task
- `/Users/sergio/MyProjects/gym-routine-page/docs/CONCERNS.md` — documented fragile areas (pending sets queue, array index keys, N+1 queries)

### Primary (HIGH confidence — official docs)
- [Vitest Projects (Monorepo)](https://vitest.dev/guide/projects) — projects config, v8 coverage
- [TanStack Query v5 Testing Guide](https://tanstack.com/query/v5/docs/react/guides/testing) — `renderHook` + `QueryClientProvider` pattern
- [Syncpack official](https://syncpack.dev/) — workspace version alignment

### Secondary (MEDIUM confidence — community sources)
- [tkdodo.eu — Testing React Query](https://tkdodo.eu/blog/testing-react-query) — TanStack Query maintainer; `createTestQueryClient` helper pattern
- [tkdodo.eu — Please Stop Using Barrel Files](https://tkdodo.eu/blog/please-stop-using-barrel-files) — barrel file tree-shaking and explicit re-exports
- [TanStack Query fake timers issue (GitHub #6994)](https://github.com/TanStack/query/issues/6994) — confirmed fake timer incompatibility

### Secondary (MEDIUM confidence — incident reports and blogs)
- [Zustand persist race condition (GitHub #394)](https://github.com/pmndrs/zustand/issues/394) — rehydration timing with AsyncStorage
- [React Native monorepo shared hooks (Medium)](https://medium.com/redmadrobot-mobile/react-native-monorepo-with-shared-code-and-hooks-51cc3b87d795) — platform API leakage patterns

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
