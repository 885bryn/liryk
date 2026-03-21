# Phase 16 Validation Runbook

This runbook captures repeatable evidence for MOT-06, TRN-02, and VIS-04 after plans 16-01 through 16-03.

## Prerequisites

- Node dependencies installed (`npm install` completed)
- Workspace at repository root
- No required external credentials for automated checks
- For manual playback verification: valid Spotify session and a currently playing track with synced lyrics

## Automated Validation Commands

Run from repository root:

```bash
npm run test -- src/core/sync/lyric-motion-window.test.ts src/web/fullscreen-lyrics-page.test.tsx
npm run build
```

## Expected Automated Outcomes

- `lyric-motion-window` tests pass, including easing bounds, settle boundaries, and target-offset interpolation checks
- `fullscreen-lyrics-page` tests pass, including short-gap smoothness, long-gap hold behavior, and exact complete-phase landing
- `npm run build` completes successfully with no motion-contract regressions

## Requirement Traceability

| Requirement | Evidence Files | Verification Command | Expected Signal |
| --- | --- | --- | --- |
| MOT-06 | `src/core/sync/lyric-motion-window.ts`, `src/core/sync/lyric-motion-window.test.ts`, `src/web/fullscreen-lyrics-page.test.tsx` | `npm run test -- src/core/sync/lyric-motion-window.test.ts src/web/fullscreen-lyrics-page.test.tsx` | Complete-phase assertions land exactly on next-line offset with no residual drift |
| TRN-02 | `src/core/sync/lyric-motion-window.ts`, `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx` | `npm run test -- src/core/sync/lyric-motion-window.test.ts src/web/fullscreen-lyrics-page.test.tsx` | Short gaps stay smooth within adjacent bounds and long gaps remain stable until transition window |
| VIS-04 | `src/core/sync/lyric-motion-window.ts`, `src/core/sync/lyric-motion-window.test.ts`, `src/web/fullscreen-lyrics-page.test.tsx` | `npm run test -- src/core/sync/lyric-motion-window.test.ts src/web/fullscreen-lyrics-page.test.tsx` | Easing remains bounded and monotonic with no overshoot or bounce artifacts |

## Manual Playback Checklist (Fullscreen)

1. Start app and open `http://localhost:5173/fullscreen`.
2. Play a track with synced lyrics and observe one short-gap line change.
3. Confirm short-gap movement is compact and smooth (no jump, no bounce).
4. Observe one long-gap line change and confirm line holds steady until late transition start.
5. Confirm each line handoff settles exactly into the next resting position with no residual drift.
6. Confirm readability remains stable during hold periods before transitions.
