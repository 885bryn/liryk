---
phase: 20
slug: viewport-regression-and-timing-safety-closure
status: final
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-15
---

# Phase 20 Validation Runbook

This runbook is the reproducible closure gate for viewport regressions and timing safety in Phase 20.

## Automated Safety Gate

Run these commands in order and record results in `20-02-SUMMARY.md`.

1. `rtk proxy npm run test -- src/web/fullscreen-lyrics-page.test.tsx`
2. `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts`
3. `rtk npm run build`

Latest execution (2026-04-15):
- `rtk proxy npm run test -- src/web/fullscreen-lyrics-page.test.tsx` -> pass (1 file, 37 tests)
- `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts` -> pass (6 files, 80 tests)
- `rtk npm run build` -> pass (Vite build succeeded; known chunk-size warning only)

Expected outcomes:
- Fullscreen regression command passes and remains warning-clean for React `act` output.
- Targeted safety command passes across playback-clock, timeline, sync engine, motion window, and live runtime contracts.
- Build command exits 0. A known Vite chunk-size warning may appear and is tracked as non-blocking residual risk.

## React act Warning Policy

The raw output from `rtk proxy npm run test -- src/web/fullscreen-lyrics-page.test.tsx` must not contain `not wrapped in act`.

If `not wrapped in act` appears, execution must either:
- fix the fullscreen test harness so the warning is removed, or
- record the exact non-blocking reason in `20-02-SUMMARY.md` under `## React act Warning Status` before closure sign-off.

## Requirement Traceability

| Requirement | Coverage | Evidence Command | Artifact |
|---|---|---|---|
| SAFE-01 | Timing safety and motion contracts remain green with viewport fixes | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts` | `.planning/phases/20-viewport-regression-and-timing-safety-closure/20-02-SUMMARY.md` |
| QA-01 | Fullscreen regression test plus manual browser runbook cover boundary and recovery flows | `rtk proxy npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | `.planning/phases/20-viewport-regression-and-timing-safety-closure/20-02-SUMMARY.md` |

## Manual Fullscreen Runbook

Use a real browser fullscreen session and complete all seven scenarios.

Execute scenarios in this exact order:
1. Track start
2. Track transition
3. Song end
4. Final handoff
5. Manual browse-away
6. Back to Live recovery
7. Sustained mid-song progression (drift check)

| Scenario | Setup | Action | Expected Result | Evidence |
|---|---|---|---|---|
| Track start | Open fullscreen lyrics on a synced track before first lyric timestamp. | Start playback and wait for first active synced line. | Highlighted line appears inside viewport; live lock remains engaged; no clipping above top edge. | Browser, viewport size, track title, Spotify track ID, screenshot/video link, pass/fail. |
| Track transition | Queue another synced track while fullscreen remains open. | Trigger track change and observe first active line in new track. | First active line of next track remains visible inside viewport after transition. | Browser, viewport size, track title, Spotify track ID, screenshot/video link, pass/fail. |
| Song end | Use a synced track and seek near last synced lyric. | Play through final synced lyric window. | Last highlighted synced line stays inside viewport through end timing window. | Browser, viewport size, track title, Spotify track ID, screenshot/video link, pass/fail. |
| Final handoff | Stay on same track after last synced timestamp. | Observe handoff beyond final lyric timestamp. | Final handoff state keeps end lyric visible and stable; no jump off-screen. | Browser, viewport size, track title, Spotify track ID, screenshot/video link, pass/fail. |
| Manual browse-away | While live lock is active, ensure content is centered on live anchor. | Intentionally wheel or touch scroll away from live anchor. | Live lock disengages only after explicit user intent and Back to Live appears. | Browser, viewport size, track title, Spotify track ID, screenshot/video link, pass/fail. |
| Back to Live recovery | Begin from a manual browse-away state with Back to Live visible. | Click Back to Live. | Live lock re-engages and highlighted line returns to boundary-aware live anchor. | Browser, viewport size, track title, Spotify track ID, screenshot/video link, pass/fail. |
| Sustained mid-song progression (drift check) | Open a synced track in fullscreen at least 30 seconds before the midpoint. | Observe playback for >=90 seconds spanning >=12 lyric transitions while live lock stays on. | Active lyric remains visible and centered within tolerance with no cumulative upward drift over the observation window. | Browser, viewport size, track title, Spotify track ID, observation window, screenshot/video link, pass/fail. |

## Evidence Capture Fields

For each automated command and manual scenario, capture:
- Timestamp (UTC)
- Executor initials
- Command or scenario label
- Browser
- Viewport dimensions (exact pixels)
- Track title
- Spotify track ID
- Observation window (`N/A` for non-sustained scenarios)
- Result (`pass|fail`)
- Observed output (test count, build status, warning text, or viewport observation)
- Evidence path/URI (console transcript path, screenshot URI, or recording URI)
- Notes and follow-up (if any)
