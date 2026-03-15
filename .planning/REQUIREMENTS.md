# Requirements: Gym Tracker Monorepo

**Defined:** 2026-03-15
**Core Value:** Un solo lugar para cada pieza de lógica de negocio — un cambio se refleja en ambas plataformas sin intervención manual.

## v1 Requirements

### Monorepo Setup

- [x] **SETUP-01**: Root `package.json` configures npm workspaces with `apps/web`, `apps/gym-native`, and `packages/shared`
- [x] **SETUP-02**: `packages/shared/package.json` has `"main": "./src/index.js"` pointing at source, no build step
- [x] **SETUP-03**: `packages/shared` declares React, TanStack Query, and Zustand as `peerDependencies`
- [x] **SETUP-04**: Vite config includes `resolve.dedupe` for `react`, `react-dom`
- [x] **SETUP-05**: Metro auto-config (Expo SDK 55) resolves imports from `@gym/shared` without manual `watchFolders`
- [x] **SETUP-06**: EAS cloud build passes with a trivial import from `@gym/shared`
- [x] **SETUP-07**: Root-level scripts: `npm run dev`, `npm run native`, `npm test`
- [x] **SETUP-08**: Both apps start and run correctly after directory restructure

### Shared Utils

- [x] **UTIL-01**: 16 pure utility files live in `packages/shared/src/lib/`
- [x] **UTIL-02**: 18 test files co-located with utils, vitest passes from root
- [x] **UTIL-03**: Barrel `index.js` re-exports all shared modules
- [x] **UTIL-04**: `supabase.js`, `styles.js`, `videoStorage.js` excluded from core (platform-specific)

### API Layer

- [x] **API-01**: 7 API files live in `packages/shared/src/api/`
- [x] **API-02**: API functions receive Supabase client as parameter (no direct import of supabase.js)
- [x] **API-03**: Web hooks updated to import API from `@gym/shared`
- [x] **API-04**: RN hooks refactored from inline Supabase queries to shared API functions

### Stores

- [x] **STOR-01**: `createWorkoutStore(storage)` factory in `packages/shared/src/stores/`
- [x] **STOR-02**: `createAuthStore(supabase, storage)` factory in `packages/shared/src/stores/`
- [ ] **STOR-03**: Web instantiates stores with default localStorage
- [ ] **STOR-04**: RN instantiates stores with AsyncStorage adapter
- [ ] **STOR-05**: Workout and auth state persists correctly on both platforms

### Hooks

- [ ] **HOOK-01**: Shared TanStack Query hooks in `packages/shared/src/hooks/`
- [ ] **HOOK-02**: Platform wrapper hooks in each app inject navigation/notification adapters
- [ ] **HOOK-03**: All hook-dependent components work on both platforms
- [ ] **HOOK-04**: Platform-exclusive hooks (`useDrag`, `useStableHandlers`) stay in their respective apps

### DX / Cleanup

- [ ] **DX-01**: `QUERY_KEYS` and domain constants shared in `packages/shared` (text diff reconciled)
- [ ] **DX-02**: `queryClient.js` config shared in `packages/shared`
- [ ] **DX-03**: Shared ESLint config package in `packages/eslint-config`
- [ ] **DX-04**: Zero duplicated files remain between web and RN (except platform-specific exclusions)

## v2 Requirements

### Advanced Sharing

- **ADV-01**: Shared `supabase.js` via `createSupabaseClient(config)` factory
- **ADV-02**: Shared color tokens extracted from `styles.js` to `colorTokens.js`
- **ADV-03**: Navigation adapter infrastructure (if hooks evolve to embed navigation)
- **ADV-04**: Notification/toast adapter infrastructure

## Out of Scope

| Feature | Reason |
|---------|--------|
| TypeScript migration | Project constraint: JavaScript only |
| Shared UI components / design system | Tailwind (web) vs NativeWind (RN) diverge fundamentally |
| Build step for packages/shared | Internal-only package, both bundlers resolve source directly |
| Publishing to npm / semantic versioning | Monorepo-internal, no external consumers |
| Turborepo / Nx | No build step = no caching benefit; over-engineering for 2-app monorepo |
| Conditional exports in package.json | Metro breaks `.native.js` platform extensions with exports field |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Complete |
| SETUP-02 | Phase 1 | Complete |
| SETUP-03 | Phase 1 | Complete |
| SETUP-04 | Phase 1 | Complete |
| SETUP-05 | Phase 1 | Complete |
| SETUP-06 | Phase 1 | Complete |
| SETUP-07 | Phase 1 | Complete |
| SETUP-08 | Phase 1 | Complete |
| UTIL-01 | Phase 2 | Complete |
| UTIL-02 | Phase 2 | Complete |
| UTIL-03 | Phase 2 | Complete |
| UTIL-04 | Phase 2 | Complete |
| API-01 | Phase 3 | Complete |
| API-02 | Phase 3 | Complete |
| API-03 | Phase 3 | Complete |
| API-04 | Phase 3 | Complete |
| STOR-01 | Phase 4 | Complete |
| STOR-02 | Phase 4 | Complete |
| STOR-03 | Phase 4 | Pending |
| STOR-04 | Phase 4 | Pending |
| STOR-05 | Phase 4 | Pending |
| HOOK-01 | Phase 5 | Pending |
| HOOK-02 | Phase 5 | Pending |
| HOOK-03 | Phase 5 | Pending |
| HOOK-04 | Phase 5 | Pending |
| DX-01 | Phase 6 | Pending |
| DX-02 | Phase 6 | Pending |
| DX-03 | Phase 6 | Pending |
| DX-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after initial definition*
