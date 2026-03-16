---
phase: 05-housekeeping
plan: 03
subsystem: dx
tags: [dependencies, monorepo, documentation, supabase, tanstack-query, zustand]

# Dependency graph
requires:
  - phase: 04-cobertura-de-tests
    provides: 763 tests covering shared logic — needed before dependency upgrades
provides:
  - Aligned dependency versions across web and RN apps
  - CLAUDE.md with accurate monorepo architecture documentation
affects: [future-phases, new-contributors]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Version parity: shared deps (@supabase/supabase-js, @tanstack/react-query, zustand) kept in sync across apps"
    - "CLAUDE.md as living documentation: reflects current monorepo architecture for Claude context"

key-files:
  created: []
  modified:
    - apps/web/package.json
    - package-lock.json
    - CLAUDE.md

key-decisions:
  - "Web resolved to patch-newer versions (supabase 2.99.2, zustand 5.0.12) — within semver range of RN targets, compatible"
  - "CLAUDE.md rewritten as additive update: all existing conventions preserved, monorepo sections added"

patterns-established:
  - "Thin wrapper pattern: apps/ hooks re-export @gym/shared hooks, inject platform callbacks"
  - "Injection layer: initApi/initStores/initNotifications called at app startup before any queries"

requirements-completed: [DX-01, DX-02]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 5 Plan 03: Dependency Sync + CLAUDE.md Monorepo Documentation Summary

**Aligned supabase-js, tanstack-query, and zustand versions across web/RN apps, and rewrote CLAUDE.md to reflect monorepo architecture with @gym/shared barrel imports and injection layer.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T18:59:42Z
- **Completed:** 2026-03-16T19:02:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Upgraded `@tanstack/react-query` (5.62 → 5.90.21), `@supabase/supabase-js` (2.49 → 2.98+), `zustand` (5.0.2 → 5.0.11+) in apps/web — all 763 tests still pass
- Rewrote CLAUDE.md with full monorepo project tree (apps/web, apps/gym-native, packages/shared), @gym/shared barrel import pattern, initApi/initStores/initNotifications injection layer, and thin wrapper pattern with callback injection
- All existing conventions (naming, component rules, hooks organization, dumb components architecture) preserved

## Task Commits

Each task was committed atomically:

1. **Task 1: Sync dependency versions between web and RN** - `6aae71c` (chore)
2. **Task 2: Rewrite CLAUDE.md for monorepo architecture** - `cdfa561` (docs)

## Files Created/Modified
- `apps/web/package.json` - Updated @tanstack/react-query, @supabase/supabase-js, zustand versions
- `package-lock.json` - Updated lockfile after upgrades
- `CLAUDE.md` - Full monorepo documentation with @gym/shared, initApi/initStores, thin wrapper pattern

## Decisions Made
- Web resolved to patch-newer versions than RN targets (supabase 2.99.2 vs 2.98.0, zustand 5.0.12 vs 5.0.11) — both within the ^ semver range, fully compatible
- CLAUDE.md written as additive update: kept all valid existing conventions, added new sections rather than removing content

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 5 (housekeeping) complete. All dependency versions aligned, documentation up to date.
- Ready for future feature work with accurate monorepo architecture documented.

---
*Phase: 05-housekeeping*
*Completed: 2026-03-16*
