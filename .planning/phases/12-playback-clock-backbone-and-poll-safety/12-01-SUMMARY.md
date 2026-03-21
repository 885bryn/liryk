---
phase: 12-playback-clock-backbone-and-poll-safety
plan: "01"
subsystem: playback
tags: [timing, vitest, playback-clock]
requires:
  - phase: 11-karaoke-motion-and-minimal-overlay-polish
    provides: Stable fullscreen lyric runtime baseline for timing upgrades.
provides:
  - Pure playback clock contracts for anchor/sample timing state.
  - Deterministic progress estimator utility for local between-poll progression.
  - Unit tests covering playing, paused, and negative-elapsed behavior.
affects: [phase-12-plan-02, phase-13]
tech-stack:
  added: []
  patterns: [monotonic perf-time estimation, pure timing utility module]
key-files:
  created:
    - src/core/playback/playback-clock.ts
    - src/core/playback/playback-clock.test.ts
  modified:
    - src/core/playback/types.ts
key-decisions:
  - "Export playback clock contracts from core playback types to keep downstream imports stable."
  - "Keep estimator pure and deterministic by requiring injected nowPerfMs values at call sites/tests."
patterns-established:
  - "Playback clock anchor pattern: snapshot metadata plus captured monotonic timestamp."
  - "Estimator rule: clamp elapsed and resulting progress at non-negative bounds."
requirements-completed: [CLK-01]
duration: 2 min
completed: 2026-03-21
---

# Phase 12 Plan 01: Playback Clock Contract and Estimator Summary

**Playback clock anchor contracts and a pure monotonic estimator now provide deterministic local progress timing between Spotify polls.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T04:04:17Z
- **Completed:** 2026-03-21T04:05:54Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `PlaybackClockSample` and `PlaybackClockAnchor` exports in playback core types.
- Added RED coverage for playing, paused, and negative elapsed-time estimation behavior.
- Implemented pure `createPlaybackClockAnchor` and `estimatePlaybackProgressMs` utilities to satisfy deterministic tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add playback clock contracts and failing estimator tests** - `c763d94` (test)
2. **Task 2: Implement playback clock estimator utility** - `4cd779b` (feat)

## Files Created/Modified
- `src/core/playback/playback-clock.ts` - Creates anchors from trusted samples and estimates progress from monotonic elapsed time.
- `src/core/playback/playback-clock.test.ts` - Locks estimator behavior for play/pause/negative-delta scenarios.
- `src/core/playback/types.ts` - Exposes reusable playback clock contracts for runtime consumers.

## Decisions Made
- Exported clock contracts from `src/core/playback/types.ts` so later plans can consume a single stable type surface.
- Estimator adds elapsed time only while playing and clamps elapsed/progress to avoid regressions from non-monotonic inputs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Playback clock primitives are ready for runtime/store integration in plan 12-02.
- Deterministic unit coverage provides a baseline guardrail for future timing drift work.

---
*Phase: 12-playback-clock-backbone-and-poll-safety*
*Completed: 2026-03-21*

## Self-Check: PASSED

- FOUND: `.planning/phases/12-playback-clock-backbone-and-poll-safety/12-01-SUMMARY.md`
- FOUND: `c763d94`
- FOUND: `4cd779b`
