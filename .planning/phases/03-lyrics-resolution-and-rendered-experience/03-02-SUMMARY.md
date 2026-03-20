---
phase: 03-lyrics-resolution-and-rendered-experience
plan: "02"
subsystem: lyrics
tags: [lrclib, resolver, matcher, scoring]
requires:
  - phase: 03-01
    provides: Shared lyric contracts and normalization/parsing primitives
provides:
  - LRCLIB provider adapter with metadata get/search fallback
  - Deterministic candidate scoring with strict match gates and synced-first tie-breaks
  - Canonical track-level resolver returning synced/plain/low-confidence/not-found states
affects: [03-03, 03-04]
tech-stack:
  added: []
  patterns: [provider adapter normalization, score-then-resolve pipeline]
key-files:
  created:
    - src/infra/providers/lrclib-client.ts
    - src/core/lyrics/lyrics-matcher.ts
    - src/core/lyrics/lyrics-resolver.ts
  modified: []
key-decisions:
  - "Reject candidates that fail strict normalized title + artist alignment before synced preference is applied."
  - "Emit explicit not-found instead of null to keep runtime/UI state deterministic."
patterns-established:
  - "Provider pattern: fetch/normalize/filter only, no scoring in IO adapters."
  - "Resolver pattern: candidate selection returns one canonical source state and line set."
requirements-completed: [LYR-01, LYR-02, LYR-03]
duration: 10min
completed: 2026-03-20
---

# Phase 3 Plan 02: Provider and Resolver Pipeline Summary

**LRCLIB responses now flow through a strict matcher into one canonical resolved lyric result with synced-first and explicit not-found behavior.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-20T00:30:00Z
- **Completed:** 2026-03-20T00:32:40Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Implemented `createLrclibClient` with `/api/get` lookup, `/api/search` fallback, and candidate normalization.
- Added candidate usability filtering before scoring to avoid garbled lyric payloads entering selection.
- Implemented matcher scoring with strict normalized title/artist gates, duration penalties, and synced tie-break behavior.
- Implemented resolver to return deterministic `synced`, `plain`, `low-confidence`, and `not-found` outputs.

## Task Commits

1. **Task 1: Implement LRCLIB adapter with normalized candidate output** - `d260cc3` (test), `82723a0` (feat)
2. **Task 2: Score candidates and resolve one canonical lyrics result** - `ed64e28` (test), `e8ab927` (feat)

## Files Created/Modified
- `src/infra/providers/lrclib-client.ts` - LRCLIB metadata lookup/search adapter and candidate normalization.
- `src/core/lyrics/lyrics-matcher.ts` - Candidate scoring and deterministic best-candidate selection.
- `src/core/lyrics/lyrics-resolver.ts` - End-to-end resolution orchestration from provider candidates to canonical result.
- `src/infra/providers/lrclib-client.test.ts` - Provider adapter behavior tests.
- `src/core/lyrics/lyrics-matcher.test.ts` - Matching and synced-first decision tests.
- `src/core/lyrics/lyrics-resolver.test.ts` - Resolver state output tests.

## Decisions Made
- Kept scoring as a pure domain function and resolver as orchestration glue to preserve testability.
- Marked risky-but-acceptable results as `low-confidence` instead of suppressing lyrics outright.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 can wire resolver outputs into store/runtime state with explicit retry and not-found handling.

## Self-Check: PASSED
