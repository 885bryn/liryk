# Phase 12 Research: Playback Clock Backbone and Poll Safety

**Date:** 2026-03-21
**Phase:** 12
**Requirements:** CLK-01, CLK-02

## Scope

Phase 12 should stabilize playback timing between Spotify polls and guarantee stale overlapping poll completions cannot regress track/progress state.

## Existing Code Reality (Relevant Baseline)

- `src/app/playback-runtime.ts` already tracks `requestCounter` and `latestResolvedRequest` to drop out-of-order poll completions.
- `src/core/playback/types.ts` has freshness ordering via `isNewerSnapshot(current, incoming)` using `capturedAtMs`, then `trackId`, then `progressMs`.
- `src/core/sync/lyric-sync-engine.ts` already estimates progress from an anchor (`capturedAtPerfMs`) and reanchors on trusted snapshots.
- `src/app/live-sync-runtime.ts` updates line indices/confidence from `estimateFrame()`, but does not expose an explicit anchor-backed estimated-progress contract for downstream lyric timing consumers.

## Recommended Technical Direction

1. Extract a dedicated playback clock contract in `core/playback`:
   - Anchor shape with source sample metadata and local monotonic timestamp.
   - Pure estimator utility (`estimateProgressMs(anchor, nowPerfMs)`) for deterministic tests.
2. Integrate that contract into runtime/store read model so consumers can read estimated progress without waiting for next poll.
3. Harden overlap safety by codifying trusted-snapshot application rules and adding race-focused tests that cover completion order regressions.

## File Targets

- `src/core/playback/playback-clock.ts`
- `src/core/playback/playback-clock.test.ts`
- `src/state/playback/live-sync-store.ts`
- `src/state/playback/live-sync-store.test.ts`
- `src/app/live-sync-runtime.ts`
- `src/app/live-sync-runtime.test.ts`
- `src/app/playback-runtime.ts`
- `src/app/playback-runtime.test.ts`
- `.planning/phases/12-playback-clock-backbone-and-poll-safety/12-03-VERIFICATION.md`

## Risks and Pitfalls

- Duplicate timing authority between sync-engine internals and store-level estimated progress can drift if both are not fed from the same trusted sample rule.
- Race-safety assumptions can appear correct in unit tests unless async completion order is explicitly inverted in fixtures.
- Introducing non-monotonic time sources (e.g., `Date.now`) can create flaky tests and regressions; use injected monotonic perf-clock functions.

## Testing Strategy

- Add deterministic unit tests for playback-clock estimator math and pause behavior.
- Extend runtime tests with explicit deferred promises for overlap ordering.
- Verify store/runtime surfaces include estimated progress values observable by lyric consumers.

## Validation Architecture

- Framework: Vitest
- Fast loop command: `npm run test -- src/core/playback/playback-clock.test.ts src/app/playback-runtime.test.ts src/app/live-sync-runtime.test.ts src/state/playback/live-sync-store.test.ts`
- Full phase gate command: `npm test`
- Build gate: `npm run build`
- Nyquist expectation: every task includes an automated command under 60s for fast loop checks, and plan-level full-suite/build checks before phase verification.
