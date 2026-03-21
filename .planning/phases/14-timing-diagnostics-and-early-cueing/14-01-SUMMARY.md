---
phase: 14-timing-diagnostics-and-early-cueing
plan: 01
subsystem: ui
tags: [react, vitest, playback-sync, diagnostics]
requires:
  - phase: 13-frame-synced-lyric-engine-and-drift-reconciliation
    provides: Frame-driven sync confidence/progress behavior used for diagnostics values.
provides:
  - Runtime diagnostics fields in live sync state (estimated, polled, drift, correction).
  - Fullscreen diagnostics overlay with explicit toggle and labeled timing values.
  - Regression coverage for diagnostics reset and fullscreen toggle/value rendering.
affects: [14-02 baseline drift diagnostics, 14-03 early cueing]
tech-stack:
  added: []
  patterns: [TDD test->feature commits, diagnostics state sourced from runtime sample + sync frame]
key-files:
  created: []
  modified:
    - src/state/playback/live-sync-store.ts
    - src/state/playback/live-sync-store.test.ts
    - src/app/live-sync-runtime.ts
    - src/app/live-sync-runtime.test.ts
    - src/web/fullscreen-lyrics-page.tsx
    - src/web/fullscreen-lyrics-page.test.tsx
key-decisions:
  - "Diagnostics drift is computed as estimated minus latest trusted polled progress from the same sample."
  - "Fullscreen diagnostics remain optional via a subdued toggle so lyric hierarchy stays primary."
patterns-established:
  - "Runtime diagnostics writes flow through store setters only, avoiding ad hoc UI math."
  - "Idle and track-clear paths reset diagnostics fields to safe static defaults."
requirements-completed: [DBG-01]
duration: 4m
completed: 2026-03-21
---

# Phase 14 Plan 01: Timing Diagnostics Overlay Summary

**Toggleable fullscreen timing diagnostics now surface estimated versus polled progress, drift delta, and correction state from runtime sync samples with deterministic reset behavior.**

## Performance

- **Duration:** 4m
- **Started:** 2026-03-21T04:35:19Z
- **Completed:** 2026-03-21T04:39:38Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added diagnostics contract fields to `LiveSyncUiState` and store setters for polled progress, drift delta, and correction state.
- Wired runtime snapshot handling to populate diagnostics from sync-frame estimate plus trusted snapshot progress and reset on idle/track clear.
- Added a keyboard-accessible fullscreen diagnostics toggle with labeled values and idle-safe fallback rendering.
- Extended regression coverage for runtime/store diagnostics behavior and fullscreen diagnostics overlay interactions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add diagnostics state contract and runtime population** - `dbaad70` (test), `644cad2` (feat)
2. **Task 2: Render fullscreen diagnostics overlay with explicit toggle and field labels** - `52cd571` (test), `039e1e2` (feat)

_Note: TDD tasks used separate failing-test and implementation commits._

## Files Created/Modified
- `src/state/playback/live-sync-store.ts` - Adds diagnostics fields and setters, plus safe reset behavior.
- `src/state/playback/live-sync-store.test.ts` - Covers diagnostics defaults, updates, and resets.
- `src/app/live-sync-runtime.ts` - Populates diagnostics from frame/snapshot data and resets on idle.
- `src/app/live-sync-runtime.test.ts` - Verifies diagnostics writes and reset semantics across runtime transitions.
- `src/web/fullscreen-lyrics-page.tsx` - Adds diagnostics toggle and overlay bound to live sync diagnostics values.
- `src/web/fullscreen-lyrics-page.test.tsx` - Covers diagnostics toggle behavior, required labels/values, and idle fallback.

## Decisions Made
- Used sync-frame progress plus trusted snapshot progress as the single diagnostics sample source to avoid UI-side derived timing math.
- Kept diagnostics secondary via an explicit toggle and subdued overlay styling so fullscreen remains lyric-first.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- DBG-01 is complete and verified by tests/build, so baseline diagnostics behavior is ready for Phase 14-02 validation gating.
- No blockers identified for continuing timing diagnostics hardening.

## Self-Check
PASSED

- FOUND: `.planning/phases/14-timing-diagnostics-and-early-cueing/14-01-SUMMARY.md`
- FOUND: `dbaad70`
- FOUND: `644cad2`
- FOUND: `52cd571`
- FOUND: `039e1e2`

---
*Phase: 14-timing-diagnostics-and-early-cueing*
*Completed: 2026-03-21*
