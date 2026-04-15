# Phase 20 Closure Evidence Ledger

## Automated Safety Gate

### `rtk proxy npm run test -- src/web/fullscreen-lyrics-page.test.tsx`
- Result: pass
- Observed output: 1 test file passed, 37 tests passed, duration 4.48s.

### `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts`
- Result: pass
- Observed output: 6 test files passed, 80 tests passed, duration 2.78s.

### `rtk npm run build`
- Result: pass
- Observed output: Vite build succeeded in 3.01s, output bundle generated, chunk-size warning emitted.

## Manual Fullscreen Runbook

| Scenario | Browser | Viewport Size | Track Title | Spotify Track ID | Evidence | Result |
|---|---|---|---|---|---|---|
| Track start | TBD | TBD | TBD | TBD | TBD | pending |
| Track transition | TBD | TBD | TBD | TBD | TBD | pending |
| Song end | TBD | TBD | TBD | TBD | TBD | pending |
| Final handoff | TBD | TBD | TBD | TBD | TBD | pending |
| Manual browse-away | TBD | TBD | TBD | TBD | TBD | pending |
| Back to Live recovery | TBD | TBD | TBD | TBD | TBD | pending |

## Requirement Coverage

- `SAFE-01`: covered by the targeted safety command `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts` plus `rtk npm run build`.
- `QA-01`: covered by the fullscreen command `rtk proxy npm run test -- src/web/fullscreen-lyrics-page.test.tsx` and the six-scenario manual fullscreen runbook above.

## React act Warning Status

- Checked string: `not wrapped in act`
- Status: not present in raw output for `rtk proxy npm run test -- src/web/fullscreen-lyrics-page.test.tsx`
- Plan 20-01 resolution reference: `.planning/phases/20-viewport-regression-and-timing-safety-closure/20-01-SUMMARY.md` documents the fullscreen harness cleanup and scoped warning handling used to achieve warning-clean runs.

## Residual Risk

- `rtk npm run build` emits the known Vite chunk-size warning for the main JS asset; treated as non-blocking because build exits 0 and this warning predates Phase 20 closure.
