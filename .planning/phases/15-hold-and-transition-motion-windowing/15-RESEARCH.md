# Phase 15 Research: Hold-and-Transition Motion Windowing

**Date:** 2026-03-20
**Phase:** 15
**Requirements:** MOT-04, MOT-05, TRN-01

## Scope

Phase 15 introduces a hold-and-transition motion model for fullscreen synced lyrics: keep the active line visually anchored for most of each line interval, then move only inside a short pre-change window that adapts to per-line timing gaps.

## Existing Code Reality (Relevant Baseline)

- `src/web/fullscreen-lyrics-page.tsx` currently derives `activeSyncedIndex` from cue-adjusted progress and always sets track offset with `syncedTrackTranslateY = -activeSyncedRenderIndex * 88px`.
- Because offset snaps to active index, motion starts at line activation rather than near next-line boundary; there is no hold window model yet.
- `src/core/sync/early-cue.ts` is already isolated as a pure timing helper pattern and should remain separate from motion timing contracts.
- `src/web/fullscreen-lyrics-page.test.tsx` includes transition token and transform assertions, but not window-phase behavior (hold vs transition phase).

## Recommended Technical Direction

1. Introduce pure transition-window contracts in `src/core/sync`:
   - `getAdaptiveTransitionMs(gapMs, minMs, maxMs, fraction)`
   - `getTransitionPhase(progressMs, currentStartMs, nextStartMs, config)` returning deterministic phase values.
2. Refactor fullscreen track offset to interpolate from current active line to next line only during transition phase:
   - Hold phase: offset remains locked to current line anchor.
   - Transition phase: offset lerps from current index to next index over adaptive duration.
3. Export readable defaults/constants from the same motion module so behavior tuning is centralized and tests can lock clamp behavior.

## File Targets

- `src/core/sync/lyric-motion-window.ts`
- `src/core/sync/lyric-motion-window.test.ts`
- `src/web/fullscreen-lyrics-page.tsx`
- `src/web/fullscreen-lyrics-page.test.tsx`

## Risks and Pitfalls

- Boundary ambiguity (`progressMs` exactly at transition start or next start) can create one-frame jitter unless phase contract is explicit and tested.
- Very short/long lyric gaps can feel jumpy or sluggish without strict min/max clamp policy.
- Blending cue activation and motion window logic in one helper can conflate concerns; keep cue selection and motion interpolation separate.

## Testing Strategy

- Add deterministic unit coverage for adaptive transition duration and phase boundaries (before window, inside window, after next start).
- Add fullscreen regression tests proving hold behavior before window and transition-only movement within window.
- Keep existing hierarchy and transition token assertions intact to avoid regressions in current visual contracts.

## Validation Architecture

- Framework: Vitest
- Fast loop command: `npm run test -- src/core/sync/lyric-motion-window.test.ts src/web/fullscreen-lyrics-page.test.tsx`
- Full phase gate command: `npm test`
- Build gate: `npm run build`
- Nyquist expectation: each plan task provides an automated verification command; helper and UI wiring tasks must have deterministic tests before build gate.
