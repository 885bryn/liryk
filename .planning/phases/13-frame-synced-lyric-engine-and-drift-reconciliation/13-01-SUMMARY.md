---
phase: 13-frame-synced-lyric-engine-and-drift-reconciliation
plan: 01
subsystem: ui
tags: [lyrics, requestAnimationFrame, playback-clock, vitest]
requires:
  - phase: 12-playback-clock-backbone-and-poll-safety
    provides: estimated playback progress between Spotify polls
provides:
  - requestAnimationFrame-driven live lyric frame ticker
  - deterministic cancellation guards for pause, idle, and stop
  - RAF lifecycle regression coverage in live sync runtime tests
affects: [13-02-PLAN, 13-03-PLAN, lyric-sync-runtime]
tech-stack:
  added: []
  patterns: [dependency-injected RAF scheduler, token-guarded frame loop cancellation]
key-files:
  created: []
  modified: [src/app/live-sync-runtime.ts, src/app/live-sync-runtime.test.ts]
key-decisions:
  - "Use dependency-injected requestAnimationFrame/cancelAnimationFrame hooks for deterministic runtime tests."
  - "Invalidate frame callbacks with loop tokens so stale scheduled callbacks cannot update state after cancellation."
patterns-established:
  - "Runtime scheduling follows start-on-playing and immediate-stop-on-paused-idle-stop lifecycle."
  - "Frame-loop tests assert scheduler IDs and stale-callback suppression directly."
requirements-completed: [LYR-01]
duration: 3m
completed: 2026-03-21
---

# Phase 13 Plan 01: Replace interval ticker with requestAnimationFrame Summary

**Live lyric updates now run on requestAnimationFrame with guarded cancellation paths that prevent stale frame callbacks after pause, idle, and runtime stop.**

## Performance

- **Duration:** 3m
- **Started:** 2026-03-21T04:19:36Z
- **Completed:** 2026-03-21T04:22:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced interval-based runtime ticker with RAF scheduling while preserving existing frame application behavior.
- Added deterministic frame-loop guard logic so canceled or stale frame callbacks cannot mutate live sync state.
- Expanded runtime tests to cover play scheduling plus pause, idle, and stop cancellation semantics by frame ID.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing tests for requestAnimationFrame scheduler lifecycle** - `37c1753` (test)
2. **Task 2: Implement requestAnimationFrame-based frame ticker in runtime** - `d116a67` (feat)

_Note: TDD flow completed with RED (Task 1) then GREEN (Task 2); no refactor-only commit was required._

## Files Created/Modified
- `src/app/live-sync-runtime.ts` - Switched ticker lifecycle from interval polling to requestAnimationFrame with cancellation token guards.
- `src/app/live-sync-runtime.test.ts` - Added scheduler lifecycle tests for frame start, cancellation, and stale callback suppression.

## Decisions Made
- Injected RAF scheduler functions through runtime dependencies to keep tests deterministic and avoid global timing side effects.
- Used frame-loop token invalidation in addition to cancelAnimationFrame to block stale callback execution after lifecycle transitions.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Runtime now emits frame-synced lyric updates and cancellation safety required by downstream resolver/drift work.
- Phase 13-02 can build on this scheduler to focus on binary-search active-line semantics.

## Self-Check: PASSED
