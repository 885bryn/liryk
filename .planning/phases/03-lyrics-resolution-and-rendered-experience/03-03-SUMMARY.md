---
phase: 03-lyrics-resolution-and-rendered-experience
plan: "03"
subsystem: runtime
tags: [runtime, state, retry, stale-guard, live-sync]
requires:
  - phase: 03-02
    provides: Canonical resolver outputs and source-state semantics
provides:
  - Store fields for lyrics source, render mode, warning, retry, and resolved lines
  - Session-guarded lyrics resolution runtime with retry and stale-response suppression
  - Live sync runtime integration for plain-static fallback without fake timeline highlights
affects: [03-04]
tech-stack:
  added: []
  patterns: [track-session guards, explicit runtime store projection]
key-files:
  created:
    - src/app/lyrics-resolution-runtime.ts
  modified:
    - src/state/playback/live-sync-store.ts
    - src/app/live-sync-runtime.ts
key-decisions:
  - "Guard async resolution with a monotonically increasing session token to suppress stale completions."
  - "Treat plain-static and not-found as explicit runtime states instead of coercing playback into unavailable."
patterns-established:
  - "Runtime pattern: track change clears old lyric resolution state immediately before async resolve."
  - "Retry pattern: inline retry status with preserved panel/playback context."
requirements-completed: [LYR-01, LYR-03, LYR-04]
duration: 11min
completed: 2026-03-20
---

# Phase 3 Plan 03: Runtime and Store Integration Summary

**Track-session lyrics resolution now updates store state deterministically, suppresses stale async results, and keeps plain fallback readable in live sync runtime.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-20T00:33:00Z
- **Completed:** 2026-03-20T00:36:05Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Extended live sync store with explicit lyrics source/render/retry/warning fields and reset behavior on track change.
- Added `createLyricsResolutionRuntime` with per-track session guards against stale async completion races.
- Implemented retry lifecycle with transient status line (`Retrying lyrics lookup...`) and not-found retry affordance.
- Updated live sync runtime to preserve playing/paused behavior for plain-static/not-found resolved states.

## Task Commits

1. **Task 1: Extend the live sync store with lyrics resolution state and retry metadata** - `2dde20b` (test), `847d4c6` (feat)
2. **Task 2: Implement track-session lyrics resolution runtime and wire synced timelines into live sync** - `d8f5b40` (test), `8afbb6f` (feat)

## Files Created/Modified
- `src/state/playback/live-sync-store.ts` - Added canonical lyrics resolution and retry state fields/setters.
- `src/state/playback/live-sync-store.test.ts` - Added store coverage for source states, retry, and track reset behavior.
- `src/app/lyrics-resolution-runtime.ts` - New track-session resolver runtime with retry API and stale-result suppression.
- `src/app/lyrics-resolution-runtime.test.ts` - Runtime race/retry/not-found integration tests.
- `src/app/live-sync-runtime.ts` - Plain-static-aware sync runtime behavior.
- `src/app/live-sync-runtime.test.ts` - Plain fallback integration behavior tests.

## Decisions Made
- Preserved playback state semantics while adding lyrics-resolution state rather than overloading `unavailable`.
- Exposed runtime getter for resolved lyrics per track so sync runtime can distinguish plain-static from missing timeline.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04 can map explicit source/retry state directly into presenter and viewport outputs.

## Self-Check: PASSED
