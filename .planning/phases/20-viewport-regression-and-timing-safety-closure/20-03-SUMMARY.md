---
phase: 20-viewport-regression-and-timing-safety-closure
plan: "03"
subsystem: ui
tags: [fullscreen, viewport, regression, vitest, timing-safety]

requires:
  - phase: 20-viewport-regression-and-timing-safety-closure
    provides: Manual verification evidence identified cumulative mid-song active-line drift gap
provides:
  - Sustained mid-song progression regression coverage for active-row viewport stability
  - Invariant row-height measurement path decoupled from visual transform scaling
  - Revalidated SAFE-01 timing and motion safety gate after drift fix
affects: [fullscreen-lyrics, viewport-lock, SAFE-01, QA-01]

tech-stack:
  added: []
  patterns: [layout-metric-first row measurement, sustained progression viewport assertions]

key-files:
  created:
    - .planning/phases/20-viewport-regression-and-timing-safety-closure/20-03-SUMMARY.md
  modified:
    - src/web/fullscreen-lyrics-page.tsx
    - src/web/fullscreen-lyrics-page.test.tsx

key-decisions:
  - "Use offsetHeight/clientHeight/scrollHeight before getBoundingClientRect() for live row measurements so transform scaling cannot ratchet row layout."
  - "Keep timing authority and motion-window helpers unchanged while fixing viewport drift through measurement invariants only."

patterns-established:
  - "Sustained progression regressions should verify bounds, center tolerance, and live-lock state on every step."
  - "Measurement fallbacks preserve FALLBACK_ROW_TEXT_HEIGHT_PX and <=1px row-height stability guard for non-deterministic resize noise."

requirements-completed: [SAFE-01, QA-01]

duration: 3min
completed: 2026-04-15
---

# Phase 20 Plan 03: Viewport Regression and Timing Safety Closure Summary

**Fullscreen viewport anchoring now stays stable across sustained mid-song progression by measuring row height from invariant layout metrics instead of transform-inflated rects**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-15T20:52:51.273Z
- **Completed:** 2026-04-15T20:56:41.576Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Added a sustained mid-song progression regression (`8` sequential jumps) that checks per-step active-row viewport bounds, center tolerance, and live-lock status.
- Fixed fullscreen row measurement to prioritize invariant layout metrics (`offsetHeight`, `clientHeight`, `scrollHeight`) and only use `getBoundingClientRect().height` as a final fallback.
- Re-ran the six-file SAFE-01 timing/motion suite and production build to confirm timing authority and motion contracts stayed green after the drift fix.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add a failing cumulative-drift regression for sustained mid-song progression** - `5c15f07` (test)
2. **Task 2: Fix fullscreen row-height measurement so transforms cannot ratchet the live anchor** - `a7a6051` (fix)
3. **Task 3: Re-run the targeted timing/motion safety gate after drift fix** - `4f2ea92` (refactor)

## Files Created/Modified

- `src/web/fullscreen-lyrics-page.test.tsx` - Added sustained progression drift regression and consolidated tolerance constant used by safety assertions.
- `src/web/fullscreen-lyrics-page.tsx` - Switched row measurement to invariant layout-first metrics with existing fallback and stability guard preserved.
- `.planning/phases/20-viewport-regression-and-timing-safety-closure/20-03-SUMMARY.md` - Execution summary, verification evidence, and requirement traceability.

## Decisions Made

- Kept timing source selection (`estimatedProgressMs`, `applyEarlyCue`, `getLineIndicesAt`) and motion-window contracts unchanged; scoped the production fix to row-height measurement only.
- Preserved fallback behavior and the existing <=1px `setRowHeights` stability guard to avoid introducing resize churn regressions.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 20-04 can proceed with closure validation and final requirement sign-off. The sustained drift regression and targeted SAFE-01/build gates are green.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/20-viewport-regression-and-timing-safety-closure/20-03-SUMMARY.md`.
- Task commits found: `5c15f07`, `a7a6051`, `4f2ea92`.
