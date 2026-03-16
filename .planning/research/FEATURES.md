# Feature Landscape: Tech Debt Reduction

**Domain:** Technical debt reduction — React + React Native monorepo
**Researched:** 2026-03-16
**Scope:** 15 tasks across 5 categories: bugs, deduplication, test coverage, file splitting, DX

---

## Table Stakes

Features/approaches that are non-negotiable for any tech debt project. Missing any of these makes the effort fragile or counterproductive.

| Approach | Why Expected | Complexity | Notes |
|----------|--------------|------------|-------|
| Bugs first, always | Refactoring broken code propagates the bug into the refactored version | Low | BUG-01, BUG-02 must precede any refactor that touches the same files |
| Green lint/tests after every task | Each task is independently mergeable — a failing check breaks the independence guarantee | Low | `npm run lint -w apps/gym-native` and `npm test` after each commit |
| Backward-compatible exports | Splitting files must not break existing import paths | Low-Med | Barrel re-exports maintain compatibility during SIZE-01, SIZE-02 |
| Identical behavior post-deduplication | Moving hooks to shared must not change observable behavior in either app | Medium | Verify with both apps running after each DUP task |
| Tests verify correctness, not just coverage | Writing tests that mock everything and assert nothing is worse than no tests | Medium | Each TEST task should have at least one assertion on actual return values |
| Task independence enforced | Resist the urge to bundle tasks — if two tasks touch the same file, document the dependency explicitly | Low | Only known dependency: SIZE-03 depends on BUG-01 |

---

## Differentiators

Approaches that make this tech debt effort more effective than average. Not strictly required, but the difference between "we cleaned it up" and "we can now ship with confidence."

### Bug Fixes

| Approach | Value | Complexity | Notes |
|----------|-------|------------|-------|
| Extract to sibling component (BUG-01) | Solves the hooks violation permanently — no way to reintroduce it | Low | `WorkoutExerciseCard` becomes a dispatcher; `RegularExerciseCard` holds the hooks. This is the canonical React fix for hooks-after-return |
| Verify dead code before deleting (BUG-02) | Prevents shipping a broken import flow if the code path is actually reachable | Low | Check call sites for `importRoutine()` in RN before removing `FileReader` usage |
| Remove `eslint-disable` as the verification criterion | Makes the bug fix objectively verifiable, not subjectively "looks right" | Low | The DEUDA-TECNICA plan already specifies this — follow it exactly |

### Code Deduplication

| Approach | Value | Complexity | Notes |
|----------|-------|------------|-------|
| Platform injection via callback parameter | Allows shared hooks to be platform-agnostic without conditional platform checks inside shared code | Medium | `onVisibilityChange(callback)` for DUP-01 is the right pattern — avoids `Platform.OS` branching in shared layer |
| Move identical functions first (DUP-02 Opción A) | Lower risk than migrating `useQuery` to `useInfiniteQuery` across RN | Low-Med | Only move the hooks that are byte-for-byte identical; leave divergent ones per-app |
| Thin wrappers stay thin | Wrappers should be 3-10 lines max — if a "wrapper" grows logic, it's not a wrapper anymore | Low | Any wrapper > 20 lines is a signal the abstraction is wrong |
| Shared code must be platform-agnostic | Never import `document`, `window`, `AppState`, or `FileReader` in `packages/shared/` | Low | This is enforced by the eslint-plugin for React Native — let it catch violations automatically |

### Test Coverage

| Approach | Value | Complexity | Notes |
|----------|-------|------------|-------|
| Mock `getClient()` at the initApi boundary (TEST-01) | Keeps tests fast and deterministic; avoids real network calls | Low-Med | The plan's pattern is correct: `initApi(mockSupabase)` in `beforeEach`, then `vi.clearAllMocks()` |
| Test state machines, not just happy paths (TEST-02) | `createAuthStore` has multiple state transitions — test that `login()` sets the right state AND that `onBeforeLogout` fires before state clears | Medium | Missed state machine edges are where real bugs hide |
| Use `renderHook` + `QueryClientProvider` wrapper (TEST-03) | Hooks that use TanStack Query cannot be tested without a QueryClient — wrapping is mandatory, not optional | Medium | Create a shared `createTestQueryClient()` helper with `retry: false, staleTime: 0` to avoid infinite retries in tests |
| Prioritize by lines + mutation density | `workoutApi.js` at 598 lines with ~25 functions should be tested before smaller files — more bang per hour | Low | The plan's ordering by size is the right call |

### File Splitting

| Approach | Value | Complexity | Notes |
|----------|-------|------------|-------|
| Barrel re-export for backward compatibility | Existing consumers don't need to update imports when API files are split | Low | `workoutApi.js` becomes a barrel after splitting into 3 files — explicit named re-exports only, not `export *` |
| Avoid `export *` in barrels | `export *` prevents bundlers from tree-shaking unused code and makes it hard to trace what's exported | Low | Use `export { startSession, endSession } from './workoutSessionApi.js'` not `export * from ...` |
| Split by domain cohesion, not line count | Files should be split at natural boundaries (session vs sets vs exercises) not arbitrarily at line 300 | Low | SIZE-01 split into session/sets/exercises is already domain-correct |
| Component extraction follows single responsibility | `ExerciseCardHeader`, `SetsList`, `ExerciseCardActions` each own exactly one visual concern | Low-Med | After SIZE-03, each sub-component should be testable in isolation without the parent |

### DX Improvements

| Approach | Value | Complexity | Notes |
|----------|-------|------------|-------|
| Test dependency updates before syncing (DX-01) | Major version gaps in Supabase and TanStack Query between apps can have breaking changes | Low-Med | Run `npm run test:run -w apps/web && npm run build -w apps/web` after each package update, not all at once |
| Update docs to match reality, not aspiration (DX-02) | CLAUDE.md reflecting the monorepo structure prevents future contributors from following the wrong pattern | Low | Focus on: monorepo paths, `@gym/shared` barrel, shared + thin wrapper pattern, `initApi`/`initStores` |
| Root scripts as entry points, not shortcuts (DX-03) | `check` and `test:shared` reduce the cognitive load of "which command do I run?" | Low | 10 minutes of work — do this first or last, not in the middle |

---

## Anti-Features

Things to deliberately NOT do during this tech debt effort. Each has a reason grounded in the project's constraints.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Bundling multiple tasks into one commit | Destroys the independent mergeability guarantee that makes this project manageable | One commit per task, always. If tasks share a file, note the dependency explicitly |
| Adding new features while fixing tech debt | Conflates "is this broken because of my refactor or a new bug?" — impossible to isolate | If a feature idea surfaces during cleanup, add it to a backlog; do not implement it |
| Writing tests after deduplication without verifying pre-dedup behavior | Tests written against already-moved code cannot prove the move was correct | For DUP tasks: understand expected behavior first, then move, then test |
| Shared code with platform checks (`Platform.OS`, `typeof document`) | Platform branching in shared code is the anti-pattern the thin wrapper pattern exists to prevent | Move platform-specific code back to the app-level wrapper |
| `export *` in barrel files | Prevents tree-shaking; makes it impossible to know what the module exports without reading sub-files | Always use explicit named re-exports |
| TypeScript migration during cleanup | Explicitly out of scope by project decision; would cause task explosion | Continue in JavaScript; add JSDoc where types would have helped |
| Increasing test coverage by testing implementation details | Tests that verify private function calls rather than public behavior break on refactoring | Test what a function returns or what state it produces, not how it does it |
| Updating all dependency versions at once (DX-01) | Three packages with major version gaps failing simultaneously is a debugging nightmare | Update one package, run tests, commit, then update the next |
| Extracting UI components into shared package | Explicitly out of scope — each app maintains its own UI layer | Keep UI in `apps/web/src/components/` and `apps/gym-native/src/components/` |
| Migrating `useQuery` to `useInfiniteQuery` in RN for DUP-02 | This is a feature change disguised as deduplication — adds complexity and risk | Use Opción A: share only the hooks that are already identical |

---

## Feature Dependencies

```
BUG-01 → SIZE-03 (WorkoutExerciseCard can only be split after hooks violation is fixed)

DUP-03 → (implied) DUP-01, DUP-02 are independent and can be done in any order

TEST-01 → SIZE-01, SIZE-02 (tests should be written on the pre-split files OR updated after splitting;
          if tests are written post-split, the barrel re-exports must be in place first)

DX-03 → (none; do this any time, takes 10 minutes)
DX-01 → (none; independent, but should run test suite after each package bump)
DX-02 → (best done last; reflects the final state of the monorepo after DUP tasks complete)
```

Dependency summary table:

| Task | Depends On | Blocks |
|------|-----------|--------|
| BUG-01 | — | SIZE-03 |
| BUG-02 | — | — |
| DUP-01 | — | — |
| DUP-02 | — | — |
| DUP-03 | — | — |
| TEST-01 | — (or SIZE-01/02 if testing post-split) | — |
| TEST-02 | — | — |
| TEST-03 | — | — |
| SIZE-01 | — | TEST-01 (if tests written after) |
| SIZE-02 | — | TEST-01 (if tests written after) |
| SIZE-03 | BUG-01 | — |
| SIZE-04 | — | — |
| DX-01 | — | — |
| DX-02 | DUP-01, DUP-02, DUP-03 (best effort) | — |
| DX-03 | — | — |

---

## MVP Recommendation

For an 8-session execution plan, the minimum viable "debt is actually reduced" outcome requires:

**Must complete (blocking or crash-risk):**
1. BUG-01 — Hooks violation causes crashes; blocks SIZE-03
2. BUG-02 — FileReader crash in production RN; 15-minute fix
3. DX-03 — Root scripts; 10-minute fix; enables the `check` command for all subsequent verification

**High ROI (most lines removed per hour):**
4. DUP-03 — 500 lines, 1 hour, pure extraction with no platform branching
5. DUP-01 — 700 lines, 1.5 hours, platform injection pattern (hardest of the DUP tasks)
6. DUP-02 — 250 lines, 1 hour, copy the identical hooks, leave the divergent ones

**Confidence (tests before splitting):**
7. TEST-01 — API layer has 0% coverage; highest risk of silent regressions
8. TEST-02 — authStore has 0 tests; `createWorkoutStore` pattern already exists, follow it

**Defer if time-constrained:**
- SIZE-01, SIZE-02: Files are large but working. Split improves readability, not correctness.
- SIZE-03, SIZE-04: Component extraction is cosmetic. Correct after BUG-01, not urgent.
- TEST-03: Hooks are already covered implicitly by the app working. Add when time allows.
- DX-01, DX-02: Important for future maintainability but zero user-facing impact.

---

## Sources

- [React Rules of Hooks — react.dev](https://react.dev/warnings/invalid-hook-call-warning)
- [TanStack Query Testing Guide](https://tanstack.com/query/v4/docs/framework/react/guides/testing)
- [TanStack Query Testing Strategies — DeepWiki](https://deepwiki.com/TanStack/query/5.4-testing-strategies)
- [Please Stop Using Barrel Files — tkdodo.eu](https://tkdodo.eu/blog/please-stop-using-barrel-files) (HIGH confidence — TkDodo is a TanStack Query maintainer)
- [Faster Builds by Removing Barrel Files — Atlassian](https://www.atlassian.com/blog/atlassian-engineering/faster-builds-when-removing-barrel-files)
- [Speeding Up JS Ecosystem: Barrel File Debacle — marvinh.dev](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/)
- [Testing Supabase with React Testing Library and MSW — nygaard.dev](https://nygaard.dev/blog/testing-supabase-rtl-msw)
- [Monorepo Dependency Chaos — DEV Community](https://dev.to/alex_aslam/monorepo-dependency-chaos-proven-hacks-to-keep-your-codebase-sane-and-your-team-happy-1957)
- [check-dependency-version-consistency — npm](https://www.npmjs.com/package/check-dependency-version-consistency)
- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/)
