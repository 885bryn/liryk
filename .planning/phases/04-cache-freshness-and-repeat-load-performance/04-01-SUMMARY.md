---
phase: 04-cache-freshness-and-repeat-load-performance
plan: "01"
subsystem: infra
tags: [cache, freshness, lyrics, ttl, file-storage]
requires:
  - phase: 03-03
    provides: Canonical ResolvedLyrics runtime shape and source states
provides:
  - Versioned lyrics cache entry contract with deterministic freshness states
  - File-backed local cache adapter keyed by Spotify track ID
  - Fail-closed validation path for malformed or mismatched cache data
affects: [04-02, runtime, lyrics-resolution]
tech-stack:
  added: []
  patterns: [stale-while-revalidate policy contract, versioned file cache storage]
key-files:
  created:
    - src/core/lyrics/cache-policy.ts
    - src/infra/cache/file-lyrics-cache.ts
  modified:
    - src/core/lyrics/cache-policy.test.ts
    - src/infra/cache/file-lyrics-cache.test.ts
key-decisions:
  - "Keep freshness policy pure in core and keep persistence logic storage-only in infra."
  - "Use shorter TTL windows for not-found cache entries to avoid sticky negative cache behavior."
patterns-established:
  - "Cache policy pattern: validate schema and payload before classifying entry freshness."
  - "Storage adapter pattern: return cache miss on malformed file or schema mismatch instead of throwing."
requirements-completed: [CACH-01, CACH-02]
duration: 12min
completed: 2026-03-20
---

# Phase 4 Plan 01: Cache Foundation Summary

**Versioned lyrics cache policy and file-backed track-id storage now provide deterministic fresh/stale/expired/invalid behavior for fast repeat loads.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-20T01:23:20Z
- **Completed:** 2026-03-20T01:24:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added a shared `LyricsCacheEntry` contract with schema versioning and reusable TTL entry builders.
- Implemented deterministic freshness classification for fresh, stale, expired, and invalid cache states.
- Added a local file-backed cache adapter with `read`, `write`, `delete`, and `clear` methods keyed by Spotify `trackId`.
- Added storage validation so malformed JSON and schema mismatch are treated as cache miss, not runtime failure.

## Task Commits

1. **Task 1: Define cache entry contract and freshness policy** - `e8c04e4` (test), `9102f7b` (feat)
2. **Task 2: Implement a local file-backed lyrics cache adapter** - `7eae4f9` (test), `e024063` (feat)

## Files Created/Modified

- `src/core/lyrics/cache-policy.ts` - Cache schema, TTL policy, entry validation, and freshness evaluator.
- `src/core/lyrics/cache-policy.test.ts` - Coverage for fresh/stale/expired/invalid and negative-cache TTL behavior.
- `src/infra/cache/file-lyrics-cache.ts` - File persistence adapter keyed by track ID with fail-closed load behavior.
- `src/infra/cache/file-lyrics-cache.test.ts` - Coverage for read/write/delete and malformed-file recovery.

## Decisions Made

- Reused canonical `ResolvedLyrics` as cache payload to avoid introducing shape drift between cached and fresh results.
- Kept cache-state evaluation out of persistence adapter so runtime logic consumes one policy source of truth.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Runtime wiring can now consume cache policy and adapter to short-circuit fresh hits and safely revalidate stale entries.

## Self-Check: PASSED
