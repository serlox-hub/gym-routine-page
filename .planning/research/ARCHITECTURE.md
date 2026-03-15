# Architecture Research

**Domain:** React + Vite / React Native + Expo monorepo with shared business logic
**Researched:** 2026-03-15
**Confidence:** HIGH (based on Expo official docs + direct codebase inspection)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MONOREPO ROOT                                 │
│  package.json (workspaces: ["apps/*", "packages/*"])                │
├──────────────────────┬──────────────────────┬───────────────────────┤
│   apps/web           │   apps/gym-native    │  packages/core        │
│   (React + Vite)     │   (Expo 55 / Metro)  │  (shared logic)       │
│                      │                      │                       │
│  src/                │  src/                │  src/                 │
│  ├── components/     │  ├── components/     │  ├── lib/             │
│  ├── hooks/          │  ├── hooks/          │  │   (pure utils)     │
│  ├── lib/            │  ├── lib/            │  ├── api/             │
│  │   (overrides)     │  │   (overrides)     │  │   (Supabase API)   │
│  ├── pages/          │  ├── screens/        │  ├── hooks/           │
│  └── stores/         │  ├── navigation/     │  │   (shared hooks)   │
│      (web adapters)  │  └── stores/         │  └── stores/         │
│                      │      (RN adapters)   │      (factory fns)   │
└──────────────────────┴──────────────────────┴───────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Platform |
|-----------|---------------|----------|
| `packages/core/src/lib/` | Pure utility functions (no platform APIs, no imports with side effects) | Both — identical source |
| `packages/core/src/api/` | Supabase query/mutation functions. Import `supabase` via parameter injection, not directly | Both — identical source |
| `packages/core/src/hooks/` | TanStack Query hooks that depend only on API layer + core lib | Both — with adapter injection |
| `packages/core/src/stores/` | Zustand store factory functions that accept a `storage` parameter | Both — instantiated per platform |
| `apps/web/src/lib/supabase.js` | Supabase client using `import.meta.env.VITE_*` | Web only |
| `apps/web/src/stores/` | Calls store factories with `localStorage`-backed persist | Web only |
| `apps/gym-native/src/lib/supabase.js` | Supabase client using `process.env.EXPO_PUBLIC_*` + AsyncStorage auth | RN only |
| `apps/gym-native/src/stores/` | Calls store factories with `AsyncStorage`-backed persist | RN only |
| `apps/web/src/lib/styles.js` | Full Tailwind token set + CSS-compatible style helpers | Web only |
| `apps/gym-native/src/lib/styles.js` | Subset of color tokens + RN StyleSheet objects | RN only |

## Recommended Project Structure

```
gym-tracker/                       # monorepo root
├── package.json                   # workspaces: ["apps/*", "packages/*"]
├── apps/
│   ├── web/                       # current repo root (moved here)
│   │   ├── package.json           # name: "@gym/web", dep: "@gym/core": "*"
│   │   ├── vite.config.js
│   │   └── src/
│   │       ├── components/        # web-only UI
│   │       ├── pages/
│   │       ├── hooks/             # web-only hooks (useDrag.js)
│   │       ├── lib/
│   │       │   ├── supabase.js    # VITE_* env vars
│   │       │   └── styles.js      # full Tailwind token set
│   │       └── stores/
│   │           ├── authStore.js   # createAuthStore(supabase, localStorage)
│   │           └── workoutStore.js # createWorkoutStore(localStorage)
│   └── gym-native/                # current gym-native/ (moved here)
│       ├── package.json           # name: "@gym/native", dep: "@gym/core": "*"
│       ├── metro.config.js        # watchFolders + resolver for monorepo
│       └── src/
│           ├── components/        # RN-only UI
│           ├── screens/
│           ├── navigation/
│           ├── hooks/             # RN-only hooks (useStableHandlers.js)
│           ├── lib/
│           │   ├── supabase.js    # EXPO_PUBLIC_* env vars + AsyncStorage
│           │   └── styles.js      # RN-native style objects only
│           └── stores/
│               ├── authStore.js   # createAuthStore(supabase, AsyncStorage)
│               └── workoutStore.js # createWorkoutStore(AsyncStorage)
└── packages/
    └── core/
        ├── package.json           # name: "@gym/core", "main": "src/index.js"
        └── src/
            ├── index.js           # re-exports everything
            ├── lib/               # ALL pure utils (16 files, identical today)
            │   ├── arrayUtils.js
            │   ├── calendarUtils.js
            │   ├── dateUtils.js
            │   ├── measurementConstants.js
            │   ├── measurementTypes.js
            │   ├── routineExerciseForm.js
            │   ├── routineIO.js   # downloadRoutineAsJson platform-branched
            │   ├── routineTemplates.js
            │   ├── setUtils.js
            │   ├── supersetUtils.js
            │   ├── textUtils.js
            │   ├── timeUtils.js
            │   ├── timeUtils.js
            │   ├── validation.js
            │   ├── workoutCalculations.js
            │   └── workoutTransforms.js
            ├── api/               # Supabase API functions (web-only today)
            │   ├── exerciseApi.js
            │   ├── routineApi.js
            │   ├── workoutApi.js
            │   ├── bodyMeasurementsApi.js
            │   ├── bodyWeightApi.js
            │   ├── preferencesApi.js
            │   └── adminApi.js
            ├── hooks/             # Shared TanStack Query hooks
            │   ├── useExercises.js
            │   ├── useRoutines.js
            │   ├── useWorkout.js
            │   ├── useWorkoutHistory.js
            │   ├── useBodyMeasurements.js
            │   ├── useBodyWeight.js
            │   ├── useCompletedSets.js
            │   ├── usePreferences.js
            │   ├── useSession.js
            │   ├── useSessionExercises.js
            │   └── useRestTimer.js
            └── stores/
                ├── createAuthStore.js    # factory: (supabase) => zustand store
                └── createWorkoutStore.js # factory: (storage) => zustand store
```

### Structure Rationale

- **`packages/core/src/lib/`:** All 16 utility files are byte-for-byte identical between web and RN today (verified by diff). Move once, delete copies.
- **`packages/core/src/api/`:** API layer exists only in web today. RN hooks inline the same Supabase queries. Moving API fns to core and having RN hooks import them eliminates the drift.
- **`packages/core/src/hooks/`:** Most hooks differ only because RN inlines queries instead of calling the API layer. Once the API layer is shared, hooks converge. Navigation/notification differences are handled via adapter injection (see patterns below).
- **`packages/core/src/stores/`:** Stores differ only in the `storage` argument to `persist`. Factory functions accept `storage` at instantiation time; each platform passes its own.
- **Platform `lib/supabase.js` and `lib/styles.js` stay in each app** — they diverge in env vars (VITE vs EXPO_PUBLIC) and in the nature of style values (CSS strings vs RN numbers). They cannot be shared without a build-time transform.

## Architectural Patterns

### Pattern 1: Store Factories (Zustand + Platform Storage)

**What:** Instead of exporting a store directly, export a function that creates the store. The function accepts a `storage` parameter compatible with Zustand's `createJSONStorage`.

**When to use:** Any Zustand store that calls `persist()`. Both `workoutStore` and `authStore` need this.

**Trade-offs:** +Enables sharing store logic. -Each platform must call the factory and export the singleton itself. The store instance is no longer importable directly from the shared package.

**Example:**
```js
// packages/core/src/stores/createWorkoutStore.js
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export function createWorkoutStore(storage) {
  return create(
    persist(
      (set, get) => ({
        sessionId: null,
        // ... all shared state
      }),
      {
        name: 'workout-storage',
        storage: createJSONStorage(() => storage),
      }
    )
  )
}

// apps/web/src/stores/workoutStore.js
import { createWorkoutStore } from '@gym/core/stores/createWorkoutStore'
export default createWorkoutStore(localStorage)

// apps/gym-native/src/stores/workoutStore.js
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createWorkoutStore } from '@gym/core/stores/createWorkoutStore'
export default createWorkoutStore(AsyncStorage)
```

### Pattern 2: Platform Adapter Injection for Hooks (Navigation + Notifications)

**What:** Shared hooks that need navigation or notification APIs accept a platform adapter object as parameter. Each app passes its own implementation.

**When to use:** Any hook that calls `useNavigate` (web) or `navigation.navigate` (RN), or triggers a toast/notification.

**Trade-offs:** +No conditional platform code in the shared package. +Hooks remain pure and testable. -Callers must always pass adapters; this is boilerplate but it is explicit.

**Example:**
```js
// packages/core/src/hooks/useWorkout.js
// The hook is called with an adapter, NOT imported from react-router-dom
export function useStartSession({ onNavigate, onNotify } = {}) {
  const mutate = useMutation({
    mutationFn: startSessionApi,
    onSuccess: (session) => {
      onNavigate?.(`/session/${session.id}`)
    },
    onError: (err) => {
      onNotify?.({ type: 'error', message: err.message })
    },
  })
  return mutate
}

// apps/web/src/hooks/useWorkout.js  (thin wrapper)
import { useNavigate } from 'react-router-dom'
import { useStartSession as useStartSessionCore } from '@gym/core/hooks/useWorkout'

export function useStartSession() {
  const navigate = useNavigate()
  return useStartSessionCore({
    onNavigate: (path) => navigate(path),
    onNotify: ({ message }) => console.warn(message), // or a toast lib
  })
}

// apps/gym-native/src/hooks/useWorkout.js  (thin wrapper)
import { useNavigation } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { useStartSession as useStartSessionCore } from '@gym/core/hooks/useWorkout'

export function useStartSession() {
  const navigation = useNavigation()
  return useStartSessionCore({
    onNavigate: (path) => navigation.navigate(path),
    onNotify: ({ type, message }) => Toast.show({ type, text1: message }),
  })
}
```

### Pattern 3: `package.json` `exports` Field for Dual-Bundler Compatibility

**What:** The shared package defines `exports` so Metro (RN) and Vite (web) both resolve modules correctly without needing build output. Both bundlers can consume raw source directly.

**When to use:** Always — this replaces relying on hoisted `node_modules` resolution which is fragile in workspaces.

**Trade-offs:** +Precise, explicit resolution. +No build step required for the shared package (source-direct import). -Metro requires `watchFolders` to include the monorepo root.

**Example (`packages/core/package.json`):**
```json
{
  "name": "@gym/core",
  "version": "1.0.0",
  "main": "src/index.js",
  "exports": {
    ".": "./src/index.js",
    "./lib/*": "./src/lib/*.js",
    "./api/*": "./src/api/*.js",
    "./hooks/*": "./src/hooks/*.js",
    "./stores/*": "./src/stores/*.js"
  }
}
```

**Metro configuration (`apps/gym-native/metro.config.js`):**
```js
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// SDK 52+: Expo configures watchFolders automatically.
// Only needed if auto-config is insufficient:
config.watchFolders = [monorepoRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

module.exports = config
```

Note: Expo SDK 52+ configures Metro for monorepos automatically when using `expo/metro-config`. The project uses Expo 55 which is within this range. Manual `watchFolders` may not be required but is safe to include as a fallback.

**Vite configuration (`apps/web/vite.config.js` — additions):**
```js
// No changes needed for resolving @gym/core — npm workspaces symlink handles it.
// Add only if duplicate React instances appear:
resolve: {
  dedupe: ['react', 'react-dom', '@tanstack/react-query', 'zustand'],
}
```

### Pattern 4: Platform-Specific File Branches Within Core (Rare)

**What:** For files that are almost identical but have one platform-specific function (e.g., `routineIO.js` where `downloadRoutineAsJson` uses DOM APIs on web and throws on RN), keep one file but branch the diverging function.

**When to use:** When the divergence is a single function and the rest of the file is 95%+ identical. Avoids duplicating the entire file for a small difference.

**Trade-offs:** +Keeps the file in one place. -The platform branch code is slightly noisy.

**Example:**
```js
// packages/core/src/lib/routineIO.js
const IS_REACT_NATIVE = typeof navigator !== 'undefined' && navigator.product === 'ReactNative'

export function downloadRoutineAsJson(data, filename) {
  if (IS_REACT_NATIVE) {
    // Caller should use expo-sharing instead — this is a no-op here
    throw new Error('Use shareRoutineAsJson on React Native')
  }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

Alternative for `videoStorage.js` (diverges heavily — DOM XHR vs expo-file-system): keep platform-specific copies in each app, do not include in core.

## Data Flow

### Request Flow (after migration)

```
Component (web or RN)
    │
    ▼
Platform wrapper hook (apps/web/hooks or apps/gym-native/hooks)
    │  injects: navigation adapter, notification adapter
    ▼
Core shared hook (packages/core/hooks/)
    │  calls API function
    ▼
Core API function (packages/core/api/)
    │  receives supabase client from app-level import
    ▼
Supabase JS client (platform-specific supabase.js in each app)
    │
    ▼
Supabase / PostgreSQL
```

### State Management Flow

```
Platform store instantiation at app boot:
  createWorkoutStore(AsyncStorage)  →  useWorkoutStore (RN)
  createWorkoutStore(localStorage)  →  useWorkoutStore (web)

Component
  └─ useWorkoutStore() ──► reads Zustand state
  └─ useWorkoutStore(s => s.action)() ──► dispatches action
       │
       ▼
  Zustand persist middleware ──► platform storage (AsyncStorage or localStorage)
```

### Key Data Flows

1. **Utils import:** Component → `@gym/core/lib/workoutCalculations` (no platform branch, pure function)
2. **API call from hook:** Shared hook → `@gym/core/api/routineApi` → `supabase` imported by the app
3. **Navigation after mutation:** Mutation `onSuccess` → calls `onNavigate` adapter → platform router

## Build Order (Migration Phases)

This order minimizes risk. Each step is independently shippable and testable.

| Phase | What Moves | Risk | Validation |
|-------|-----------|------|------------|
| **1. Monorepo setup** | Root `package.json` workspaces, move `gym-native/` to `apps/gym-native/`, move web to `apps/web/` (or keep as root app and restructure later) | HIGH — file paths change everywhere | Both apps start and tests pass |
| **2. Pure utils** | All 16 `lib/*.js` files that diff as IDENTICAL today to `packages/core/src/lib/` | LOW — no logic change | Existing vitest suite passes, RN app builds |
| **3. API layer** | Move `src/lib/api/*.js` to `packages/core/src/api/`. Update web hooks imports. RN hooks switch from inline queries to API functions | MEDIUM — RN hooks rewritten | Both apps produce same data |
| **4. Store factories** | Extract store factory functions. Each app instantiates with its storage adapter | MEDIUM — store shape must stay identical | Auth and workout state persist correctly on both platforms |
| **5. Shared hooks** | Move hooks that only differ due to inline queries (now resolved by Phase 3) to `packages/core/src/hooks/`. Add adapter injection for navigation/notifications | MEDIUM — hook contracts change | All hook-dependent components work on both platforms |
| **6. Cleanup** | Remove duplicate files, update all import paths, run full test suite | LOW — verification only | Zero diverged copies remain |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (1-2 devs, 2 platforms) | npm workspaces + source-direct shared package — no build step, fast iteration |
| Adding a 3rd platform (e.g., desktop Electron) | Add `apps/desktop/`, create platform adapter for its storage and navigation. Core untouched |
| Adding TypeScript | Convert `packages/core` first (most impactful). Apps can stay JS and consume typed package via JSDoc annotations |

## Anti-Patterns

### Anti-Pattern 1: Importing `supabase` Directly in `packages/core`

**What people do:** Add a `supabase.js` to the shared package that tries to read env vars universally.

**Why it's wrong:** Env var prefixes differ (`VITE_*` vs `EXPO_PUBLIC_*`) and the Supabase client initialization options differ (AsyncStorage auth config in RN). A shared `supabase.js` would need build-time env injection or complex runtime branching.

**Do this instead:** Keep platform-specific `supabase.js` in each app. Pass the `supabase` client into API functions as a parameter, or have each app's hooks import from their local `supabase.js` and pass it to core API functions.

### Anti-Pattern 2: Sharing `styles.js` in Core

**What people do:** Put color tokens in the shared package so both platforms use the same values.

**Why it's wrong:** Web `styles.js` exports CSS strings used by Tailwind-based components (e.g., `bgHover: 'rgba(255,255,255,0.05)'`). RN `styles.js` exports RN StyleSheet objects with different shape. The color hex values are identical, but the utility style objects (`inputStyle`, `cardStyle`, etc.) are fundamentally different types.

**Do this instead:** Extract only the shared hex color values to `packages/core/src/lib/colorTokens.js`. Each platform's `styles.js` imports from `colorTokens.js` and builds its own platform-appropriate objects on top.

### Anti-Pattern 3: Using `.native.js` File Extensions in the Shared Package

**What people do:** Put `routineIO.native.js` alongside `routineIO.js` in the shared package and rely on Metro's platform extension resolution.

**Why it's wrong:** Vite does not understand `.native.js` extensions. The shared package would only work correctly in Metro. This breaks the dual-bundler compatibility goal.

**Do this instead:** Use runtime branching for the rare cases where a function diverges (Pattern 4 above), or keep the platform-specific file entirely in the app (e.g., `videoStorage.js`).

### Anti-Pattern 4: Big-Bang Migration

**What people do:** Move all files to the shared package at once, update all imports, fix all broken paths in a single PR.

**Why it's wrong:** Both apps break simultaneously. Tests don't tell you which layer introduced the failure. Rollback is a full revert.

**Do this instead:** Follow the Phase build order above. Pure utils first (zero risk), then API layer, then stores, then hooks. Each phase is a standalone PR that leaves both apps functional.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase JS client | Platform-specific instantiation; API fns receive client as param or via module-level import in each app | Cannot be shared directly — env vars and auth config differ |
| TanStack Query | `QueryClient` config is identical today; can be shared from `packages/core/src/lib/queryClient.js` | Already identical between platforms |
| Zustand | Store factories in core, instantiated per platform with storage adapter | See Pattern 1 |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `packages/core` ↔ `apps/web` | npm workspace symlink; web imports `@gym/core` | Vite follows symlinks natively |
| `packages/core` ↔ `apps/gym-native` | npm workspace symlink; Metro requires `watchFolders` | SDK 52+ configures automatically |
| `apps/web/hooks` ↔ `packages/core/hooks` | Thin wrapper hooks inject navigation/notification adapters | One wrapper hook per shared hook that needs platform APIs |
| Platform stores ↔ `packages/core/stores` | Factory call at module initialization; singleton exported per app | Store shape must stay in sync across factories |

## Sources

- [Expo Monorepo Guide (official)](https://docs.expo.dev/guides/monorepos/) — HIGH confidence
- [Metro Package Exports (official)](https://metrobundler.dev/docs/package-exports/) — HIGH confidence
- [Metro Bundler Configuration (official)](https://docs.expo.dev/guides/customizing-metro/) — HIGH confidence
- [Zustand and React Context (Tkdodo)](https://tkdodo.eu/blog/zustand-and-react-context) — MEDIUM confidence
- [React Native Monorepo with Shared Code and Hooks (Medium)](https://medium.com/redmadrobot-mobile/react-native-monorepo-with-shared-code-and-hooks-51cc3b87d795) — MEDIUM confidence
- Direct codebase inspection (`diff` of all lib, hook, and store files between web and gym-native) — HIGH confidence

---
*Architecture research for: Gym Tracker React+Vite / React Native+Expo monorepo*
*Researched: 2026-03-15*
