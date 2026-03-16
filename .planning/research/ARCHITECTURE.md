# Architecture Patterns — Tech Debt Reduction

**Domain:** Monorepo tech debt reduction (React web + React Native)
**Researched:** 2026-03-16
**Source:** Codebase analysis — ARCHITECTURE.md, STRUCTURE.md, DEUDA-TECNICA-V2.md, direct file inspection

---

## Current Architecture

The monorepo uses a strict layered architecture with a shared business logic package
(`@gym/shared`) consumed by two platform apps. The layers, from bottom to top:

```
packages/shared/src/
  lib/        ← Pure utils (no React, no Supabase). 35 files, 16 have tests.
  api/        ← Supabase operations. 7 files, 0 tests. workoutApi.js = 598 lines.
  stores/     ← Zustand factory functions (createWorkoutStore, createAuthStore)
  hooks/      ← TanStack Query wrappers over API layer

apps/web/src/
  stores/     ← Web instances (localStorage)
  hooks/      ← Web-specific hooks + duplicated logic (useSession, useCompletedSets, useWorkoutHistory)
  lib/        ← routineIO.js (353 lines, ~500 lines duplicated vs native)
  components/ ← Web UI (not shared)
  pages/      ← Route components

apps/gym-native/src/
  stores/     ← Native instances (AsyncStorage)
  hooks/      ← Native-specific hooks + duplicated logic (useSession, useCompletedSets, useWorkoutHistory)
  lib/        ← routineIO.js (345 lines, mirrors web)
  components/ ← Native UI (not shared)
  screens/    ← Screen components
```

---

## Component Boundaries

### Boundary 1: `packages/shared` vs `apps/*`

This is the central boundary of the architecture. The contract is:

| What belongs in `packages/shared` | What belongs in `apps/*` |
|------------------------------------|--------------------------|
| All Supabase API calls | Platform Supabase client creation |
| TanStack Query hooks (once unified) | Platform storage adapters |
| Zustand store factory functions | Store instantiation |
| Pure utility functions | UI components |
| Constants and QUERY_KEYS | Navigation/routing |
| Toast abstraction interface | Toast implementation |

**Violation today:** `useCompletedSets`, `useSession`, `useWorkoutHistory`, and `routineIO`
core functions exist in both `apps/web` and `apps/gym-native` instead of `packages/shared`.
This is the primary target of the DUP tasks.

**Rules that cannot be broken:**
- `packages/shared` must not import from `apps/*` — ever.
- `packages/shared` must not import React Native APIs or browser APIs directly.
- Platform-specific code in `apps/*` communicates with shared only via the injection
  contracts: `initApi(supabase)`, `initStores({...})`, `initNotifications(fn)`.

### Boundary 2: API layer vs Hooks layer

- API layer: pure async functions, zero React. Only dependency is `getClient()` from
  `_client.js`. Receives a Supabase client at startup, returns raw data.
- Hooks layer: TanStack Query wrappers around API. Allowed to call stores via the
  `_stores.js` injection wrapper. Cannot be called outside React components.

**Consequence for SIZE-01 / SIZE-02:** Splitting `workoutApi.js` and `routineApi.js`
into sub-modules is purely internal to the API layer. A barrel re-export preserves the
public contract. No change to hooks or components is required.

### Boundary 3: Hooks layer vs Components layer

Components never call API functions directly. They only consume hooks. This boundary
is clean today and must stay clean after DUP tasks move hooks to shared.

### Boundary 4: Shared hooks vs Platform-specific hooks

The injection pattern (`_stores.js`) lets shared hooks call `useAuthStore()` and
`useWorkoutStore()` without knowing which store instance the platform created. The
thin wrapper hooks in `apps/*/src/hooks/` either re-export from shared or add small
platform-specific concerns (e.g., `document.visibilitychange` vs `AppState`).

---

## Safe Refactoring Order

Dependency constraints between tasks determine the order. The graph is:

```
BUG-01
  └─→ SIZE-03 (WorkoutExerciseCard refactor requires hooks to be legal first)

DUP-03 (routineIO → shared API)
  └─→ independent of all other tasks

DUP-01 (useCompletedSets + useSession → shared hooks)
  └─→ independent; injects platform visibility callback

DUP-02 (useWorkoutHistory → shared hooks)
  └─→ independent

SIZE-01 (split workoutApi.js)
  └─→ safe before or after DUP-01; barrel export preserves interface
  └─→ if done BEFORE TEST-01, tests target the split modules (cleaner)

SIZE-02 (split routineApi.js)
  └─→ same as SIZE-01; if done before DUP-03, the moved routineIO functions
      land in the already-split module

TEST-01 (API tests)
  └─→ benefits from SIZE-01 and SIZE-02 being done first (smaller modules)
  └─→ benefits from DUP-03 being done first (no duplicate API code to test)

TEST-02 (createAuthStore tests)
  └─→ independent; no shared dependencies

TEST-03 (hook tests)
  └─→ benefits from DUP-01 + DUP-02 done first (tests target shared hooks,
      not duplicated per-app hooks)

DX-01 (dependency sync)
  └─→ independent; safest last (run full test suite after upgrade)

DX-02 (CLAUDE.md update)
  └─→ independent; best done last when architecture is stable

DX-03 (root scripts)
  └─→ independent; can be done any time
```

### Strict dependency pairs (must respect)

| Task | Requires |
|------|----------|
| SIZE-03 | BUG-01 complete |
| TEST-01 full coverage | SIZE-01 + SIZE-02 done (optional but cleaner) |
| TEST-03 | DUP-01 + DUP-02 done (test the right code) |

All other tasks are independent. The DEUDA-TECNICA-V2 session order already respects
these constraints.

---

## Recommended Build Order

Five logical groups with clear rationale for each:

### Group 1 — Stop the bleeding (bugs + tooling)
**Tasks:** BUG-01, BUG-02, DX-03

Fix the two production-risk bugs first. React hooks rule violations can cause silent
crashes in React Native. BUG-02 (FileReader) is a guaranteed crash if the code path
executes. DX-03 (root scripts) costs 10 minutes and makes every subsequent task easier
to verify.

**Safe to parallelize:** Yes, all three are independent.

### Group 2 — Eliminate duplication (biggest ROI)
**Tasks:** DUP-03, DUP-01, DUP-02

Remove ~1,400 lines of duplicated code by moving logic to `packages/shared` with thin
wrappers in each app. This must happen before writing tests (Group 3), otherwise tests
would target code that is about to be moved.

**Safe to parallelize:** DUP-03 is independent of DUP-01 and DUP-02. DUP-01 and DUP-02
can run in parallel since they touch different hooks.

**Why this order matters for tests:** If tests are written against per-app hooks that
are later moved to shared, those tests either need to be moved or duplicated. Write
tests after the code is in its final home.

### Group 3 — Make large files testable (size reduction)
**Tasks:** SIZE-01, SIZE-02

Split the two large API files into focused modules. Do this before writing API tests
so that each test file has a clear, bounded scope. A barrel re-export in `workoutApi.js`
and `routineApi.js` ensures existing hook imports continue to work without changes.

**Note on DUP-03 interaction:** If SIZE-02 is done before DUP-03, the `exportRoutine`,
`importRoutine`, and `duplicateRoutine` functions will land in a well-structured
`routineMutationApi.js` immediately rather than a 427-line monolith.

**Safe to parallelize:** Yes, SIZE-01 and SIZE-02 touch different files.

### Group 4 — Test coverage
**Tasks:** TEST-01, TEST-02, TEST-03

With duplication eliminated and API files split, the code is in its final shape.
Tests written now will not need to be relocated.

- TEST-01: 0 → ~60% coverage on API layer. Mock `getClient()` at the module level.
  7 API files, start with the two largest (workoutApi, routineApi).
- TEST-02: Fills the gap vs `createWorkoutStore` (21 tests) — `createAuthStore` has 0.
- TEST-03: Hook tests for the three highest-risk shared hooks.

**Safe to parallelize:** All three test tasks are independent.

### Group 5 — Housekeeping
**Tasks:** SIZE-03, SIZE-04, DX-01, DX-02

Large component splits and dependency upgrades. SIZE-03 requires BUG-01 (done in
Group 1). DX-01 (version sync) is safest last because upgrading three dependencies
should be validated against the full test suite, which is now more complete.

DX-02 (CLAUDE.md rewrite) is best done last — it documents the architecture that
actually exists after all refactors are complete.

**Safe to parallelize:** SIZE-03, SIZE-04, and DX-02 are independent. DX-01 should
run after tests pass.

---

## Architecture Patterns for Each Task Type

### Pattern: Move hook to shared with injected platform callback

Used by DUP-01. The hook in shared accepts a callback for the platform-specific
concern (visibility detection). Platform wrappers pass the right implementation.

```
packages/shared/src/hooks/useCompletedSets.js
  ← accepts onVisibilityChange as parameter

apps/web/src/hooks/useCompletedSets.js
  ← thin wrapper: passes document.addEventListener('visibilitychange', ...)

apps/gym-native/src/hooks/useCompletedSets.js
  ← thin wrapper: passes AppState.addEventListener('change', ...)
```

This is the same injection pattern as `initNotifications` — a proven pattern in this
codebase.

### Pattern: Move functions to shared API, keep platform code in apps

Used by DUP-03. Pure Supabase logic (`exportRoutine`, `importRoutine`,
`duplicateRoutine`) moves to `routineApi.js` in shared. Platform-specific I/O stays
in apps:
- Web keeps `downloadRoutineAsJson` (DOM Blob/URL) and `readJsonFile` (FileReader)
- Native keeps Expo FileSystem equivalents (or removes dead code per BUG-02)

### Pattern: Split large file with barrel re-export

Used by SIZE-01 and SIZE-02. New sub-modules are created in the same directory.
The original file becomes a barrel that re-exports everything. All existing
`import { ... } from '@gym/shared'` imports continue to work without modification.

```
workoutApi.js          ← becomes: export * from './workoutSessionApi.js'; export * from ...
workoutSessionApi.js   ← new file, starts/ends/cancels sessions
completedSetsApi.js    ← new file, set CRUD
sessionExercisesApi.js ← new file, add/remove/reorder exercises
```

### Pattern: Mocking the API layer for tests

Used by TEST-01. `getClient()` is the sole Supabase dependency. A mock Supabase
object mimicking the chainable builder pattern is created once per test file. The
`initApi(mockSupabase)` call at `beforeEach` resets state cleanly.

---

## Scalability Considerations

These refactors improve maintainability linearly as new features are added:

| Concern | Without refactors | After refactors |
|---------|------------------|-----------------|
| Adding new API function | Add to one file, manually copy to other app if needed | Add once to `packages/shared/src/api/` |
| Adding new hook | Risk of divergence between apps | Add to shared, wrap in apps |
| Debugging a session bug | Trace through duplicated code in two files | Single shared implementation |
| Test coverage for new feature | No test harness for API layer | Established mock pattern to follow |
| Onboarding a developer | CLAUDE.md describes old structure | CLAUDE.md accurate after DX-02 |

---

## Risks and Constraints

### Risk: Breaking the shared-to-app import direction
Any refactor that causes `packages/shared` to import from `apps/*` would break the
architecture. This cannot happen by construction if the injection pattern is used
correctly, but watch for it during DUP-01 when wiring visibility callbacks.

### Risk: Barrel re-export masking broken imports
When splitting SIZE-01 and SIZE-02, verify the barrel covers all previously-exported
function names. A missed export will cause a runtime error, not a build error in
JavaScript.

### Constraint: BUG-01 before SIZE-03
WorkoutExerciseCard (RN) currently has illegal hook placement. Extracting sub-components
from it before fixing the hook order would just propagate the violation into the new
components. BUG-01 must land first.

### Constraint: DUP tasks before TEST-03
Hook tests written against per-app `useCompletedSets.js` or `useWorkoutHistory.js`
would target code that is subsequently deleted and replaced with thin wrappers. Do the
DUP tasks first so TEST-03 tests the shared implementations directly.

---

## Sources

- `/Users/sergio/MyProjects/gym-routine-page/.planning/codebase/ARCHITECTURE.md` (codebase analysis)
- `/Users/sergio/MyProjects/gym-routine-page/.planning/codebase/STRUCTURE.md` (codebase analysis)
- `/Users/sergio/MyProjects/gym-routine-page/docs/DEUDA-TECNICA-V2.md` (tech debt plan)
- Direct file inspection: API layer sizes, hook duplication counts, test coverage state

**Confidence:** HIGH — all findings are based on direct codebase inspection, not
training data or web search. Architecture constraints are derived from existing
patterns already proven in the codebase (phases 3-5 of the monorepo migration).
