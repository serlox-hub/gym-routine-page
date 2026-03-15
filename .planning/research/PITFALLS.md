# Pitfalls Research

**Domain:** React + Vite + React Native/Expo monorepo with npm workspaces — shared code migration
**Researched:** 2026-03-15
**Confidence:** HIGH (Metro/Expo docs verified, Vite docs verified, community issues cross-referenced)

---

## Critical Pitfalls

### Pitfall 1: Metro Can't See Files Outside Its `watchFolders`

**What goes wrong:**
Metro fails silently or throws `"Cannot find module '@gym/shared/...' from '...'"` at runtime. The shared package exists on disk but Metro's file watcher never indexed it because it sits outside the RN app's project root. This also breaks EAS Build (CI), not just local dev — the error appears in production builds even when local worked fine.

**Why it happens:**
Metro's `watchFolders` is misunderstood as a file-watching-only concern. It is actually Metro's complete visibility boundary: if a file is not within `watchFolders` or `projectRoot`, it simply does not exist to Metro. With `gym-native/` moved to `apps/gym-native/` and the shared package at `packages/shared/`, Metro's default config (projectRoot = `apps/gym-native/`) sees nothing outside that folder.

**How to avoid:**
In `apps/gym-native/metro.config.js`, explicitly add the monorepo root and the shared package to `watchFolders`, and set `resolver.nodeModulesPaths` to include both the app's own `node_modules` and the root `node_modules`:

```js
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [monorepoRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

module.exports = withNativeWind(config, { input: './global.css' })
```

Note: Expo SDK 55 (used in this project) auto-configures monorepo support when using `expo/metro-config`. Verify this works before adding manual config — manual config can conflict with automatic detection.

**Warning signs:**
- `expo start` succeeds but app crashes on first import from the shared package
- Error contains "Haste module map" or "does not exist in the Haste module map"
- Works locally but fails on EAS Build

**Phase to address:** Phase 0 (Monorepo scaffold) — must be verified as part of the "hello world import" acceptance test before moving any real code.

---

### Pitfall 2: Duplicate React / React Native Instances ("Invalid Hook Call")

**What goes wrong:**
React throws `"Invalid hook call"` or `"You might have mismatching versions of React and the renderer"`. TanStack Query throws `"No QueryClient set, use QueryClientProvider to set one"` — even though a provider exists. Zustand stores appear to reset unexpectedly. All of these are symptoms of the same root cause: two copies of React loaded at runtime.

**Why it happens:**
npm workspaces hoisting is not deterministic when multiple packages in the monorepo declare `react` as a direct dependency. If `packages/shared/package.json` lists `react` as a `dependency` (not `peerDependency`), npm may install a second copy in `packages/shared/node_modules/`. The shared hooks then import from that copy, while the app imports from the root copy. React requires exactly one instance.

**How to avoid:**
1. In `packages/shared/package.json`, declare React, React Native, and all peer libs (`@tanstack/react-query`, `zustand`) as `peerDependencies`, not `dependencies`.
2. Add `overrides` in the root `package.json` to pin a single version:
```json
"overrides": {
  "react": "18.3.1",
  "@tanstack/react-query": "^5.62.0"
}
```
3. After installing, run `npm why react` to confirm only one copy is resolved.

**Warning signs:**
- `npm why react` shows multiple entries with different paths
- `node_modules` inside `packages/shared/` contains a `react/` folder
- Hook errors appear only after moving code to the shared package
- Works in isolation, breaks when imported by the app

**Phase to address:** Phase 0 (Monorepo scaffold) — the shared package's `package.json` structure must be validated before any code moves there.

---

### Pitfall 3: The Shared Package Has `"type": "module"` — Metro Breaks

**What goes wrong:**
Metro cannot parse ESM syntax (`import`/`export`) without Babel transformation. If `packages/shared/package.json` sets `"type": "module"`, Metro tries to load files as native ESM modules and fails with transform errors or syntax errors in the Metro bundle.

**Why it happens:**
The web project uses `"type": "module"` in its `package.json` (confirmed in this codebase). It's tempting to mirror this in the shared package. However, Metro requires files to be CommonJS-compatible or to go through Babel. Metro uses Hermes, which has its own transform pipeline separate from Node's native ESM loader.

**How to avoid:**
Do NOT set `"type": "module"` in `packages/shared/package.json`. Omit it entirely (defaults to CommonJS). Write shared files using `module.exports` / `require`, OR rely on Babel (via `babel-preset-expo`) to transpile ES module syntax (`import`/`export`) — Babel handles this fine even without `"type": "module"`. Vite also handles files without `"type": "module"` correctly since it transpiles everything anyway.

**Warning signs:**
- Metro error: `"SyntaxError: Cannot use import statement in a module"`
- Metro error referencing a file inside `packages/shared/`
- Vite works fine but `expo start` fails immediately on startup

**Phase to address:** Phase 0 (Monorepo scaffold) — the shared package's `package.json` must be reviewed before adding any code.

---

### Pitfall 4: Vite Doesn't Pre-Bundle the Shared Package — Stale Cache Errors

**What goes wrong:**
Vite works on first run but after editing a file in `packages/shared/`, the web app continues showing the old version. Or Vite throws `"The file does not exist at node_modules/.vite/deps/..."` and the dev server needs manual restart with `--force`. In production builds, Vite may fail to find the shared package if it's not properly linked.

**Why it happens:**
Vite treats workspace packages (symlinked via npm workspaces into root `node_modules`) as "source code" (not pre-bundled) because they're not inside `node_modules` of the app. This is usually correct behavior but requires Vite's resolver to be aware of the package. Vite caches aggressively; changes to linked deps don't always invalidate the cache.

**How to avoid:**
1. Ensure the shared package is referenced via the npm workspace protocol in `apps/web/package.json`: `"@gym/shared": "*"` (or `"workspace:*"` — npm workspaces supports both).
2. Add the shared package to `vite.config.js` if cache issues persist:
```js
optimizeDeps: {
  include: ['@gym/shared']
}
```
3. For development, document that `vite --force` clears the cache when shared code changes don't reflect.

**Warning signs:**
- Web app shows stale behavior after editing `packages/shared/`
- Vite dev server logs show warnings about the linked dependency
- `vite build` fails with "cannot find module '@gym/shared'"

**Phase to address:** Phase 0 (Monorepo scaffold) — verify the vite resolution works as part of the setup smoke test.

---

### Pitfall 5: `supabase.js` and `styles.js` Accidentally Shared When They Cannot Be

**What goes wrong:**
The app crashes at import time on one platform. For `supabase.js`: web uses `import.meta.env.VITE_*`, React Native uses `process.env.EXPO_PUBLIC_*` and requires an `AsyncStorage` adapter. For `styles.js`: web uses CSS string values like `border: '1px solid #ccc'` which are invalid in React Native's StyleSheet. Sharing these files directly causes silent wrong behavior or runtime crashes.

**Why it happens:**
Both files exist in both `src/lib/` (web) and `gym-native/src/lib/` (RN) and have the same name, creating the illusion they're the same file. In reality they diverge significantly (confirmed by diff: `supabase.js` uses different env vars and adds AsyncStorage; `styles.js` has entirely different CSS vs RN property syntax). The temptation is to move one of them to `packages/shared/` without realizing it contains platform-specific code.

**How to avoid:**
These three files must NOT be placed in the shared package:
- `supabase.js` — platform-specific env vars + AsyncStorage adapter
- `styles.js` — CSS vs React Native StyleSheet syntax
- Any part of `authStore.js` involving Google OAuth (RN-only)

Instead, use one of two approaches per file:
- **Platform entry points**: `supabase.web.js` and `supabase.native.js` in shared, with Metro/Vite resolving the correct one.
- **Factory function with injected config**: shared creates the Supabase client from injected `url`, `key`, and optional `storageAdapter`, called by each platform's bootstrap code.

**Warning signs:**
- Importing `@gym/shared/supabase` works on web but crashes on RN with `import.meta is not defined`
- `styles.cardStyle` renders correctly on web but causes `StyleSheet.create` errors on RN

**Phase to address:** Phase 1 (Migrate utils) — before moving any file, audit whether it contains platform-specific APIs. Create a checklist of safe-to-share vs. must-be-platform-split files.

---

### Pitfall 6: EAS Build Fails Even When Local Build Passes

**What goes wrong:**
`expo start` and local `eas build --local` work, but cloud EAS builds fail with errors like "Cannot find module" or "lock file not found." The build succeeds in development but fails in CI because EAS runs from a different working directory and doesn't have the monorepo root in scope.

**Why it happens:**
EAS Build requires explicit configuration to understand the monorepo layout. By default EAS assumes it is running from the app's root, and the `package-lock.json` at the monorepo root is not visible. Additionally, EAS needs to know to install dependencies from the monorepo root, not just the app subfolder.

**How to avoid:**
In `apps/gym-native/eas.json`, configure the build to reference the monorepo root:
```json
{
  "build": {
    "development": {
      "env": {
        "EAS_PROJECT_ROOT": "../.."
      }
    }
  }
}
```
Also ensure the root `package.json` has a `workspaces` field and that the lock file is at the monorepo root. Per Expo docs: all EAS config files (`eas.json`, `credentials.json`) must live in the app directory, not the monorepo root.

**Warning signs:**
- EAS build logs show "Could not find package.json" or "lock file not found"
- Local builds pass, CI builds fail for the same commit
- Error references a path that is correct locally but wrong in the CI container

**Phase to address:** Phase 0 (Monorepo scaffold) — verify EAS Build works with a trivial change before migrating production code. Do not discover this in Phase 3.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy-paste utils into shared instead of writing platform-split versions | Fast, zero risk of breaking current apps | Silent drift resumes; diverged files pile up again | Never — defeats the purpose of the migration |
| Skip `peerDependencies` in shared package, use `dependencies` instead | Simpler `package.json`, works most of the time | Duplicate React instances, "invalid hook call" errors that are hard to debug | Never for React and hooks-dependent libs |
| Keep `gym-native/` in place and add workspace config around it | Zero directory restructuring risk | `watchFolders` config becomes complex; relative paths in RN config need `../../packages/shared` | Acceptable as Phase 0 intermediate if done with explicit cleanup plan |
| Inline platform-specific logic in shared files with `Platform.OS` checks | One file, less indirection | Metro and Vite both need to import RN's `Platform` module — breaks Vite | Only for truly trivial cases; never for env vars or storage |
| Skip verifying `npm why react` after setup | Saves 2 minutes | Hours debugging "invalid hook call" later | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase | Share the same `createClient` call in shared package | Expose a factory: `createSupabaseClient(url, key, options?)` — each platform calls it with its own env vars and storage adapter |
| TanStack Query | Put `QueryClient` singleton in shared package | Keep `QueryClient` creation in each app's bootstrap; shared package only exports hooks that use `useQueryClient()` |
| Zustand | Share stores with hardcoded `createJSONStorage(() => AsyncStorage)` | Share the store factory; each platform passes its storage adapter at initialization |
| NativeWind | Assume shared CSS classes work on native | NativeWind processes Tailwind for RN — shared package should have zero styling; styling stays in each platform's component layer |
| Vitest | Run tests from the web app root after restructuring | Update `vite.config.js` `test.exclude` and confirm `src/lib/` paths still resolve; shared package tests need their own vitest config |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Metro watches entire monorepo root recursively | `expo start` takes 30-60s; file change detection is slow; HMR lags | Configure `watchFolders` to include only `packages/shared/` and `apps/gym-native/`, not the entire monorepo root including `node_modules` | With any monorepo larger than ~500 files |
| Vite re-processes entire shared package on every change | Dev server slow; hot reload takes seconds not milliseconds | Ensure shared package does not include test files or large fixtures in its source; use `server.watch.ignored` if needed | When shared package grows beyond ~50 files |
| Two separate `node_modules` trees (app + root) | Install times double; disk usage increases significantly | Use `npm workspaces` hoisting correctly so most deps land at root; use `npm dedupe` after install | At any scale — it's a disk and install time issue from day 1 |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Committing `.env` files to shared package | Supabase URL/anon key leak into git | Shared package must have zero `.env` files; env vars are injected by each platform at build time |
| Sharing `supabase.js` with hardcoded fallback values | Fallback values may contain staging credentials that get bundled into production RN app | Never use fallback values for Supabase credentials; throw an explicit error if env vars are missing (already done in this codebase) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Metro config**: `watchFolders` configured AND verified with `expo start` + a real import from `packages/shared/`
- [ ] **Vite resolution**: `@gym/shared` importable AND verified with `npm run dev` + a real import
- [ ] **No duplicate React**: `npm why react` returns a single resolved path
- [ ] **EAS Build**: CI build passes for a trivial change before any production code migrates
- [ ] **Shared package `peerDependencies`**: React, react-native, and all hook libraries listed as `peerDeps`, not `dependencies`
- [ ] **Platform-split files**: `supabase.js`, `styles.js`, auth-related stores NOT in shared package (or correctly platform-split)
- [ ] **Vitest still passes**: All 18 existing test files pass after restructuring paths
- [ ] **`npm run dev` from monorepo root**: Web dev server starts without `vite --force`
- [ ] **`expo start` from monorepo root**: RN bundler starts and reaches a real device/simulator

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Metro can't find shared package | LOW | Add correct `watchFolders` + `nodeModulesPaths` to `metro.config.js`, clear Metro cache with `expo start --clear` |
| Duplicate React instances | MEDIUM | Remove `react` from shared `dependencies`, add to `peerDependencies`, add `overrides` in root, run `npm install` + `npm dedupe` |
| `"type": "module"` in shared package breaks Metro | LOW | Remove `"type": "module"` from `packages/shared/package.json`, clear Metro cache |
| Platform-specific code in shared file crashes one platform | HIGH | Extract platform-split versions (`.web.js` + `.native.js`), update all imports in both apps — touches many files |
| EAS Build fails after all local tests pass | MEDIUM | Add `EAS_PROJECT_ROOT` env var to `eas.json`, ensure lock file is at monorepo root, verify `npm workspaces` field in root `package.json` |
| Vitest tests break after path restructuring | LOW | Update `vite.config.js` `test.exclude`, update import paths in test files that reference moved utilities |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Metro `watchFolders` missing | Phase 0: Monorepo scaffold | `expo start` + import from shared package succeeds |
| Duplicate React instances | Phase 0: Monorepo scaffold | `npm why react` shows single instance |
| `"type": "module"` breaks Metro | Phase 0: Monorepo scaffold | `packages/shared/package.json` has no `"type"` field |
| Vite stale cache / resolution | Phase 0: Monorepo scaffold | `npm run dev` + import from shared package succeeds |
| EAS Build failure | Phase 0: Monorepo scaffold | EAS cloud build passes with trivial shared import |
| Platform-specific files shared accidentally | Phase 1: Migrate utils | Audit checklist reviewed before each file move |
| `supabase.js` / `styles.js` shared directly | Phase 1: Migrate utils | These files stay out of shared OR use platform-split pattern |
| QueryClient singleton in wrong location | Phase 2: Migrate API/hooks | Hooks in shared only use `useQueryClient()`; client created in each app |
| Zustand storage adapter hardcoded | Phase 2: Migrate stores | Store factory pattern verified on both platforms |
| Vitest paths break | Phase 1: Migrate utils | `npm run test:run` passes after each batch of file moves |

---

## Sources

- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/) — official, HIGH confidence
- [EAS Build with Monorepos](https://docs.expo.dev/build-reference/build-with-monorepos/) — official, HIGH confidence
- [Metro Configuring](https://metrobundler.dev/docs/configuration/) — official, HIGH confidence
- [Vite Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling) — official, HIGH confidence
- [Metro Haste map symlink issue #286](https://github.com/facebook/metro/issues/286) — community issue, MEDIUM confidence
- [Expo issues with npm workspaces #30143](https://github.com/expo/expo/issues/30143) — community issue, MEDIUM confidence
- [TanStack Query no QueryClient in monorepo #6044](https://github.com/TanStack/query/issues/6044) — community issue, MEDIUM confidence
- [Zustand store in external package #2870](https://github.com/pmndrs/zustand/discussions/2870) — community discussion, MEDIUM confidence
- [Vite mixing CJS and ESM in monorepo #8726](https://github.com/vitejs/vite/discussions/8726) — community discussion, MEDIUM confidence
- [EAS Build lock file detection issue #3247](https://github.com/expo/eas-cli/issues/3247) — community issue, MEDIUM confidence

---
*Pitfalls research for: React + Vite + Expo monorepo with npm workspaces — shared code migration*
*Researched: 2026-03-15*
