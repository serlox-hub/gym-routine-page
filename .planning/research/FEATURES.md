# Feature Landscape

**Domain:** Monorepo shared package for React web + React Native Expo apps
**Researched:** 2026-03-15
**Overall confidence:** HIGH (corroborated by Expo official docs, Metro docs, real codebase inspection)

---

## Table Stakes

Features without which the shared package either fails to build, fails at runtime, or produces different bugs on one platform.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Workspace-aware `package.json` | npm workspaces requires `name` field and correct entry points; Metro and Vite resolve by package name | Low | `"name": "@gym/shared"`, `"main": "./src/index.js"` pointing directly at source — no build step needed for an internal package |
| Single `index.js` re-export barrel | Both bundlers need one stable import surface; prevents deep imports that break when files move | Low | `export * from './lib/dateUtils.js'` etc.; platform-specific files are excluded here |
| Duplicate-React prevention (Vite) | Zustand hooks and React hooks crash with `TypeError: Cannot read properties of null (reading 'useRef')` when a second React instance is bundled | Medium | `resolve.dedupe: ['react', 'react-dom']` in web's `vite.config.js`; confirmed by Zustand monorepo issue #2870 |
| Metro watch-folder config | Metro only watches files under the app's own directory by default; symlinked workspace packages are invisible without explicit config | Low | Since Expo SDK 52, `expo/metro-config` handles this automatically — confirmed in Expo monorepo docs. No manual `watchFolders` needed if on SDK 52+ (project uses SDK 55) |
| Platform-specific file pairs (`.native.js` / `.js`) | `styles.js`, `supabase.js`, `constants.js`, and auth differ between platforms — they cannot live in the shared package as-is; each platform must supply its own copy | Medium | Two strategies: (a) exclude from shared package entirely, each app keeps its own copy; (b) conditional exports `"react-native"` condition in `package.json` exports field. Strategy (a) is simpler given JavaScript codebase and known divergences |
| Storage adapter injection (Zustand stores) | `workoutStore` and `authStore` use `AsyncStorage` on RN and `localStorage` (default) on web — the store creation code itself is platform-agnostic if the storage implementation is passed in | Medium | Factory function pattern: `createWorkoutStore(storage)` where each app calls `createWorkoutStore(AsyncStorage)` or leaves default; avoids forking the entire store file |
| Shared `queryClient.js` | TanStack Query's `QueryClient` config is identical in both apps today; sharing it eliminates one divergence point | Low | No platform differences; safe to share immediately |
| Shared pure utility files | The ~16 lib files (`dateUtils`, `arrayUtils`, `workoutCalculations`, etc.) are already pure functions with no platform imports — they are the safest thing to share | Low | No adapters needed; these are the migration starting point |
| Shared API layer (7 files) | `src/lib/api/` exists in web but not in RN (queries are inline in hooks); extracting to shared package normalises both apps simultaneously | Medium | Requires RN hooks to be refactored to call shared API functions — one-time effort per hook file |
| Tests co-located with shared utils | Existing ~18 vitest test files test the same pure utils being moved; moving them with the code ensures they still run | Low | Vitest projects config in root `vitest.config.js` with `projects: ['packages/shared']` pattern |

---

## Differentiators

Features that meaningfully improve developer experience once the basics work but are not required for correctness.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Navigation adapter abstraction | Hooks that currently call `useNavigate` (web) vs `navigation.navigate` (RN) can share business logic if navigation is injected or handled at the component layer | Medium | Inspection of the actual hook files shows navigation is NOT currently embedded in any hooks — it's called from component screens. Low urgency; document the convention instead of building infrastructure |
| Notification adapter abstraction | Toast/haptics in RN vs no-op in web; same pattern as navigation | Medium | Same finding — not currently in shared hooks. Low urgency today, worth a thin `useNotify` hook when needed |
| Shared ESLint config package | A `packages/eslint-config` package with flat config (ESLint v9) shared by web and gym-native | Low-Medium | ESLint v9 flat config supports this cleanly; reduces drift in linting rules. Not blocking but prevents divergence over time |
| Root-level dev scripts | `npm run dev` and `expo start` callable from monorepo root via workspace scripts | Low | `"dev": "npm -w apps/web run dev"`, `"native": "npm -w apps/gym-native run start"` in root `package.json` |
| Root-level test command | `npm test` runs vitest for shared package and web from a single command | Low | Vitest `projects` config in root covers this with one config file |
| Shared `constants.js` (partial) | `QUERY_KEYS` and domain constants like `RIR_OPTIONS` are identical in both apps today (minor text diff confirmed: `'Controlado'` vs `'Control'` — easy to reconcile); sharing avoids divergence | Low | Reconcile the text diff, then share; `styles.js` stays platform-specific |
| JSDoc on adapter interfaces | Document the expected shape of injected adapters (storage, navigation) so future contributors know what to implement per platform | Low | Pure documentation, zero runtime cost |

---

## Anti-Features

Features to deliberately NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Build step for the shared package (Rollup/tsup/esbuild) | The package is internal-only and never published to npm; a build step adds CI complexity, a `dist/` to gitignore, and a "rebuild before test" workflow requirement | Point `"main"` directly at source files: `"./src/index.js"`. Both Vite (ESM) and Metro (with `expo/metro-config`) resolve source directly without a build step |
| Conditional exports (`package.json` `exports` field) for platform splits | Metro's package exports support (enabled by default in 0.82 / RN 0.79) does NOT expand platform extensions (`.native.js`) against matched export entries — this removes Metro's most convenient platform-split mechanism, making conditional exports harder to use than the `.native.js` file extension approach | Keep `styles.js`, `supabase.js`, and auth out of the shared package; use platform file extension resolution only inside the individual apps |
| Design system / shared UI components | Web uses Tailwind CSS class strings, RN uses NativeWind with StyleSheet-like objects; the divergence is fundamental and cross-platform component libraries (react-native-web) require the web app to adopt RN primitives entirely | Each app keeps its own `components/ui/`; this is explicitly out of scope per PROJECT.md |
| TypeScript migration | Project is JavaScript by constraint (PROJECT.md, CLAUDE.md); adding TS to the shared package would force a build step and break the no-build approach | Use JSDoc `@param` / `@returns` comments for documentation of complex utilities |
| Publishing to npm / semantic versioning | The package is consumed only within the monorepo; npm versioning adds mandatory `npm publish` steps before changes are visible to the apps | Use `"workspace:*"` (or `"*"`) as the version in app `package.json` dependencies to always resolve the local package |
| Turborepo or Nx | For a two-app monorepo sharing one JavaScript package with no build steps, a task orchestrator is over-engineering; npm workspaces scripts are sufficient | npm workspace scripts from root; add Turborepo only if build caching becomes a real pain point (it won't be without a build step) |
| Separate test runner for gym-native | gym-native has no tests today; standing up a separate Jest/vitest config for it before there are tests to run is waste | The RN app inherits tests indirectly — when hooks are migrated to use shared utils that are tested, coverage is captured in the shared package's vitest run |

---

## Feature Dependencies

```
npm workspaces root config
  └── workspace-aware package.json (shared package)
        ├── Barrel index.js
        │     └── Shared pure utils (dateUtils, arrayUtils, etc.)
        │           └── Tests co-located (run via root vitest projects config)
        ├── Shared API layer (7 files)
        │     └── Shared hooks (refactored, storage-adapter-injected)
        │           └── Storage adapter injection (Zustand stores)
        └── Platform-specific files EXCLUDED
              └── Each app keeps own: styles.js, supabase.js, constants divergences, auth

Duplicate-React prevention (Vite config)  ← required before any hook sharing works
Metro watch config (auto, SDK 55)         ← already satisfied by expo/metro-config
```

Key ordering constraint: pure utils must migrate before API layer; API layer must migrate before hooks; hooks must migrate before stores (hooks import from API layer, stores import constants).

---

## MVP Recommendation

Prioritize:
1. Root `package.json` workspaces config + shared package scaffold (blocking everything else)
2. Pure utils migration (16 files + 18 test files) — zero platform risk, immediate deduplication value
3. Shared API layer (7 files) — enables hook migration, normalises RN which currently has inline queries
4. Duplicate-React fix in `vite.config.js` — required before hook/store sharing, easy to add early

Defer:
- **Hooks migration**: Depends on API layer being stable; do after step 3
- **Zustand store factory pattern**: Highest-risk change, last step once hooks are validated
- **Shared ESLint config**: Nice-to-have; schedule for after stores are migrated
- **Navigation/notification adapters**: Not needed — current hooks don't embed navigation; document the convention instead

---

## Sources

- [Expo — Work with monorepos (official)](https://docs.expo.dev/guides/monorepos/) — HIGH confidence
- [Metro — Package Exports Support](https://metrobundler.dev/docs/package-exports/) — HIGH confidence
- [React Native — Package Exports Support blog post](https://reactnative.dev/blog/2023/06/21/package-exports-support) — HIGH confidence
- [Vitest — Projects config (official)](https://vitest.dev/guide/projects) — HIGH confidence
- [Zustand monorepo React duplication issue #2870](https://github.com/pmndrs/zustand/discussions/2870) — MEDIUM confidence (community, corroborates known React singleton requirement)
- [react-native-community — Monorepo + Vite + New Architecture discussion #941](https://github.com/react-native-community/discussions-and-proposals/discussions/941) — MEDIUM confidence (community discussion, highlights ongoing evolution)
- Codebase inspection (`src/lib/`, `gym-native/src/lib/`, `src/hooks/`, `gym-native/src/hooks/`, store files) — HIGH confidence (direct evidence)
