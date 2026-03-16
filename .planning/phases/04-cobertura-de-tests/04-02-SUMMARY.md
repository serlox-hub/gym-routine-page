---
phase: 04-cobertura-de-tests
plan: 02
subsystem: stores
tags: [testing, zustand, auth, vitest]
dependency_graph:
  requires: []
  provides: [TEST-02]
  affects: []
tech_stack:
  added: []
  patterns: [createWorkoutStore.test.js pattern, makeSupabaseMock factory, act() + getState() + expect()]
key_files:
  created:
    - packages/shared/src/stores/createAuthStore.test.js
  modified: []
decisions:
  - "makeSupabaseMock incluye todos los métodos auth relevantes con defaults sensatos (getSession → null session, signInWithPassword → éxito, signOut → éxito)"
  - "onAuthStateChange callback se captura via mockImplementation en tests dedicados para poder invocarla directamente"
  - "Factory test verifica independencia de instancias, alineado con createWorkoutStore.test.js"
metrics:
  duration: 1min
  completed_date: "2026-03-16"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 4 Plan 02: createAuthStore Tests Summary

**One-liner:** 26 unit tests para createAuthStore cubriendo initialize/login/signup/logout/resetPassword/callbacks de plataforma con patrón makeSupabaseMock.

## What Was Built

`packages/shared/src/stores/createAuthStore.test.js` — 26 tests que cubren la totalidad de la API pública de `createAuthStore`, siguiendo exactamente el patrón de `createWorkoutStore.test.js`.

### Test Coverage

| Group | Tests | Coverage |
|-------|-------|----------|
| Initial state | 2 | user null, isLoading true, isAuthenticated false |
| initialize() | 6 | sesión existente, sin sesión, listener, onBeforeInitialize, error graceful, onBeforeLogout error cleanup |
| login() | 4 | éxito, error, limpieza de error previo, isAuthenticated post-login |
| signup() | 2 | éxito sin auto-login, error |
| logout() | 4 | limpieza de estado, onBeforeLogout callback, signOut call, tolerancia a error signOut |
| resetPassword() | 3 | éxito, onResetPasswordOptions hook, error |
| clearError / clearPasswordRecovery | 2 | reset de error, reset de isPasswordRecovery |
| onAuthStateChange | 2 | SIGNED_IN actualiza user, SIGNED_OUT limpia user |
| Factory | 1 | instancias independientes |
| **Total** | **26** | **~85%+ cobertura funcional** |

### Setup Pattern

```js
function makeSupabaseMock() {
  return {
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: {...}, user: {...} }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: {...} }, error: null }),
      signOut: vi.fn().mockResolvedValue({}),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  }
}
```

## Verification

```
Test Files  22 passed (22)
     Tests  553 passed (553)
```

All 26 createAuthStore tests pass. All pre-existing 527 tests continue to pass (createWorkoutStore.test.js, routineApi.test.js, etc.).

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] `packages/shared/src/stores/createAuthStore.test.js` exists (430 lines)
- [x] 26 tests (plan requested 15-20; 26 provides better coverage depth)
- [x] Commit `1e85828` exists
- [x] All 553 tests pass
