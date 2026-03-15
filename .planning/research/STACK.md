# Stack Research

**Domain:** JavaScript monorepo — React (Vite) + React Native (Expo 55) with shared code
**Researched:** 2026-03-15
**Confidence:** MEDIUM — Core tooling is well-documented; internal package ESM/CJS interop has gaps in official guidance.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| npm workspaces | built-in (npm 7+) | Workspace management and package linking | Already in use (project uses npm). Zero new tooling. SDK 55 auto-detects it. No `pnpm-workspace.yaml` or lock file migration needed. |
| `expo/metro-config` | SDK 55 (bundled) | Metro bundler for React Native | SDK 52+ auto-configures Metro for monorepos. SDK 55 enables autolinking resolution automatically. No manual `watchFolders` or `nodeModulesPath` config required. |
| Vite | ~6.x (existing) | Web app bundler | Already in use. With `resolve.dedupe` for singleton libs and `optimizeDeps.include` for CJS-only workspace packages, works fine with npm symlinks. |

### Shared Package Structure

The internal package (`packages/shared` or similar) should NOT use a build step during development. Both Metro and Vite resolve source directly via symlinks created by npm workspaces.

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Package format | Plain JS files, no transpilation | Metro and Vite both handle raw `.js` ESM source. No build step = no stale artifacts, simpler DX. |
| `package.json` `"main"` field | Point to `src/index.js` | Metro and Vite read this. No `exports` map needed for an internal package. |
| `"type"` field | `"module"` | Project is already ESM (`"type": "module"` in web app). Metro 0.82+ (Expo 55) handles ESM. No CJS wrapper needed. |
| Package name | Scoped: `@gym/shared` | Avoids collision with npm registry names. Referenced as `"@gym/shared": "*"` in both apps' `package.json`. |

### Supporting Libraries

No new runtime libraries are needed. All shared dependencies (Supabase, TanStack Query, Zustand) are already installed in both apps and will be deduplicated at the root `node_modules` level by npm hoisting.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-monorepo-config` | latest | Tiny Metro helper for edge cases | Only if Metro resolution fails for nested workspace packages. SDK 55 should make this unnecessary — check first. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| npm workspaces scripts | Run `expo start` and `vite dev` from monorepo root | Use `"dev:web": "npm run dev -w apps/web"` and `"dev:native": "npm run start -w apps/native"` at root `package.json`. |
| Vitest | Existing test runner for shared utils | Tests in `packages/shared/src/*.test.js`. No config change needed — vitest resolves workspace packages the same way Vite does. |

## Installation

```bash
# No new runtime packages needed.
# The shared package is internal — npm workspaces symlinks it automatically.

# If Metro resolution issues arise (last resort):
npm install -D react-native-monorepo-config -w apps/native
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| npm workspaces | pnpm workspaces | If the project were greenfield. pnpm has better isolation, `workspace:*` protocol, and faster installs. Migrating an existing npm project mid-milestone adds lock file churn and Metro hoisting config — not worth it here. |
| npm workspaces | Yarn Berry (PnP) | Never for this project. Yarn PnP has notoriously poor React Native support; even Expo discourages it for complex setups. |
| Bare npm workspaces | Turborepo | Only if build caching becomes a real pain (multiple packages with slow build steps). This project has no build step in the shared package, so Turborepo's caching provides no benefit. |
| Bare npm workspaces | Nx | Only for large teams needing code generation, affected-detection CI, and module boundary enforcement. Heavy for this scope. |
| No build step | Build shared package to CJS+ESM | Only if the shared package must be published to npm or consumed by tools that can't handle raw `.js` source. Not the case here. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Yarn Berry with PnP | PnP's virtual filesystem breaks Metro's node_modules traversal. Expo requires `node-linker=hoisted` to work at all with pnpm — Yarn PnP is worse. | npm workspaces (hoisted) |
| `"type": "commonjs"` in shared package | Metro 0.82+ (Expo 55) treats `"type": "module"` packages correctly with the Package Exports resolver. Forcing CJS creates an artificial wrapper and can cause dual-package hazard with Vite. | `"type": "module"` pointing to raw JS source |
| `exports` map in shared package | Adds complexity with no benefit for an internal package. Metro's condition ordering (it prefers `react-native` > `import` > `require`) can silently break if you set up conditions incorrectly. Use `"main"` only for internal packages. | Simple `"main"` field |
| Manual `metro.config.js` with `watchFolders` / `resolver.nodeModulesPath` | SDK 52+ auto-configures these. Adding them manually can conflict with Expo's auto-detection. The docs explicitly say to remove them if upgrading. | Default `expo/metro-config` with no overrides |
| `resolve.preserveSymlinks: true` in Vite | Breaks HMR in Vite (confirmed open GitHub issue). npm workspaces symlinks work without this option. | Let Vite follow symlinks (default) |

## Stack Patterns by Variant

**For platform-specific code (navigation, storage, notifications):**
- Use platform adapter injection — the shared hook/store accepts a `config` argument or a context provider with platform-specific implementations.
- Do NOT use `.native.js` / `.web.js` file extensions inside the shared package. Metro resolves these, but Vite does not, breaking web builds.
- Example: `createWorkoutStore(storageAdapter)` — web passes `localStorage`, RN passes `AsyncStorage`.

**For divergent constants (`styles.js`, `constants.js`):**
- Keep these in each app, not in shared package. They already diverge (Tailwind tokens vs native values) and will continue to diverge.
- The shared package only gets truly cross-platform logic (utils, API layer, hooks that don't reference navigation/storage/UI).

**If Metro resolution fails for a workspace package:**
- First try: clear Metro cache with `npx expo start --clear`.
- Second try: verify `"main"` field in shared package's `package.json` resolves to an actual file.
- Last resort: add `react-native-monorepo-config` to manually configure `watchFolders` and `nodeModulesPaths`.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Expo SDK 55 | Metro 0.82+ | Package Exports enabled by default. `"type": "module"` shared packages work. |
| Expo SDK 55 | npm workspaces (npm 7+) | Auto-detected. No manual Metro config needed. |
| Vite 6.x | npm workspace symlinks | Follows symlinks by default. Use `resolve.dedupe: ['react', 'react-dom']` to prevent duplicate React instances. |
| Zustand 5.x | Shared package with adapter injection | Works. Storage adapter is passed at store creation time, not imported at module level. |
| TanStack Query 5.x | Shared hooks package | Works. QueryClient should be created in each app, not in the shared package, to avoid singleton leaks across platforms. |

## Sources

- [Expo Docs — Work with Monorepos](https://docs.expo.dev/guides/monorepos/) — SDK 55 auto-configuration behavior; npm workspaces setup. **HIGH confidence** (official docs).
- [Metro Docs — Package Exports](https://metrobundler.dev/docs/package-exports/) — ESM exports support default-enabled in Metro 0.82+. **HIGH confidence** (official docs).
- [Vite Docs — Shared Options](https://vite.dev/config/shared-options) — `resolve.dedupe`, symlink handling. **HIGH confidence** (official docs).
- [expo/expo GitHub Issue #30143](https://github.com/expo/expo/issues/30143) — Known npm workspaces edge cases in Expo. **MEDIUM confidence** (issue tracker, may be resolved in SDK 55).
- [byCedric/expo-monorepo-example](https://github.com/byCedric/expo-monorepo-example) — Canonical pnpm + Turborepo example from Expo maintainer. Referenced as pattern evidence even though we use npm. **MEDIUM confidence**.
- [react-native-community discussions #941](https://github.com/react-native-community/discussions-and-proposals/discussions/941) — No authoritative answer exists yet for Vite+Metro cross-platform monorepo. Gap in official guidance. **LOW confidence** for Vite+RN patterns — verify during implementation.
- WebSearch: Vite symlink behavior in monorepos — `resolve.preserveSymlinks: true` breaks HMR. **MEDIUM confidence** (GitHub issue, multiple sources).

---
*Stack research for: React + Vite web / React Native + Expo 55 monorepo with shared JS code*
*Researched: 2026-03-15*
