---
phase: 03-lyrics-resolution-and-rendered-experience
plan: "04"
subsystem: ui
tags: [presenter, viewport, fallback, i18n, panel]
requires:
  - phase: 03-03
    provides: Runtime/store source-state and retry metadata
provides:
  - Presenter mapping for explicit synced/plain/low-confidence/not-found states and retry action
  - Panel-facing model behavior that keeps fallback status explicit
  - Direction-aware viewport lines with plain-static no-highlight rendering behavior
affects: [04-01]
tech-stack:
  added: []
  patterns: [source-state explicit UI mapping, direction-aware line models]
key-files:
  created: []
  modified:
    - src/app/live-lyrics-presenter.ts
    - src/ui/lyrics/lyrics-viewport.tsx
key-decisions:
  - "Expose retry action as a single primary affordance only for not-found with retry available."
  - "Normalize Chinese display text at viewport model build-time so renderer stays dumb and deterministic."
patterns-established:
  - "Presenter pattern: source-state drives copy, badges, action visibility, and plain-mode semantics."
  - "Viewport pattern: each line includes text/displayText/dir metadata for multilingual-safe rendering."
requirements-completed: [LYR-04, I18N-01, UI-01]
duration: 8min
completed: 2026-03-20
---

# Phase 3 Plan 04: Presenter and Viewport Experience Summary

**Live lyrics UI models now expose explicit fallback/retry source states and multilingual line metadata while keeping plain mode honest and non-highlighted.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-20T00:36:45Z
- **Completed:** 2026-03-20T00:39:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Updated presenter model to include source state, render mode, warning badge, and single primary retry action semantics.
- Added explicit not-found copy and retry-in-flight inline status behavior in view-model mapping.
- Updated viewport model to return per-line `text`, `displayText`, and `dir` metadata for multilingual-safe rendering.
- Added plain-static viewport mode that disables active-line highlight and return-to-live affordances.

## Task Commits

1. **Task 1: Update presenter and panel model for explicit fallback, warning, and retry states** - `a312ae1` (test), `58fc736` (feat)
2. **Task 2: Make viewport rendering direction-aware and plain-fallback-safe** - `977aeaf` (test), `b2d8568` (feat)

## Files Created/Modified
- `src/app/live-lyrics-presenter.ts` - Source-state-aware presenter mapping and retry/warning action fields.
- `src/app/live-lyrics-presenter.test.ts` - Coverage for not-found, low-confidence, plain fallback, and retry-in-flight behavior.
- `src/ui/lyrics/live-lyrics-panel.test.tsx` - Panel-level assertions for retry and fallback semantics.
- `src/ui/lyrics/lyrics-viewport.tsx` - Direction-aware line model and plain-static rendering path.
- `src/ui/lyrics/lyrics-viewport.test.tsx` - Viewport coverage for plain-static behavior and Arabic/Korean/Chinese fixtures.

## Decisions Made
- Kept panel behavior within existing model-builder structure rather than introducing a new UI flow.
- Suppressed synced confidence badge in plain-static mode to avoid misleading timing implications.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 can build caching/performance behavior on top of explicit resolution and rendering state contracts.

## Self-Check: PASSED
