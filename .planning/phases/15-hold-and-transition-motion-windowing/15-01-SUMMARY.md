---
phase: 15-hold-and-transition-motion-windowing
plan: "01"
subsystem: ui
tags: [lyrics, sync, motion-window, vitest]
requires:
  - phase: 14-diagnostics-and-early-cue-foundation
    provides: trusted estimated progress and cue-adjusted timing inputs for motion helpers
provides:
  - Adaptive transition duration helper with deterministic clamp defaults
  - Transition phase helper for hold/transition/complete boundary resolution
  - Unit coverage for transition clamp and phase boundary behavior
affects: [15-02, fullscreen-lyrics-motion, MOT-04, MOT-05]
tech-stack:
  added: []
  patterns:
    - Pure timing helpers exported from core sync modules
    - Deterministic integer math with explicit non-negative clamping
key-files:
  created:
    - src/core/sync/lyric-motion-window.ts
    - src/core/sync/lyric-motion-window.test.ts
  modified: []
key-decisions:
  - "Use Math.floor plus non-negative normalization for all motion-window timing inputs."
  - "Model transition state as hold/transition/complete with phaseProgress pinned to 0..1 for deterministic consumers."
patterns-established:
  - "Motion-window contracts are renderer-agnostic and reusable from fullscreen lyric motion logic."
  - "Transition duration derives from gap * fraction and is hard-clamped by exported min/max defaults."
requirements-completed: [TRN-01]
duration: 2min
completed: 2026-03-21
---

# Phase 15 Plan 01: Hold and Transition Motion Windowing Summary

**Reusable motion-window timing primitives now compute adaptive transition duration and deterministic hold/transition/complete phases for lyric line changes.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T05:17:05Z
- **Completed:** 2026-03-21T05:18:47Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Added `getAdaptiveTransitionMs` with default clamp behavior (`220..520ms`) and configurable fraction-based scaling.
- Added `getTransitionPhase` that returns deterministic phase boundaries and normalized `phaseProgress` values.
- Added tests covering clamp semantics, invalid/small gap handling, and hold/transition/complete boundary transitions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create motion-window contract tests and exports (RED)** - `eca19bf` (test)
2. **Task 1: Create motion-window contract tests and exports (GREEN)** - `d92004a` (feat)

_Note: TDD task produced separate RED and GREEN commits._

## Files Created/Modified
- `src/core/sync/lyric-motion-window.ts` - Exports adaptive transition duration and transition phase helpers.
- `src/core/sync/lyric-motion-window.test.ts` - Locks clamp and phase-boundary behavior with deterministic unit tests.

## Decisions Made
- Used floor-based integer normalization and non-negative clamping for all incoming timing values to keep motion math deterministic across runtimes.
- Treated progress at or after `nextStartMs` as `complete` and progress before `transitionStartMs` as `hold` so boundary transitions are explicit.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- TRN-01 helper contracts are available for fullscreen motion consumption.
- Phase 15 plan 02 can wire these helpers into renderer motion offsets and animation timing.

---
*Phase: 15-hold-and-transition-motion-windowing*
*Completed: 2026-03-21*

## Self-Check: PASSED

- FOUND: `.planning/phases/15-hold-and-transition-motion-windowing/15-01-SUMMARY.md`
- FOUND: `eca19bf`
- FOUND: `d92004a`
