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
| Track start | Fullscreen real-browser session (manual checkpoint) | Not captured in checkpoint response | Not captured in checkpoint response | Not captured in checkpoint response | N/A | User reported only final row failed | pass |
| Track transition | Fullscreen real-browser session (manual checkpoint) | Not captured in checkpoint response | Not captured in checkpoint response | Not captured in checkpoint response | N/A | User reported only final row failed | pass |
| Song end | Fullscreen real-browser session (manual checkpoint) | Not captured in checkpoint response | Not captured in checkpoint response | Not captured in checkpoint response | N/A | User reported only final row failed | pass |
| Final handoff | Fullscreen real-browser session (manual checkpoint) | Not captured in checkpoint response | Not captured in checkpoint response | Not captured in checkpoint response | N/A | User reported only final row failed | pass |
| Manual browse-away | Fullscreen real-browser session (manual checkpoint) | Not captured in checkpoint response | Not captured in checkpoint response | Not captured in checkpoint response | N/A | User reported only final row failed | pass |
| Back to Live recovery | Fullscreen real-browser session (manual checkpoint) | Not captured in checkpoint response | Not captured in checkpoint response | Not captured in checkpoint response | N/A | Baseline scenario passed, but sustained-run follow-up showed recentering to an already drifted off-screen active lyric | pass |
| Sustained mid-song progression (drift check) | Fullscreen real-browser session (manual checkpoint) | Not captured in checkpoint response | Not captured in checkpoint response | Not captured in checkpoint response | >=90s and >=12 transitions (manual sustained run) | User failure report during Task 2: active lyric keeps drifting upward until it leaves the viewport | fail |

### Manual Verification Outcome (Current Attempt)

- Final human verification result: FAILED.
- Failing row: `Sustained mid-song progression (drift check)`.
- Observed behavior: during real playback, the active lyric continues drifting upward until it goes off-screen.
- Additional blocker detail: pressing `Back to Live` recenters to the already-wrong off-screen live position instead of restoring a true centered live anchor.
- QA-01 remains blocked for this attempt.

## Drift Blocker Resolution

- Blocker: active lyric drifted upward over sustained progression in real-browser playback.
- Resolution criterion: sustained runbook row is `pass` with evidence showing no cumulative upward drift and active lyric remains visible.
- Current status: unresolved after Task 2 checkpoint failure in Plan 20-06.

## Requirement Coverage

| Requirement | Coverage Source | Result |
|---|---|---|
| SAFE-01 | Automated rerun command above | pass |
| QA-01 | Seven-row manual fullscreen runbook above | fail (sustained drift persists; Back to Live recentering follows wrong drifted anchor) |
