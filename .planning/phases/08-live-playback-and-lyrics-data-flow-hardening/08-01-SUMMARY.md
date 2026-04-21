---
phase: 08-live-playback-and-lyrics-data-flow-hardening
plan: "01"
subsystem: lyrics
tags: [unicode, chinese-normalization, vitest]
requires:
  - phase: 03-lyrics-resolution-and-rendering-mode-polish
    provides: normalizeChineseForDisplay helper used by lyric rendering
provides:
  - Deterministic Traditional-to-Simplified mapping contract for required Chinese glyphs
  - Mixed-script preservation guarantees for numbers, latin text, punctuation, and emoji
affects: [lyrics-rendering, synced-lyrics, plain-lyrics]
tech-stack:
  added: []
  patterns: [character-by-character Chinese display normalization with explicit map keys]
key-files:
  created: []
  modified: [src/core/lyrics/unicode-normalization.test.ts, src/core/lyrics/unicode-normalization.ts]
key-decisions:
  - Keep conversion deterministic through explicit per-character map entries only.
patterns-established:
  - "Conversion contract first: lock required glyph behavior in tests before map updates."
requirements-completed: [CHN-02]
duration: 5min
completed: 2026-03-20
---

# Phase 08 Plan 01: Conversion Contract Summary

**Traditional-to-Simplified lyric conversion now covers required glyphs with explicit mixed-content preservation guarantees.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-20T23:00:43Z
- **Completed:** 2026-03-20T23:05:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added deterministic conversion contract tests for `愛`, `臺`, `風`, `裡`, `歡`, `臨`, and `說`.
- Locked mixed-content preservation with `2026! ABC` and punctuation/emoji coverage.
- Expanded the Unicode normalizer map without changing non-Chinese normalization helpers.

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand failing conversion-contract tests for Traditional Chinese inputs** - `a3d9f59` (test)
2. **Task 2: Implement deterministic mapping expansion in unicode normalizer** - `db3ed06` (feat)

## Files Created/Modified

- `src/core/lyrics/unicode-normalization.test.ts` - Adds explicit conversion and preservation assertions for the phase contract.
- `src/core/lyrics/unicode-normalization.ts` - Extends `TRADITIONAL_TO_SIMPLIFIED` with required deterministic mappings.

## Decisions Made

- Keep conversion behavior map-driven and character-level so mixed-script text remains unchanged outside mapped Chinese glyphs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Chinese normalization contract for CHN-02 is locked and passing.
- Ready to wire normalization through playback and lyrics data flow tasks in remaining phase 08 plans.

## Self-Check: PASSED

- Verified summary file exists.
- Verified task commits `a3d9f59` and `db3ed06` exist in git history.

---
*Phase: 08-live-playback-and-lyrics-data-flow-hardening*
*Completed: 2026-03-20*
