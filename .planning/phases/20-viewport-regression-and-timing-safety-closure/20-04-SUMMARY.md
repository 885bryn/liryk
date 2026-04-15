# Phase 20 Gap Closure Evidence Ledger

## Automated Rerun

Run before manual browser verification:

`rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts`

| Timestamp (UTC) | Command | Result | Observed output | Evidence |
|---|---|---|---|---|
| TBD | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts` | pass/fail | TBD | TBD |

## Manual Fullscreen Runbook

Complete all rows in a real browser fullscreen session.

| Scenario | Browser | Viewport Size | Track Title | Spotify Track ID | Observation Window | Evidence | Result |
|---|---|---|---|---|---|---|---|
| Track start | TBD | TBD | TBD | TBD | N/A | TBD | pass/fail |
| Track transition | TBD | TBD | TBD | TBD | N/A | TBD | pass/fail |
| Song end | TBD | TBD | TBD | TBD | N/A | TBD | pass/fail |
| Final handoff | TBD | TBD | TBD | TBD | N/A | TBD | pass/fail |
| Manual browse-away | TBD | TBD | TBD | TBD | N/A | TBD | pass/fail |
| Back to Live recovery | TBD | TBD | TBD | TBD | N/A | TBD | pass/fail |
| Sustained mid-song progression (drift check) | TBD | TBD | TBD | TBD | >=90s and >=12 transitions | TBD | pass/fail |

## Drift Blocker Resolution

- Blocker: active lyric drifted upward over sustained progression in real-browser playback.
- Resolution criterion: sustained runbook row is `pass` with evidence showing no cumulative upward drift and active lyric remains visible.
- Current status: pending manual verification.

## Requirement Coverage

| Requirement | Coverage Source | Result |
|---|---|---|
| SAFE-01 | Automated rerun command above | pending |
| QA-01 | Seven-row manual fullscreen runbook above | pending |
