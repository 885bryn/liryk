---
phase: 19-song-boundary-visibility-and-live-lock-recovery
plan: "01"
subsystem: ui
tags: [fullscreen, viewport, lyrics, react, vitest]
requires:
  - phase: 18-viewport-anchor-ownership-and-scroll-surface
    provides: viewport-owned fullscreen scroll surface and live-lock scroll ownership
provides:
  - Boundary-locked fullscreen scroll targeting for first and last synced lyric visibility
  - Deterministic fullscreen geometry regressions for track-start, transition, song-end, and final-handoff cases
affects: [VIEW-01, VIEW-02, src/web/fullscreen-lyrics-page.tsx, src/web/fullscreen-lyrics-page.test.tsx]
tech-stack:
  added: []
  patterns:
    - Fullscreen boundary correction derives from row-layout anchors and clamped viewport scroll targets
    - Viewport visibility regressions compute mocked lyric bounds from the same row-layout model as runtime anchoring
key-files:
  created:
    - .planning/phases/19-song-boundary-visibility-and-live-lock-recovery/19-01-SUMMARY.md
  modified:
    - src/web/fullscreen-lyrics-page.tsx
    - src/web/fullscreen-lyrics-page.test.tsx
key-decisions:
  - "Keep boundary visibility in the fullscreen page by clamping a scroll target derived from getFloatingRowAnchorPx and rowLayout.totalHeight."
  - "Prove boundary visibility with a deterministic geometry harness instead of brittle transform-string assertions."
patterns-established:
  - "Fullscreen live-anchor recovery and boundary visibility share one pure getBoundaryLockedScrollTop helper."
  - "Boundary tests assert mocked lyric bounds inside the viewport with row-layout-derived geometry."
requirements-completed: [VIEW-01, VIEW-02]
duration: 6min
completed: 2026-04-09
---

# Phase 19 Plan 01: Song-Boundary Visibility Summary

**Boundary-locked fullscreen live anchoring now keeps the first and last synced lyric rows inside the viewport using row-layout scroll clamping plus deterministic geometry regressions.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-10T02:36:00Z
- **Completed:** 2026-04-10T02:41:44Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added fullscreen regression coverage for track start, track transition, song end, and final handoff viewport visibility.
- Introduced `getBoundaryLockedScrollTop` so fullscreen live anchoring clamps against row-layout geometry instead of hard-coded `top: 0`.
- Verified fullscreen boundary behavior without changing lyric timeline or sync-engine active/next index contracts.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add boundary-visibility regressions for first-line entry and final-line handoff** - `893ea54` (test)
2. **Task 2: Implement boundary-aware live-anchor geometry without changing timing contracts** - `047d122` (feat)

## Files Created/Modified
- `src/web/fullscreen-lyrics-page.test.tsx` - Adds the geometry harness and boundary visibility regressions.
- `src/web/fullscreen-lyrics-page.tsx` - Adds `getBoundaryLockedScrollTop` and routes live recentering through boundary-aware scroll targets.

## Decisions Made
- Kept boundary correction local to the fullscreen page because viewport height and scroll ownership are renderer concerns.
- Reused existing `getLineIndicesAt(...)` output and row-layout helpers rather than introducing a second active-line resolver.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Focused verification required escalated execution because Vitest needed to spawn `esbuild` outside the sandbox.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- VIEW-01 and VIEW-02 now have implementation and deterministic regression evidence.
- Phase 19-02 can focus on explicit user scroll intent and Back to Live recovery behavior on top of the boundary-aware anchor path.

---
*Phase: 19-song-boundary-visibility-and-live-lock-recovery*
*Completed: 2026-04-09*

## Self-Check: PASSED

- FOUND: `.planning/phases/19-song-boundary-visibility-and-live-lock-recovery/19-01-SUMMARY.md`
- FOUND: `893ea54`
- FOUND: `047d122`
