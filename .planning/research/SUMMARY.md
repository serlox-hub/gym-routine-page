# Project Research Summary

**Project:** Gym Tracker — React + Vite / React Native + Expo monorepo with shared code
**Domain:** JavaScript monorepo migration — shared business logic package
**Researched:** 2026-03-15
**Confidence:** HIGH

## Executive Summary

This project is a monorepo migration: extracting shared business logic from two near-identical codebases (a React/Vite web app and a React Native/Expo 55 app) into a `packages/core` shared package, eliminating code duplication without a build step. The two apps already share 16 utility files that are byte-for-byte identical and an API layer that exists only in the web app today. The established pattern for this type of project is npm workspaces (already in use) with a source-direct shared package — no transpilation, no `dist/` directory, Metro and Vite both resolve raw `.js` source via symlinks.

The recommended approach is an incremental, phase-by-phase migration in strict dependency order: monorepo scaffold first, then pure utils (zero-risk, immediate value), then the API layer, then Zustand store factories, then shared hooks. Each phase leaves both apps fully functional and deployable. Platform-specific files (`supabase.js`, `styles.js`, auth config) must never enter the shared package — they diverge fundamentally in env var handling and type system (CSS strings vs RN StyleSheet objects). Three architectural patterns carry the entire migration: store factory functions with injected storage adapters, thin platform wrapper hooks with injected navigation/notification adapters, and a single `packages/core` barrel `index.js` as the stable import surface.

The main risks are concentrated in Phase 0 (monorepo scaffold): Metro's `watchFolders` visibility, duplicate React instances from incorrect `peerDependencies`, the `"type": "module"` incompatibility with Metro's Hermes transform, Vite's dependency cache, and EAS Build's monorepo configuration. Every one of these pitfalls must be proven out with a working "hello world" import from the shared package — on both platforms and in EAS cloud build — before any production code migrates. All six critical pitfalls have clear, documented prevention steps.

## Key Findings

### Recommended Stack

The project already has all the tooling needed. npm workspaces (npm 7+, already in use) manages the workspace; Expo SDK 55 auto-configures Metro for monorepos via `expo/metro-config` (no manual `watchFolders` needed unless auto-config is insufficient); Vite 6.x follows symlinks natively. The shared package should be named `@gym/core`, point `"main"` directly at `src/index.js`, omit `"type": "module"` (Metro/Hermes incompatibility), and declare React/RN/TanStack Query/Zustand as `peerDependencies` to prevent duplicate instances.

**Core technologies:**
- npm workspaces: Workspace management and package linking — already in use, zero new tooling, SDK 55 auto-detects it
- `expo/metro-config` (SDK 55): Metro bundler — auto-configures monorepo support since SDK 52, no manual watchFolders needed
- Vite 6.x (existing): Web bundler — follows symlinks by default, add `resolve.dedupe` for React singletons
- No build step for `packages/core`: Internal-only package, both bundlers resolve raw `.js` source directly

**Do not use:**
- `"type": "module"` in the shared package (breaks Metro/Hermes transform pipeline)
- `exports` field with conditional exports in the shared package (Metro's condition ordering silently breaks platform extensions)
- `resolve.preserveSymlinks: true` in Vite (breaks HMR, confirmed open issue)
- Turborepo/Nx (no build step = no caching benefit; over-engineering for this scope)

### Expected Features

**Must have (table stakes — blocking everything else):**
- Workspace-aware `package.json` in `packages/core` with correct `name` and `main` fields
- Single `index.js` re-export barrel as the stable import surface
- Duplicate-React prevention via `resolve.dedupe` in `vite.config.js`
- Platform-specific files (`supabase.js`, `styles.js`) explicitly excluded from shared package
- Storage adapter injection for Zustand stores (factory function pattern)
- Shared pure utility files: all 16 `lib/*.js` files confirmed identical between platforms today
- Shared API layer: 7 files currently web-only, their migration normalizes the RN app's inline queries

**Should have (high value, not blocking):**
- Shared `queryClient.js` — config is identical today, safe to share immediately
- Shared `constants.js` (partial) — `QUERY_KEYS` and domain constants identical; one minor text diff (`'Controlado'` vs `'Control'`) to reconcile
- Root-level dev scripts (`npm run dev`, `npm run start`) callable from monorepo root
- Root-level `npm test` running vitest for shared package and web together
- Co-located vitest tests in `packages/core` (18 existing test files move with their utils)

**Defer to after migration stabilizes:**
- Shared ESLint config package — valuable for preventing rule drift, not blocking
- Navigation adapter abstraction — not currently needed, hooks don't embed navigation today; document the convention instead
- Notification/toast adapter — same finding, not currently embedded in hooks
- Separate Jest/vitest for `gym-native` — no tests exist there yet

**Anti-features (never build):**
- Build step for the shared package (Rollup/tsup/esbuild) — internal-only package, no benefit
- Shared UI components / design system — Tailwind vs NativeWind divergence is fundamental
- TypeScript migration — constrained out by project requirements (JavaScript only)
- Publishing to npm / semantic versioning — monorepo-internal package only

### Architecture Approach

The target architecture places `packages/core` as a source-direct shared package containing three layers: pure utils (`src/lib/`), the Supabase API layer (`src/api/`), and shared TanStack Query hooks (`src/hooks/`) plus Zustand store factories (`src/stores/`). Each app retains platform-specific files in its own `src/lib/` and `src/stores/`, and wraps shared hooks with thin adapter-injecting wrappers. The Supabase client is never shared — it is instantiated per platform using platform-appropriate env vars and storage adapters.

**Major components:**
1. `packages/core/src/lib/` — 16 pure utility functions, identical across platforms, zero platform imports; safest migration target
2. `packages/core/src/api/` — 7 Supabase API functions; currently web-only, migrating them eliminates inline queries in RN hooks
3. `packages/core/src/hooks/` — shared TanStack Query hooks with `onNavigate`/`onNotify` adapter injection; platform wrapper hooks in each app are thin
4. `packages/core/src/stores/` — Zustand store factories (`createWorkoutStore(storage)`, `createAuthStore(supabase, storage)`); each platform instantiates with its own adapter
5. `apps/web/src/lib/supabase.js` and `apps/gym-native/src/lib/supabase.js` — platform-specific Supabase client initialization; cannot be shared
6. Platform `styles.js` files — stay in each app; only shared hex color tokens (if needed) can move to `packages/core/src/lib/colorTokens.js`

### Critical Pitfalls

1. **Metro `watchFolders` visibility** — Metro silently fails to find files outside its project root, including in CI (EAS Build). Prevention: verify `expo/metro-config` auto-configuration works with a real shared import before migrating any production code; add manual `watchFolders` config as fallback.

2. **Duplicate React instances** — Causes `"Invalid hook call"` and `"No QueryClient set"` errors that are hard to trace. Prevention: declare React, RN, TanStack Query, and Zustand as `peerDependencies` in `packages/core/package.json`; add `overrides` in root `package.json`; verify with `npm why react` (single resolved path required).

3. **`"type": "module"` in shared package breaks Metro** — Metro/Hermes cannot parse native ESM without Babel. Prevention: omit `"type"` field entirely from `packages/core/package.json`; write files with `import`/`export` syntax (Babel handles it even without the field).

4. **Platform-specific files accidentally shared** — `supabase.js` uses different env vars and `AsyncStorage`; `styles.js` uses CSS strings invalid in RN. Prevention: create an explicit "safe to share" checklist before moving any file; these two files are permanently excluded from `packages/core`.

5. **EAS Build fails when local passes** — EAS runs from a different working directory and needs the monorepo root in scope. Prevention: configure `EAS_PROJECT_ROOT` in `eas.json` at Phase 0; verify cloud build with a trivial shared import before migrating production code.

6. **Big-bang migration** — Moving all files at once breaks both apps simultaneously and makes failures untraceable. Prevention: strict phase ordering, each phase leaves both apps functional; each phase is an independent, reviewable commit.

## Implications for Roadmap

The feature dependency graph and pitfall phase mappings from research converge on the same ordering. There is no room to reorder phases: each depends on the previous.

### Phase 0: Monorepo Scaffold and Proof of Concept

**Rationale:** All six critical pitfalls live here. Nothing else is worth migrating until both bundlers and EAS Build can resolve a real import from `packages/core`. This is the highest-risk phase with the lowest lines-of-code change.

**Delivers:** Working monorepo structure with `packages/core` scaffold; both apps import a trivial "hello" export from `@gym/core`; EAS cloud build passes; `npm why react` shows single instance; all 18 vitest tests still pass.

**Addresses:** Metro watchFolders, duplicate React prevention, `"type": "module"` incompatibility, Vite cache resolution, EAS Build monorepo config.

**Avoids:** Pitfalls 1, 2, 3, 4 (partial), 5 from PITFALLS.md.

**Research flag:** Standard patterns — Expo official docs cover this well. No additional research-phase needed; use the pitfall checklist as acceptance criteria.

### Phase 1: Pure Utils Migration

**Rationale:** 16 utility files are byte-for-byte identical between web and RN today. Zero logic change, zero platform risk, immediate elimination of 16 duplicated files. Tests travel with the code — confirms vitest setup works for shared package.

**Delivers:** All 16 `lib/*.js` files and 18 test files in `packages/core/src/lib/`; both apps import from `@gym/core`; `npm run test` passes from monorepo root. Includes the platform-split audit checklist that prevents `supabase.js`/`styles.js` from entering the shared package.

**Addresses:** Shared pure utils, co-located tests, root-level test command (differentiator feature).

**Avoids:** Pitfall 5 (platform-specific file accidentally shared) — audit checklist applied here.

**Research flag:** No additional research needed — all 16 files confirmed identical by diff, pure functions with no platform APIs.

### Phase 2: API Layer Migration

**Rationale:** The 7 API files currently exist only in the web app; RN hooks inline the same Supabase queries. Migrating the API layer to `packages/core` normalizes both apps and is the prerequisite for hook sharing. Supabase client is never shared — API functions receive it as a parameter or via app-level import.

**Delivers:** `packages/core/src/api/` with 7 API files; web hooks updated to import from `@gym/core`; RN hooks refactored from inline queries to shared API functions; both apps produce identical data.

**Addresses:** Shared API layer (table stakes feature); eliminates web/RN query drift.

**Avoids:** Anti-Pattern 1 (importing `supabase` directly in core) — API functions use parameter injection.

**Research flag:** Medium complexity — RN hooks need one-time refactor per hook file. Standard patterns apply. No research-phase needed.

### Phase 3: Store Factories

**Rationale:** Zustand stores differ only in the `storage` argument to `persist`. Factory function pattern is well-documented. This is the penultimate step before hook sharing because shared hooks will reference the shared store.

**Delivers:** `packages/core/src/stores/createWorkoutStore.js` and `createAuthStore.js`; each platform instantiates with its own adapter; auth and workout state persist correctly on both platforms.

**Addresses:** Storage adapter injection (table stakes feature); Zustand store deduplication.

**Avoids:** Pitfall 2 (duplicate React/Zustand instances) — peerDependencies already set in Phase 0.

**Research flag:** Medium risk — store shape must stay identical across platforms. No new research needed; factory pattern is fully documented in ARCHITECTURE.md with code examples.

### Phase 4: Shared Hooks Migration

**Rationale:** Most hooks currently differ only because RN inlines queries (resolved by Phase 2). After the API layer is shared, hooks converge. Navigation and notification adapters are injected via the thin wrapper hook pattern — research confirmed hooks do NOT currently embed navigation, so no infrastructure build is needed.

**Delivers:** `packages/core/src/hooks/` with shared TanStack Query hooks; thin platform wrapper hooks in each app inject navigation/notification adapters; all hook-dependent components work on both platforms.

**Addresses:** Shared hooks (table stakes feature); eliminates final layer of code duplication.

**Avoids:** Anti-Pattern 2 (sharing styles in core), Anti-Pattern 3 (`.native.js` in shared package).

**Research flag:** Medium complexity for adapter injection pattern. The pattern is fully documented in ARCHITECTURE.md with complete code examples. No additional research needed.

### Phase 5: DX Cleanup and Deferred Differentiators

**Rationale:** After all layers are migrated, address quality-of-life improvements: root-level scripts, shared constants reconciliation, shared `queryClient.js`, ESLint config package, and JSDoc on adapter interfaces.

**Delivers:** Root `npm run dev` / `npm run start` / `npm test` from monorepo root; `QUERY_KEYS` and domain constants shared; zero diverged copies remain; optional shared ESLint config.

**Addresses:** Root-level dev scripts, shared constants, shared queryClient (differentiator features from FEATURES.md).

**Research flag:** All standard patterns, no research needed.

### Phase Ordering Rationale

- Phase 0 before everything: Metro + Vite + EAS proof-of-concept is the riskiest change with the lowest code volume. Fail fast here rather than during Phase 3.
- Phase 1 before Phase 2: Pure utils have zero dependencies; API layer imports from utils. Dependency order is strict.
- Phase 2 before Phase 3/4: Hooks import from the API layer; stores reference hooks. API layer must be stable before either migrates.
- Phase 3 before Phase 4: Shared hooks reference shared stores. Store factories must be instantiated and tested before hooks that call them move to core.
- Phase 5 last: Cleanup and differentiators have no blockers but depend on everything else being stable.

### Research Flags

Phases needing deeper research during planning:
- **Phase 0 only if EAS Build config is ambiguous**: The Expo official docs for EAS Build with monorepos are clear, but EAS cloud environment specifics may require validation against the actual project's `eas.json`. Low probability of needing this.

Phases with standard patterns (no research-phase needed):
- **Phase 1:** Pure utils, zero platform APIs, confirmed identical by diff — fully mechanical.
- **Phase 2:** API parameter injection is well-documented in ARCHITECTURE.md with code examples.
- **Phase 3:** Store factory pattern is fully specified with code examples in ARCHITECTURE.md.
- **Phase 4:** Adapter injection for hooks is fully specified with before/after examples in ARCHITECTURE.md.
- **Phase 5:** Standard npm workspace scripts and config — no unknowns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core tooling (npm workspaces, Expo SDK 55 Metro auto-config, Vite) is HIGH confidence from official docs. The Vite + Metro cross-platform monorepo combination has LOW official guidance — one community discussion thread, no canonical reference. The specific interaction between Vite 6.x and Metro 0.82 via symlinks needs validation in Phase 0. |
| Features | HIGH | Corroborated by official Expo/Metro docs + direct codebase inspection confirming which files are identical and which diverge. Feature dependency graph is derived from first-principles analysis of the actual code. |
| Architecture | HIGH | Based on Expo official docs + direct `diff` of all lib, hook, and store files between web and gym-native. Component boundaries and data flow are verified against real code, not theoretical. |
| Pitfalls | HIGH | Every critical pitfall is documented in official sources (Expo monorepo guide, EAS Build with monorepos, Metro config docs, Vite dep pre-bundling). Community issues provide corroborating evidence for the non-obvious ones (duplicate React, Vite cache). |

**Overall confidence:** HIGH

### Gaps to Address

- **Vite + Metro symlink interaction at scale**: No authoritative source exists for the exact interaction between Vite 6.x symlink resolution and Metro 0.82 in a dual-bundler monorepo. Phase 0 must include explicit smoke tests for both bundlers importing the same shared module. If issues arise, `optimizeDeps.include: ['@gym/core']` in Vite is the first-line fix.

- **Expo SDK 55 auto-configuration scope**: The docs confirm auto-config for `watchFolders` since SDK 52, but the exact conditions under which it falls back to requiring manual config are not fully documented. Plan B (manual `watchFolders` in `metro.config.js`) is documented and ready in ARCHITECTURE.md.

- **EAS Build `EAS_PROJECT_ROOT` behavior**: The Expo EAS docs describe the pattern, but the exact `eas.json` config for this project's directory structure (`apps/gym-native/`) needs to be verified against an actual EAS cloud build before any production code migrates. Must be part of Phase 0 acceptance criteria.

## Sources

### Primary (HIGH confidence)
- [Expo Docs — Work with Monorepos](https://docs.expo.dev/guides/monorepos/) — npm workspaces setup, SDK 55 auto-config, watchFolders behavior
- [EAS Build with Monorepos](https://docs.expo.dev/build-reference/build-with-monorepos/) — EAS_PROJECT_ROOT, lock file detection, monorepo CI
- [Metro Docs — Package Exports](https://metrobundler.dev/docs/package-exports/) — ESM support in Metro 0.82+
- [Metro Docs — Configuration](https://metrobundler.dev/docs/configuration/) — watchFolders, nodeModulesPaths
- [Vite Docs — Shared Options](https://vite.dev/config/shared-options) — resolve.dedupe, symlink behavior
- [Vite Docs — Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling) — optimizeDeps.include, cache behavior
- [Vitest — Projects config](https://vitest.dev/guide/projects) — root-level multi-package test setup
- Direct codebase inspection (`diff` of all lib, hook, and store files between web and gym-native) — HIGH confidence

### Secondary (MEDIUM confidence)
- [byCedric/expo-monorepo-example](https://github.com/byCedric/expo-monorepo-example) — Canonical Expo maintainer monorepo example (pnpm, but patterns apply)
- [Zustand monorepo React duplication issue #2870](https://github.com/pmndrs/zustand/discussions/2870) — duplicate React instance symptoms and fix
- [TanStack Query no QueryClient in monorepo #6044](https://github.com/TanStack/query/issues/6044) — QueryClient singleton anti-pattern
- [expo/expo GitHub Issue #30143](https://github.com/expo/expo/issues/30143) — npm workspaces edge cases in Expo
- [Vite mixing CJS and ESM in monorepo #8726](https://github.com/vitejs/vite/discussions/8726) — Vite symlink and cache behavior in workspaces
- [Metro Haste map symlink issue #286](https://github.com/facebook/metro/issues/286) — Metro visibility boundary behavior

### Tertiary (LOW confidence)
- [react-native-community discussions #941](https://github.com/react-native-community/discussions-and-proposals/discussions/941) — Vite + Metro cross-platform monorepo; no authoritative answer exists, ongoing evolution

---
*Research completed: 2026-03-15*
*Ready for roadmap: yes*
