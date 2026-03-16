# Technology Stack — Tech Debt Reduction

**Project:** Gym Tracker monorepo (web React + React Native)
**Researched:** 2026-03-16
**Scope:** Tooling for tech debt reduction. NOT a greenfield stack — existing tools are already in place and working. This document focuses on what's missing, what needs adjusting, and what to avoid adding.

---

## Existing Stack (Do Not Replace)

Already working and validated. Do not introduce alternatives.

| Tool | Version | Role | Status |
|------|---------|------|--------|
| npm workspaces | built-in | Monorepo package management | Working |
| Vitest | ^4.0.15 | Unit tests for web + shared | Working |
| @testing-library/react | ^16.3.0 | Hook and component tests | Working |
| @testing-library/jest-dom | ^6.9.1 | Assertion matchers | Working |
| ESLint v9 flat config | ^9.39.x | Linting | Working (both apps) |
| @gym/eslint-config | internal | Shared ESLint rules | Working |
| Playwright | ^1.57.0 | E2E tests for web | Working |
| Vitest coverage | included | Coverage reports | Available, underused |

**Key insight:** The test infrastructure already exists and already runs `packages/shared` tests through the web app's vitest config (`include: ['../../packages/shared/src/**/*.test.js']`). The shared package does NOT need its own separate test runner.

---

## Tooling Gaps — What to Add

### 1. syncpack — Dependency Version Alignment (DX-01)

**Recommendation:** Use `syncpack` to audit and fix version mismatches.
**Why syncpack over npm-check-updates:** npm-check-updates finds newer versions globally. syncpack finds mismatches _between workspaces_ — which is the actual problem. The 3 desync'd deps (`@supabase/supabase-js`, `@tanstack/react-query`, `zustand`) are a syncpack problem, not an upgrade problem.

**Confidence:** HIGH — syncpack is the industry standard for this use case, used by Vercel, Cloudflare, Datadog, PostHog. Actively maintained (npm, GitHub).

**Usage pattern:**
```bash
# Install at root (dev)
npm install -D syncpack

# Audit mismatches
npx syncpack list-mismatches

# Fix them
npx syncpack fix-mismatches
```

**Add to root package.json scripts:**
```json
{
  "deps:check": "syncpack list-mismatches",
  "deps:fix": "syncpack fix-mismatches"
}
```

**Do not use:** Renovate or Dependabot for this task. Both require repo config and infrastructure overhead that is disproportionate for a 3-dep drift. syncpack is a one-command fix.

---

### 2. Vitest `projects` config — Root-level test orchestration (DX-03)

**Recommendation:** Add a root `vitest.config.js` that uses the `projects` array to run all workspace tests in a single command.

**Why:** DX-03 requires a `test:shared` root script. Currently the root `package.json` has no test runner — it delegates to `apps/web`. The shared package tests run via the web app's vitest config which includes `../../packages/shared/**/*.test.js`. This works but is fragile — shared tests break silently if the web config changes, and there's no way to run shared tests in isolation.

**Confidence:** HIGH — Vitest 3.2+ officially recommends `projects` (deprecates the older `workspace` name). Verified via official docs.

**Important caveat:** Vitest does NOT work with React Native. The shared package tests are pure JS/React hooks — they run fine in jsdom. Do not attempt to run the RN app through Vitest.

**Root vitest.config.js pattern:**
```js
// /vitest.config.js (root)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['apps/web'],  // web app's vitest config already covers shared
  },
})
```

**Simpler alternative for DX-03:** Add a root script that runs the web vitest config directly — since shared tests are already included there, no separate project config is needed:
```json
{
  "test": "vitest run --config apps/web/vite.config.js",
  "test:shared": "vitest run --config apps/web/vite.config.js --reporter=verbose packages/shared"
}
```

**Coverage:** Use `@vitest/coverage-v8` (already available as `vitest run --coverage`). Since Vitest 3.2, v8 coverage uses AST-based remapping and is as accurate as Istanbul, with better performance. No need to add Istanbul.

---

### 3. Vitest mock pattern for API layer (TEST-01, TEST-02)

**No new packages needed.** The existing test infrastructure (`vitest`, `@testing-library/react`) is sufficient.

**Pattern already established in the codebase** (`createWorkoutStore.test.js`). The API layer uses `initApi(supabaseClient)` / `getClient()` — this is already designed for injection and mocking.

**Pattern for API tests:**
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initApi } from '../_client.js'

const mockChain = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  is: vi.fn(),
}
// Each method returns the chain for fluent API
Object.values(mockChain).forEach(fn => fn.mockReturnValue(mockChain))

const mockSupabase = {
  from: vi.fn(() => mockChain),
  auth: { getSession: vi.fn(), onAuthStateChange: vi.fn() },
}

beforeEach(() => {
  initApi(mockSupabase)
  vi.clearAllMocks()
})
```

**Pattern for hook tests (TEST-03):**
```js
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Usage
const { result } = renderHook(() => useRoutines(), { wrapper: createWrapper() })
await waitFor(() => expect(result.current.isSuccess).toBe(true))
```

**Confidence:** HIGH — `renderHook` from `@testing-library/react` (React 18+) is the correct approach. `@testing-library/react-hooks` is deprecated for React 18+. Verified via TanStack Query v5 docs and RTL docs.

**Do not use:** `@testing-library/react-hooks` (deprecated), `react-test-renderer` (deprecated in React 19).

---

## What NOT to Add

| Tool | Why Not |
|------|---------|
| Turborepo / Nx | Disproportionate for a 2-app monorepo. npm workspaces handles this project fine. Turborepo caching would save seconds, not minutes. |
| Jest for web/shared | Vitest is already configured and 3-5x faster than Jest. No migration benefit. |
| Jest for RN | The RN app has no unit tests (only lint). Adding Jest for a milestone about shared hooks is premature — shared hooks are tested via Vitest on the web side. |
| jscpd / jsinspect | Automated duplication detection tools add noise for manual refactoring tasks. The duplication is already inventoried in DEUDA-TECNICA-V2.md. Use grep/manual inspection instead. |
| Prettier | Not in the project now. Adding a formatter mid-refactor causes large diffs that obscure actual logic changes. |
| Husky pre-commit hooks | Adds friction for a refactor-heavy milestone. DX-03 adds root scripts — that's sufficient. |
| TypeScript | Explicitly out of scope per PROJECT.md. |
| pnpm / Yarn Berry | npm workspaces is already in use and working. Migration yields no benefit for this milestone. |

---

## Dependency Versions to Align (DX-01)

These are the 3 known mismatches. Fix with syncpack or manually:

| Package | apps/web | apps/gym-native | Action |
|---------|----------|-----------------|--------|
| `@supabase/supabase-js` | ^2.49.1 | ^2.98.0 | Align web to ^2.98.0 |
| `@tanstack/react-query` | ^5.62.0 | ^5.90.21 | Align web to ^5.90.21 |
| `zustand` | ^5.0.2 | ^5.0.11 | Align web to ^5.0.11 |

After aligning: run `npm install && npm run test:run -w apps/web && npm run build -w apps/web` to verify nothing breaks.

---

## Root Scripts to Add (DX-03)

Complete the root `package.json` scripts:

```json
{
  "scripts": {
    "dev": "npm run dev -w apps/web",
    "build": "npm run build -w apps/web",
    "native": "npm run start -w apps/gym-native",
    "test": "npm run test:run -w apps/web",
    "test:shared": "vitest run --config apps/web/vite.config.js --reporter=verbose",
    "lint": "npm run lint -w apps/web && npm run lint -w apps/gym-native",
    "check": "npm run lint && npm run test",
    "deps:check": "syncpack list-mismatches",
    "deps:fix": "syncpack fix-mismatches"
  }
}
```

**Why `test:shared` reuses web config:** The web vite config already includes `../../packages/shared/src/**/*.test.js`. A separate vitest project config adds complexity without benefit for this project size.

---

## Installation Summary

```bash
# Only new dev dependency needed for this milestone
npm install -D syncpack
```

Everything else is already installed. No other new packages required.

---

## Sources

- [Vitest Projects (Monorepo) — Official Docs](https://vitest.dev/guide/projects)
- [Vitest 3.2 Release — AST-based v8 coverage](https://vitest.dev/blog/vitest-3-2.html)
- [Syncpack — Official](https://syncpack.dev/)
- [Syncpack GitHub — JamieMason/syncpack](https://github.com/JamieMason/syncpack)
- [TanStack Query v5 Testing Guide](https://tanstack.com/query/v5/docs/react/guides/testing)
- [Testing React Query — tkdodo blog](https://tkdodo.eu/blog/testing-react-query)
- [Vitest compatibility with React Native Testing Library — GitHub Discussion](https://github.com/callstack/react-native-testing-library/discussions/1142)
- [ESLint v9 flat config in monorepos](https://medium.com/@felipeprodev/how-to-use-eslint-v9-in-a-monorepo-with-flat-config-file-format-8ef2e06ce296)
- [Expo unit testing — Official Docs](https://docs.expo.dev/develop/unit-testing/)
