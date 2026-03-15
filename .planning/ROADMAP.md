# Roadmap: Gym Tracker Monorepo

## Overview

Incremental migration from two near-identical codebases into an npm workspaces monorepo with a shared `packages/shared` package. The migration proceeds in strict dependency order — scaffold first, then pure utils, then the API layer, then store factories, then hooks — leaving both apps fully functional after each phase. Phase 1 proves that both bundlers and EAS Build can resolve imports from the shared package before any production code moves. Phases 2-5 migrate code in dependency order. Phase 6 cleans up the remaining duplicated constants and developer tooling.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Monorepo Scaffold** - Prove both bundlers and EAS Build resolve `@gym/shared` imports before any production code migrates (completed 2026-03-15)
- [x] **Phase 2: Utils Migration** - Move 16 pure utility files and 18 tests to `packages/shared`, both apps import from `@gym/shared` (completed 2026-03-15)
- [x] **Phase 3: API Layer Migration** - Move 7 API files to `packages/shared`, refactor RN from inline queries to shared API functions (completed 2026-03-15)
- [x] **Phase 4: Store Factories** - Extract Zustand stores to injectable factory functions, each platform provides its own storage adapter (completed 2026-03-15)
- [x] **Phase 5: Hooks Migration** - Share TanStack Query hooks with thin platform wrapper hooks in each app (completed 2026-03-15)
- [ ] **Phase 6: DX Cleanup** - Shared constants, queryClient, ESLint config, zero duplicated files remain

## Phase Details

### Phase 1: Monorepo Scaffold
**Goal**: Both apps and EAS Build can import from `@gym/shared` with no bundler errors, duplicate React instances, or CI failures
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06, SETUP-07, SETUP-08
**Success Criteria** (what must be TRUE):
  1. `npm install` from repo root links all workspaces and both apps start without errors
  2. A trivial export from `packages/shared/src/index.js` is importable in web (Vite) and gym-native (Metro/Expo) simultaneously
  3. EAS cloud build passes with the trivial shared import in place
  4. `npm why react` in each app resolves to a single path (no duplicate React instances)
  5. Root-level `npm run dev`, `npm run native`, and `npm test` all execute the correct app or test suite
**Plans:** 3/3 plans complete

Plans:
- [ ] 01-01-PLAN.md — Restructure repo into monorepo layout with git mv, create package.json files, npm install
- [ ] 01-02-PLAN.md — Add smoke test @gym/shared import to both apps, verify Vite + Metro resolve it
- [ ] 01-03-PLAN.md — Validate EAS cloud build with monorepo structure

### Phase 2: Utils Migration
**Goal**: All 16 shared utility files and their 18 test files live in `packages/shared`, both apps import from `@gym/shared`, and no utility logic is duplicated
**Depends on**: Phase 1
**Requirements**: UTIL-01, UTIL-02, UTIL-03, UTIL-04
**Success Criteria** (what must be TRUE):
  1. All 16 util files are in `packages/shared/src/lib/` and deleted from both apps' `src/lib/`
  2. `packages/shared/src/index.js` re-exports all shared modules as the stable import surface
  3. `npm test` from monorepo root passes all 18 test files co-located with their utils
  4. `supabase.js`, `styles.js`, and `videoStorage.js` are absent from `packages/shared` (confirmed platform-specific)
  5. Both apps build and run without errors after the migration
**Plans:** 2/2 plans complete

Plans:
- [ ] 02-01-PLAN.md — Move 16+18 files to packages/shared via git mv, handle borderline files (constants.js, routineIO.js), update barrel and vitest config
- [ ] 02-02-PLAN.md — Bulk find-replace all shared util imports in both apps, verify builds and tests, atomic commit

### Phase 3: API Layer Migration
**Goal**: The 7 Supabase API files live in `packages/shared`, web imports them from `@gym/shared`, and RN hooks are refactored from inline queries to the shared API functions
**Depends on**: Phase 2
**Requirements**: API-01, API-02, API-03, API-04
**Success Criteria** (what must be TRUE):
  1. All 7 API files are in `packages/shared/src/api/` and no inline Supabase queries remain in RN hooks
  2. API functions receive the Supabase client as a parameter — no direct `supabase.js` import inside `packages/shared`
  3. Web hooks import API functions from `@gym/shared` and produce identical data to pre-migration behavior
  4. RN hooks produce identical data to web hooks for the same operations
**Plans:** 4/4 plans complete

Plans:
- [ ] 03-01-PLAN.md — Create _client.js injection, move 7 API files to shared, wire initApi in both apps
- [ ] 03-02-PLAN.md — Update web hook imports from ../lib/api/ to @gym/shared, delete old api/
- [ ] 03-03-PLAN.md — Refactor 8 direct-map RN hooks to shared API calls
- [ ] 03-04-PLAN.md — Refactor 3 complex RN hooks (session, completedSets, sessionExercises) + add addSessionExercise

### Phase 4: Store Factories
**Goal**: Zustand stores are factory functions in `packages/shared`, each platform instantiates them with its own storage adapter, and state persists correctly on both platforms
**Depends on**: Phase 3
**Requirements**: STOR-01, STOR-02, STOR-03, STOR-04, STOR-05
**Success Criteria** (what must be TRUE):
  1. `createWorkoutStore(storage)` and `createAuthStore(supabase, storage)` are in `packages/shared/src/stores/`
  2. Web instantiates stores with `localStorage` adapter and state persists across page reloads
  3. RN instantiates stores with `AsyncStorage` adapter and state persists across app restarts
  4. Auth flow (login, logout, session restore) works correctly on both platforms
  5. No Zustand store file is duplicated between web and RN
**Plans:** 2/2 plans complete

Plans:
- [ ] 04-01-PLAN.md — Create createWorkoutStore + createAuthStore factories in packages/shared, migrate test
- [ ] 04-02-PLAN.md — Replace web + RN store files with factory instantiation, update barrel

### Phase 5: Hooks Migration
**Goal**: Shared TanStack Query hooks live in `packages/shared`, each app wraps them with thin platform-specific hooks, and all hook-dependent UI components work on both platforms
**Depends on**: Phase 4
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04
**Success Criteria** (what must be TRUE):
  1. Shared hooks in `packages/shared/src/hooks/` cover all data-fetching operations used by both apps
  2. Each app has thin wrapper hooks that inject any navigation or notification adapters required
  3. All hook-dependent screens and components on both platforms function correctly end-to-end
  4. `useDrag` (web) and `useStableHandlers` (RN) remain in their respective apps and are not in `packages/shared`
**Plans:** 2/2 plans complete

Plans:
- [ ] 05-01-PLAN.md — Create store injection + notification service, move 8 hooks to shared, update barrel
- [ ] 05-02-PLAN.md — Wire initStores/initNotifications in both apps, replace hook files with thin re-exports

### Phase 6: DX Cleanup
**Goal**: `QUERY_KEYS`, domain constants, and `queryClient` config are shared; a shared ESLint config prevents rule drift; zero duplicated non-platform-specific files remain between web and RN
**Depends on**: Phase 5
**Requirements**: DX-01, DX-02, DX-03, DX-04
**Success Criteria** (what must be TRUE):
  1. `QUERY_KEYS` and domain constants are defined once in `packages/shared` and imported by both apps
  2. `queryClient.js` config is shared in `packages/shared` with no duplicated copy
  3. A shared ESLint config package exists in `packages/eslint-config` and is extended by both apps
  4. A file audit confirms zero duplicated files between web and RN (excluding declared platform-specific files)
**Plans:** 3 plans

Plans:
- [ ] 06-01-PLAN.md — Share queryClient in packages/shared, rename constants.js stubs to muscleGroupStyles.js
- [ ] 06-02-PLAN.md — Create packages/eslint-config shared package, add ESLint to gym-native
- [ ] 06-03-PLAN.md — File audit verifying zero unexpected duplicates, root scripts verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo Scaffold | 3/3 | Complete    | 2026-03-15 |
| 2. Utils Migration | 2/2 | Complete    | 2026-03-15 |
| 3. API Layer Migration | 3/4 | Complete    | 2026-03-15 |
| 4. Store Factories | 1/2 | Complete    | 2026-03-15 |
| 5. Hooks Migration | 2/2 | Complete    | 2026-03-15 |
| 6. DX Cleanup | 0/3 | Not started | - |
