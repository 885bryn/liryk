# Phase 20 Gap Closure Evidence Ledger

## Automated Rerun

Run before manual browser verification:

`rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts`

| Timestamp (UTC) | Command | Result | Observed output | Evidence |
|---|---|---|---|---|
| 2026-04-15T23:42:26Z | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts` | pass | 6 files passed; 82 tests passed; duration 3.35s | CLI transcript from Plan 20-06 Task 1 execution |

## Manual Fullscreen Runbook

Complete all rows in a real browser fullscreen session.

| Scenario | Browser | Viewport Size | Track Title | Spotify Track ID | Observation Window | Evidence | Result |
|---|---|---|---|---|---|---|---|
| Track start | TBD (current attempt) | TBD (capture exact pixels) | TBD | TBD | N/A | TBD | pending |
| Track transition | TBD (current attempt) | TBD (capture exact pixels) | TBD | TBD | N/A | TBD | pending |
| Song end | TBD (current attempt) | TBD (capture exact pixels) | TBD | TBD | N/A | TBD | pending |
| Final handoff | TBD (current attempt) | TBD (capture exact pixels) | TBD | TBD | N/A | TBD | pending |
| Manual browse-away | TBD (current attempt) | TBD (capture exact pixels) | TBD | TBD | N/A | TBD | pending |
| Back to Live recovery | TBD (current attempt) | TBD (capture exact pixels) | TBD | TBD | N/A | TBD | pending |
| Sustained mid-song progression (drift check) | TBD (current attempt) | TBD (capture exact pixels) | TBD | TBD | TBD (>=90s and >=12 transitions) | TBD | pending |

### Manual Verification Outcome (Current Attempt)

- Pending Task 2 final real-browser verification.
- Fill all seven rows above with explicit evidence and `pass` or `fail` before updating verification status.

## Drift Blocker Resolution

- Blocker: active lyric drifted upward over sustained progression in real-browser playback.
- Resolution criterion: sustained runbook row is `pass` with evidence showing no cumulative upward drift and active lyric remains visible.
- Current status: pending rerun in this plan.

## Requirement Coverage

| Requirement | Coverage Source | Result |
|---|---|---|
| SAFE-01 | Automated rerun command above | pass |
| QA-01 | Seven-row manual fullscreen runbook above | pending manual sign-off |
