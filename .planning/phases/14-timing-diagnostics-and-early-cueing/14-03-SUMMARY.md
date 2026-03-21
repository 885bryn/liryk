---
phase: 14-timing-diagnostics-and-early-cueing
plan: 03
subsystem: ui
tags: [early-cue, sync, react, vitest]
requires:
  - phase: 14-02
    provides: Verified diagnostics baseline and explicit gate before cue rollout.
provides:
  - Pure configurable early-cue utility with deterministic boundary behavior.
  - Fullscreen synced-line activation driven by cue-adjusted progress.
  - Regression protection for cue boundary activation without ordering regressions.
affects: [future cue tuning, fullscreen sync behavior]
tech-stack:
  added: []
  patterns: [pure timing utility for cue transforms, cue-adjusted active index derivation]
key-files:
  created:
    - src/core/sync/early-cue.ts
    - src/core/sync/early-cue.test.ts
  modified:
    - src/web/fullscreen-lyrics-page.tsx
    - src/web/fullscreen-lyrics-page.test.tsx
key-decisions:
  - "Use a conservative default early cue lead of 120ms, exported for tuning without renderer rewrites."
  - "Apply cueing only to synced active-line selection; keep tier rendering and motion contracts unchanged."
patterns-established:
  - "Cue behavior is encapsulated in a pure helper to keep UI activation logic deterministic and reusable."
  - "Boundary cue tests assert lead-ahead activation while preserving a single active line."
requirements-completed: [CUE-01]
duration: 2m
completed: 2026-03-21
---

# Phase 14 Plan 03: Conservative Early Cueing Summary

**Fullscreen synced highlighting now applies a small configurable lead via a pure cue utility so lines activate slightly early without breaking ordering or single-active-line guarantees.**

## Performance

- **Duration:** 2m
- **Started:** 2026-03-21T04:45:46Z
- **Completed:** 2026-03-21T04:47:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `src/core/sync/early-cue.ts` with exported default lead and deterministic cue transform helper.
- Added `src/core/sync/early-cue.test.ts` covering lead application, clamp semantics, disabled lead behavior, and monotonic progression.
- Wired fullscreen synced active-line selection to cue-adjusted progress while preserving existing lyric hierarchy/tier rendering behavior.
- Added boundary regression in `src/web/fullscreen-lyrics-page.test.tsx` proving conservative lead activation near timestamp edges.

## Task Commits

1. **Task 1: Create pure early-cue utility with deterministic boundary tests** - `74b3c77` (test), `7778ce4` (feat)
2. **Task 2: Wire conservative early cueing into fullscreen synced-line activation** - `869985b` (test), `5a6fc76` (feat)

## Files Created/Modified
- `src/core/sync/early-cue.ts` - Pure cue-adjustment helper with exported default lead constant.
- `src/core/sync/early-cue.test.ts` - Deterministic coverage for lead, clamp, and monotonic semantics.
- `src/web/fullscreen-lyrics-page.tsx` - Uses cue-adjusted progress for synced active-line derivation.
- `src/web/fullscreen-lyrics-page.test.tsx` - Adds near-boundary cue activation regression asserting stable single-active behavior.

## Decisions Made
- Set conservative default lead to 120ms and exported it as a tuning point.
- Limited cue influence to synced activation math, avoiding unnecessary changes in rendering tiers and motion behavior.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CUE-01 behavior is in place with deterministic tests and build validation.
- No blockers identified.

## Self-Check
PASSED

- FOUND: `.planning/phases/14-timing-diagnostics-and-early-cueing/14-03-SUMMARY.md`
- FOUND: `74b3c77`
- FOUND: `7778ce4`
- FOUND: `869985b`
- FOUND: `5a6fc76`

---
*Phase: 14-timing-diagnostics-and-early-cueing*
*Completed: 2026-03-21*
