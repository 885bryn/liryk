---
phase: 11-karaoke-motion-and-minimal-overlay-polish
plan: "02"
subsystem: ui
tags: [react, vitest, karaoke, motion, fullscreen]
requires:
  - phase: 11-karaoke-motion-and-minimal-overlay-polish/11-01
    provides: Shell/fullscreen route controls and fullscreen lyric-first baseline.
provides:
  - Center-anchored fullscreen lyric track motion tied to playback progress.
  - Deterministic line transition contracts for transform/opacity/color with reduced-motion safeguards.
  - Regression tests locking motion wrapper transform and line transition tokens.
affects: [phase-11-03-overlay-polish, milestone-v1.2-verification]
tech-stack:
  added: []
  patterns: ["Fullscreen karaoke motion uses a dedicated track wrapper with translateY style anchoring", "Lyric tier transitions include explicit transition tokens plus motion-reduce fallbacks"]
key-files:
  created: [.planning/phases/11-karaoke-motion-and-minimal-overlay-polish/11-02-SUMMARY.md]
  modified: [src/web/fullscreen-lyrics-page.test.tsx, src/web/fullscreen-lyrics-page.tsx]
key-decisions:
  - "Use a full ordered synced lyric track with translateY offset rather than a fixed five-line slice for smoother center-biased progression."
  - "Attach transition and reduced-motion tokens directly to each lyric tier class so motion behavior is testable and accessible."
patterns-established:
  - "Motion contract tests assert both wrapper transform behavior and per-line transition token presence."
  - "Center anchoring derives from active synced index computed from nowPlaying.progressMs."
requirements-completed: [MOT-01, MOT-02]
duration: 1m
completed: 2026-03-21
---

# Phase 11 Plan 02: Karaoke Motion Contracts Summary

**Fullscreen lyrics now render on a center-anchored motion track with explicit tier transition tokens, giving deterministic smooth-step progression contracts for active, near, and distant lines.**

## Performance

- **Duration:** 1m
- **Started:** 2026-03-21T01:28:24Z
- **Completed:** 2026-03-21T01:29:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added TDD motion contract coverage for track-level `translateY(...)` anchoring and transition token requirements.
- Implemented a dedicated `fullscreen-lyrics-track` wrapper with center-biased translate offset from active synced index.
- Added tier transition classes (`transition-[transform,opacity,color]`) and reduced-motion overrides on active/near/distant line nodes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add center-anchor and transition contract tests for fullscreen motion** - `f431c9a` (test)
2. **Task 2: Implement center-biased karaoke track motion and tier transition tokens** - `85cf783` (feat)

## Files Created/Modified
- `src/web/fullscreen-lyrics-page.test.tsx` - Added failing-then-passing motion contract assertions for track transform and transition tokens.
- `src/web/fullscreen-lyrics-page.tsx` - Replaced fixed synced window rendering with a full track wrapper and class-based transition contracts.

## Decisions Made
- Kept motion implementation inside the existing fullscreen component without adding animation libraries.
- Preserved Chinese display fallback contract while changing synced rendering structure to track-based motion.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TDD RED failure occurred as expected because the motion wrapper and transition classes were intentionally absent before Task 2.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MOT-01 and MOT-02 now have implementation and regression coverage.
- Phase 11 Plan 03 can add metadata/progress overlays on top of the stabilized motion contracts.

---
*Phase: 11-karaoke-motion-and-minimal-overlay-polish*
*Completed: 2026-03-21*

## Self-Check: PASSED

- FOUND: `.planning/phases/11-karaoke-motion-and-minimal-overlay-polish/11-02-SUMMARY.md`
- FOUND: `f431c9a`
- FOUND: `85cf783`
