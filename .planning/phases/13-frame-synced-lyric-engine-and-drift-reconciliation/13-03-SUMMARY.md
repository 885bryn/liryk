---
phase: 13-frame-synced-lyric-engine-and-drift-reconciliation
plan: 03
subsystem: core
tags: [drift-reconciliation, sync-engine, thresholds, vitest]
requires:
  - phase: 13-02
    provides: deterministic line-index boundary semantics for engine frame outputs
provides:
  - explicit hard-reset drift path for large estimate-vs-observed divergence
  - bounded per-sample soft correction for in-band drift
  - transition-triggered immediate resync behavior with deterministic confidence states
affects: [phase-14-diagnostics, early-cueing]
tech-stack:
  added: []
  patterns: [threshold-based drift reconciliation, clamped correction per reanchor sample]
key-files:
  created: []
  modified: [src/core/sync/lyric-sync-engine.ts, src/core/sync/lyric-sync-engine.test.ts]
key-decisions:
  - "Use a hard snap threshold of 1200ms to avoid prolonged desync when drift is large."
  - "Clamp soft correction to 100ms per sample so in-band drift converges without abrupt jumps."
patterns-established:
  - "Transition events seeked track_changed paused resumed bypass soft correction and sync immediately."
  - "Confidence is synced for direct/hard alignment and estimated only when bounded correction leaves residual drift."
requirements-completed: [CLK-03]
duration: 1m
completed: 2026-03-21
---

# Phase 13 Plan 03: Drift hard-reset and bounded soft-correction Summary

**Lyric sync reanchoring now applies deterministic drift reconciliation: large deltas snap immediately, in-band deltas correct in bounded steps, and transition resync remains immediate.**

## Performance

- **Duration:** 1m
- **Started:** 2026-03-21T04:26:54Z
- **Completed:** 2026-03-21T04:28:09Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added RED tests that lock behavior for hard reset, bounded soft correction (positive and negative drift), and transition bypass.
- Implemented bounded drift policy with per-sample clamp while preserving immediate sync on transition events and large drift.
- Kept policy pure and deterministic under controlled `nowPerfMs` test time.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RED tests for drift hard-reset and bounded soft-correction policy** - `e7cf115` (test)
2. **Task 2: Implement deterministic drift reconciliation thresholds and bounded correction** - `6bd0b28` (feat)

## Files Created/Modified
- `src/core/sync/lyric-sync-engine.test.ts` - Added threshold-focused coverage for hard/soft drift paths and transition sync semantics.
- `src/core/sync/lyric-sync-engine.ts` - Implemented clamped soft correction with explicit synced vs estimated confidence outcomes.

## Decisions Made
- Kept hard reset threshold at 1200ms so large divergence resolves in one sample.
- Set bounded soft correction to +/-100ms per sample to reduce jitter while converging safely.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Drift reconciliation behavior is deterministic and ready for timing diagnostics instrumentation in Phase 14.
- Confidence state semantics are now stable inputs for overlay/debug surfacing.

## Self-Check: PASSED
