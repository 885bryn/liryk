# 14-02 Baseline Drift Diagnostics Verification (DBG-01)

## Purpose

Establish a repeatable baseline for diagnostics behavior before early cueing work. This runbook is the quality gate for CUE-01.

## Prerequisites

- Branch contains `14-02` changes, including:
  - `src/app/live-sync-runtime.test.ts`
  - `src/web/fullscreen-lyrics-page.test.tsx`
- Node dependencies installed (`npm ci` or `npm install` completed).
- Spotify auth environment already configured for local playback checks.

## Automated Gate Commands

Run exactly:

```bash
npm run test -- src/app/live-sync-runtime.test.ts src/web/fullscreen-lyrics-page.test.tsx
npm run build
```

## Expected Automated Outcomes

1. Runtime diagnostics stability checks pass in `src/app/live-sync-runtime.test.ts`:
   - In-band drift convergence remains bounded and stays in `estimated` correction state.
   - Large no-change drift flips diagnostics to `hard-reset` with zero post-reset delta.
2. Fullscreen overlay diagnostics checks pass in `src/web/fullscreen-lyrics-page.test.tsx`:
   - Overlay toggle remains deterministic and does not break lyric hierarchy.
   - Diagnostics values remain readable for idle, paused, and playing states.
3. Production build succeeds (`npm run build`).

## Manual Playback Checklist (Drift Source Identification)

1. Start app locally and open fullscreen lyrics view.
2. Start Spotify playback on a timestamped track.
3. Toggle diagnostics overlay (`Show Diagnostics`).
4. Observe field behavior for at least 30 seconds:
   - `Estimated ms` should advance smoothly between polls.
   - `Polled ms` should step with polling cadence.
   - `Drift delta ms` should trend toward zero during minor drift.
   - `Correction state` should remain `estimated` for in-band corrections and only show `hard-reset` when drift is clearly large.
5. Pause and resume playback once:
   - Overlay remains readable and values update deterministically.

## DBG-01 Evidence Mapping

- **Toggleable diagnostics overlay:** `src/web/fullscreen-lyrics-page.tsx`, validated by `src/web/fullscreen-lyrics-page.test.tsx`.
- **Estimated vs polled vs drift vs correction fields:** `src/app/live-sync-runtime.ts`, `src/state/playback/live-sync-store.ts`, validated by `src/app/live-sync-runtime.test.ts`.
- **Safe idle/transition behavior:** `src/app/live-sync-runtime.test.ts`, `src/web/fullscreen-lyrics-page.test.tsx`.

## CUE-01 Gate

Early cueing work in `14-03` is allowed only when all items below are true:

- Automated commands in this document pass with no test/build failures.
- Manual checklist confirms diagnostics behavior is interpretable and stable.
- No unexplained diagnostics regressions are observed.

If any item fails, treat CUE-01 as blocked and fix baseline diagnostics first.
