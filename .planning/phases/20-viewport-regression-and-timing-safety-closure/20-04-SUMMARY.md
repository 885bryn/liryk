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
| Track start | TBD | TBD | TBD | TBD | N/A | Not completed in failed run | pending |
| Track transition | TBD | TBD | TBD | TBD | N/A | Not completed in failed run | pending |
| Song end | TBD | TBD | TBD | TBD | N/A | Not completed in failed run | pending |
| Final handoff | TBD | TBD | TBD | TBD | N/A | Not completed in failed run | pending |
| Manual browse-away | TBD | TBD | TBD | TBD | N/A | Not completed in failed run | pending |
| Back to Live recovery | TBD | TBD | TBD | TBD | N/A | Not completed in failed run | pending |
| Sustained mid-song progression (drift check) | Brave | Fullscreen (exact pixel dimensions not captured) | TBD | TBD | >=90s and >=12 transitions | `C:/Users/bryan/Documents/ShareX/Screenshots/2026-04/brave_WBij3i2HxH.png` | fail |

### Manual Verification Outcome (2026-04-15)

- Human verification did not approve Task 2.
- During real playback, the highlighted active lyric remained visibly above the physical screen center and continued to drift upward over sustained progression.
- This reproduces the same unresolved blocker reported earlier; no evidence of drift resolution was observed.
- Screenshot evidence: `C:/Users/bryan/Documents/ShareX/Screenshots/2026-04/brave_WBij3i2HxH.png`.

## Drift Blocker Resolution

- Blocker: active lyric drifted upward over sustained progression in real-browser playback.
- Resolution criterion: sustained runbook row is `pass` with evidence showing no cumulative upward drift and active lyric remains visible.
- Current status: failed manual verification; blocker unresolved.

## Requirement Coverage

| Requirement | Coverage Source | Result |
|---|---|---|
| SAFE-01 | Automated rerun command above | pending |
| QA-01 | Seven-row manual fullscreen runbook above | blocked (sustained drift row failed) |
