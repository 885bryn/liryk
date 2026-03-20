---
phase: 03-lyrics-resolution-and-rendered-experience
plan: "01"
subsystem: lyrics
tags: [lyrics, lrc, unicode, i18n, parsing]
requires: []
provides:
  - Canonical lyric contracts for synced and plain rendering flows
  - Deterministic LRC parsing with stable ordering and NFC text normalization
  - Unicode helpers for matching, mojibake rejection, direction metadata, and Chinese display normalization
affects: [03-02, 03-03, 03-04]
tech-stack:
  added: []
  patterns: [TDD red-green commits, deterministic lyric line shaping]
key-files:
  created:
    - src/core/lyrics/types.ts
    - src/core/lyrics/lrc-parser.ts
    - src/core/lyrics/plain-lyrics-timing.ts
    - src/core/lyrics/unicode-normalization.ts
  modified: []
key-decisions:
  - "Use a single ResolvedLyricLine shape for both synced and plain-static rendering paths."
  - "Normalize Chinese display output to Simplified in Phase 3 while preserving non-Chinese glyphs."
patterns-established:
  - "Parser pattern: parse then stable-sort by timestamp with source-order tie breaks."
  - "Normalization pattern: NFC + suffix trimming for comparison, separate display normalization for rendering."
requirements-completed: [LYR-03, I18N-01]
duration: 12min
completed: 2026-03-20
---

# Phase 3 Plan 01: Core Lyric Contracts and Text Primitives Summary

**Canonical synced/plain lyric contracts now feed a deterministic parser and multilingual normalization layer that later plans can consume directly.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-20T00:27:00Z
- **Completed:** 2026-03-20T00:29:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added shared lyric domain contracts covering provider candidates, resolved lines, source states, and render modes.
- Implemented `parseLrc` for `[mm:ss.xx]` and `[mm:ss.xxx]` lines with NFC normalization and stable duplicate handling.
- Implemented plain fallback line shaping with `plain-static` mode and no synthetic timing.
- Added multilingual helpers for matching normalization, mojibake filtering, line direction, and Simplified Chinese display output.

## Task Commits

1. **Task 1: Define lyric contracts, parse synced LRC, and prepare plain fallback lines** - `d050a43` (test), `2a905de` (feat)
2. **Task 2: Add Unicode-safe normalization, mojibake detection, and direction helpers** - `e3121f9` (test), `e6bafbe` (feat)

## Files Created/Modified
- `src/core/lyrics/types.ts` - Shared lyric contracts consumed by provider, resolver, runtime, and UI layers.
- `src/core/lyrics/lrc-parser.ts` - LRCLIB-style synced lyric parsing into timeline-ready line objects.
- `src/core/lyrics/plain-lyrics-timing.ts` - Plain-lyrics fallback line shaping for static rendering mode.
- `src/core/lyrics/unicode-normalization.ts` - Match normalization, unusable-text checks, direction derivation, Chinese display normalization.
- `src/core/lyrics/lrc-parser.test.ts` - Synced parser behavior coverage.
- `src/core/lyrics/plain-lyrics-timing.test.ts` - Plain fallback shaping coverage.
- `src/core/lyrics/unicode-normalization.test.ts` - i18n normalization and direction coverage.

## Decisions Made
- Kept one canonical resolved line shape with optional display/direction metadata to avoid format drift across layers.
- Treated garbled payload detection as a domain guard before resolver selection.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 can consume the shared types and normalization helpers for LRCLIB candidate scoring and resolver decisions.

## Self-Check: PASSED
