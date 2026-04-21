---
phase: 11-karaoke-motion-and-minimal-overlay-polish
plan: "01"
subsystem: ui
tags: [react, vitest, fullscreen, routing]
requires:
  - phase: 10-monochrome-visual-language-and-typography/10-03
    provides: Monochrome fullscreen lyric-first baseline and regression contracts.
provides:
  - Visible shell control to enter fullscreen lyrics mode.
  - Visible fullscreen control to exit back to the shell route.
  - Regression assertions for both route-control affordances.
affects: [phase-11-02-motion, phase-11-03-overlay, milestone-v1.2-verification]
tech-stack:
  added: []
  patterns: ["Accessible route controls use named links with explicit href contracts", "Fullscreen tests assert shell marker exclusion alongside navigation affordances"]
key-files:
  created: [.planning/phases/11-karaoke-motion-and-minimal-overlay-polish/11-01-SUMMARY.md]
  modified: [src/web/app-shell.test.tsx, src/web/fullscreen-lyrics-page.test.tsx, src/web/app-shell.tsx, src/web/fullscreen-lyrics-page.tsx]
key-decisions:
  - "Use semantic links for enter/exit controls so route targets remain directly testable via href assertions."
  - "Keep fullscreen exit affordance subdued (small, reduced-opacity text) to preserve lyric-first hierarchy."
patterns-established:
  - "Route navigation controls are validated by accessible name plus href assertions in shell/fullscreen tests."
  - "Fullscreen route tests keep explicit shell-layout absence checks in navigation-focused assertions."
requirements-completed: [FULL-03, FULL-04]
duration: 1m
completed: 2026-03-21
---

# Phase 11 Plan 01: Fullscreen Entry/Exit Controls Summary

**Shell and fullscreen pages now expose explicit in-app navigation links for entering and exiting immersive lyrics mode, with regression coverage that locks both visibility and route targets.**

## Performance

- **Duration:** 1m
- **Started:** 2026-03-21T01:24:43Z
- **Completed:** 2026-03-21T01:26:12Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added route-control tests that require `Open Fullscreen Lyrics` (`/fullscreen`) and `Exit Fullscreen Lyrics` (`/`) links.
- Added a visible shell header link to enter fullscreen mode with subdued `outline` button styling.
- Added a visible fullscreen top-of-column exit link while keeping fullscreen route free of shell chrome.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add route-control tests for fullscreen entry and exit** - `b18b9f7` (test)
2. **Task 2: Implement visible fullscreen entry and exit controls** - `647a6a4` (feat)

_Note: Task 1 used TDD RED and intentionally failed before implementation._

## Files Created/Modified
- `src/web/app-shell.test.tsx` - Added assertion for visible `Open Fullscreen Lyrics` link and `/fullscreen` target.
- `src/web/fullscreen-lyrics-page.test.tsx` - Added assertion for visible `Exit Fullscreen Lyrics` link, `/` target, and `shell-layout` absence.
- `src/web/app-shell.tsx` - Added header route control linking to `/fullscreen`.
- `src/web/fullscreen-lyrics-page.tsx` - Added subdued top-of-column exit link back to `/`.

## Decisions Made
- Used semantic anchor links instead of imperative navigation handlers to keep route contracts deterministic and easy to test.
- Placed the fullscreen exit control at the top of the lyric column with understated styling to avoid competing with lyric hierarchy.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Task 1 verification failed by design during TDD RED because controls were not yet implemented; Task 2 then satisfied the test contracts.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FULL-03 and FULL-04 are now implementation-complete with regression coverage.
- Phase 11 motion and overlay plans can proceed on top of stable shell/fullscreen navigation affordances.

---
*Phase: 11-karaoke-motion-and-minimal-overlay-polish*
*Completed: 2026-03-21*

## Self-Check: PASSED

- FOUND: `.planning/phases/11-karaoke-motion-and-minimal-overlay-polish/11-01-SUMMARY.md`
- FOUND: `b18b9f7`
- FOUND: `647a6a4`
