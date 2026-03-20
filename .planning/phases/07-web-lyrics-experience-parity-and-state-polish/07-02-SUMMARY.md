---
phase: 07-web-lyrics-experience-parity-and-state-polish
plan: "02"
subsystem: ui
tags: [react, vitest, app-shell, lyrics]
requires:
  - phase: 07-01
    provides: Panel metadata and state-rail contract fields.
provides:
  - App shell lyrics pane renders now-playing metadata from panel model.
  - Stable inline status rail with deterministic idle/info/warning styling.
  - Explicit syncing/empty/not-found shell states with test coverage.
affects: [07-03-PLAN, visual-regression, shell-lyrics-pane]
tech-stack:
  added: []
  patterns:
    - App shell supports deterministic lyrics panel override for state-focused tests.
    - Shell state containers keyed by panel status/sourceState contract.
key-files:
  created:
    - .planning/phases/07-web-lyrics-experience-parity-and-state-polish/07-02-SUMMARY.md
  modified:
    - src/web/app-shell.tsx
    - src/web/app-shell.test.tsx
key-decisions:
  - "Kept one always-present lyrics status rail directly below metadata and changed style only by stateRailVariant."
  - "Used idle default panel fixture in AppShell with optional lyricsPanelOverride for deterministic test injection."
patterns-established:
  - "Web shell preserves Phase 6 grid classes while introducing parity state rendering markers."
  - "Not-found shell state keeps retry CTA visibility driven by panel showPrimaryAction/primaryActionLabel."
requirements-completed: [WEB-03, UI-04]
duration: 2min
completed: 2026-03-20
---

# Phase 7 Plan 02: Shell Parity Rendering Summary

**Web shell now renders panel-driven now-playing metadata and explicit parity states with a single inline status rail location.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T20:32:47Z
- **Completed:** 2026-03-20T20:34:33Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added failing shell tests for metadata rendering, state-specific containers, and stable `lyrics-status-rail` placement.
- Integrated `createLiveLyricsPanelBuilder` output into `AppShell` with deterministic default state and test override hook.
- Implemented explicit `lyrics-now-playing`, `lyrics-empty-state`, and `lyrics-not-found-state` regions while preserving responsive layout classes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing shell tests for metadata and explicit parity states** - `b62b588` (test)
2. **Task 2: Implement state-driven lyrics pane rendering with stable inline status rail** - `4bd2021` (feat)

## Files Created/Modified
- `src/web/app-shell.test.tsx` - Added parity state expectations and shell-scoped test-id assertions.
- `src/web/app-shell.tsx` - Rendered panel metadata/status rail/state containers and introduced `lyricsPanelOverride` for deterministic tests.

## Decisions Made
- Kept the status rail rendered in one fixed location under now-playing metadata; variant classes change semantics without layout movement.
- Preserved legacy idle placeholder copy in empty-state rendering to avoid regressions in prior shell expectations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Scoped new shell assertions to latest rendered layout**
- **Found during:** Task 2 (state-driven lyrics pane rendering)
- **Issue:** Added tests queried global `data-testid` markers and collided with multiple rendered shells from prior test runs.
- **Fix:** Scoped assertions to the last `shell-layout` instance via `within(shell)` for deterministic per-render validation.
- **Files modified:** `src/web/app-shell.test.tsx`
- **Verification:** `npm test -- src/web/app-shell.test.tsx`
- **Committed in:** `4bd2021` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** No scope change; fix was required for stable, deterministic test behavior.

## Issues Encountered
None beyond test scoping fix during implementation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 07-03 can add visual regression assertions against stable shell markers (`lyrics-now-playing`, `lyrics-status-rail`, `lyrics-empty-state`, `lyrics-not-found-state`).
- No blockers identified.

---
*Phase: 07-web-lyrics-experience-parity-and-state-polish*
*Completed: 2026-03-20*

## Self-Check: PASSED

- FOUND: `.planning/phases/07-web-lyrics-experience-parity-and-state-polish/07-02-SUMMARY.md`
- FOUND: `b62b588`
- FOUND: `4bd2021`
