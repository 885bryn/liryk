---
phase: 04-cache-freshness-and-repeat-load-performance
plan: "02"
subsystem: app
tags: [cache, runtime, stale-while-revalidate, retry, session-guard]
requires:
  - phase: 04-01
    provides: Cache entry contract, freshness evaluator, and file-backed adapter
provides:
  - Cache-aware runtime branching for fresh hits, stale refresh, and expired/miss resolve paths
  - Invalid cache eviction and retry-forced provider refresh behavior
  - Session-guarded background refresh so old work cannot overwrite newer tracks
affects: [verification, runtime, lyrics-resolution]
tech-stack:
  added: []
  patterns: [cache-before-provider branching, session-guarded stale refresh]
key-files:
  created: []
  modified:
    - src/app/lyrics-resolution-runtime.ts
    - src/app/lyrics-resolution-runtime.test.ts
key-decisions:
  - "Keep cache wiring in runtime orchestration and preserve resolver as fresh-provider source of truth."
  - "Treat invalid cache entries as poisoned data: evict first, then resolve fresh."
patterns-established:
  - "Runtime pattern: fresh hit short-circuit, stale immediate render + background refresh, expired/miss fresh resolve."
  - "Safety pattern: stale refresh and retry both use the existing session guard to prevent cross-track overwrite."
requirements-completed: [CACH-01, CACH-02]
duration: 18min
completed: 2026-03-20
---

# Phase 4 Plan 02: Cache-Aware Runtime Summary

**Lyrics resolution runtime now serves fresh cache hits instantly, revalidates stale entries safely, and evicts invalid cache data before forced fresh resolves.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-20T01:26:07Z
- **Completed:** 2026-03-20T01:29:26Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended runtime dependencies with optional cache access and cache-state evaluation.
- Added cache-first branching: `fresh` short-circuit, `stale` immediate render + background refresh, `expired/miss` provider resolve.
- Persisted fresh provider results back into cache entries after successful runtime resolves.
- Added invalid-entry eviction and retry-forced refresh behavior while preserving session guard safety.

## Task Commits

1. **Task 1: Make lyrics resolution cache-aware for fresh, stale, and expired entries** - `e8f26a4` (test), `c37626f` (feat)
2. **Task 2: Evict invalid cache entries and force refresh on retry** - `4e9ef05` (test), `e749593` (feat)

## Files Created/Modified

- `src/app/lyrics-resolution-runtime.ts` - Cache-aware runtime orchestration, stale background refresh, invalid eviction, and cache writes.
- `src/app/lyrics-resolution-runtime.test.ts` - Coverage for fresh-hit short-circuit, stale revalidation, expired bypass, invalid eviction, retry bypass, and session guards.

## Decisions Made

- Preserved runtime as the single orchestration layer for cache+provider behavior to avoid duplicating freshness logic in resolver modules.
- Kept retry path cache-bypassed by default so explicit user recovery always resolves fresh provider truth.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Needed additional microtask flushes in runtime tests because cache reads/writes added async boundaries compared to the pre-cache runtime path.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 goal verification can now assert repeat-load speed and freshness recovery through automated runtime and cache tests.

## Self-Check: PASSED
