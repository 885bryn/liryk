# Phase 08 Research: Live Playback and Lyrics Data Flow Hardening

**Date:** 2026-03-20
**Status:** Complete
**Scope:** WEB-04, LYR-WEB-01, LYR-WEB-02

## Inputs Reviewed

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/07.1-wire-end-to-end-web-auth-flow-connect-redirect-callback-token-restore-verify-localhost-env-redirect-alignment-and-add-a-real-connection-to-now-playing-verification-path/07.1-03-SUMMARY.md`
- `.planning/phases/07-web-lyrics-experience-parity-and-state-polish/07-02-SUMMARY.md`
- `.planning/phases/03-lyrics-resolution-and-rendered-experience/03-04-SUMMARY.md`
- `src/web/app-shell.tsx`
- `src/web/auth/now-playing.ts`
- `src/web/auth/now-playing.test.ts`
- `src/core/lyrics/unicode-normalization.ts`
- `src/core/lyrics/lyrics-resolver.ts`
- `src/state/playback/live-sync-store.ts`

## Discovery Level

**Level 0 (skip deep external discovery)**

Reasoning:
- No new external providers or SDKs are required.
- Existing project stack already contains runtime polling, lyric resolution, and panel contracts.
- Phase 8 is reliability hardening and integration completion on existing contracts.

## Current Flow Observations

1. `AppShell` polls now-playing data every 1000ms and resolves lyrics by track identity.
2. `fetchWebNowPlaying` already falls back from `/currently-playing` to `/me/player` when 204 is returned.
3. Lyrics matching already strips common remaster/live suffixes via `normalizeForMatch`, but web-side metadata shaping is still minimal.
4. Shell rendering computes active/next lines from synchronized lyric timestamps and currently reported progress.

## Risks and Gaps to Close

- **Metadata completeness risk:** Web now-playing payload currently exposes only `trackId`, `title`, first `artist`, and `progressMs`; missing metadata like album/duration can reduce resolver confidence and remaster-variant matching reliability.
- **Stability risk for status messaging:** Current shell status text flips between resolving/ready/not-found without explicit contract tests for polling transitions and paused playback edge cases.
- **Regression risk in active/next updates:** Active/next line behavior is computed in shell; without explicit cadence-focused tests, regressions could reintroduce stale or stuck line updates.

## Recommended Implementation Approach

### 1) Strengthen web now-playing contract before UI wiring

- Extend `WebNowPlaying` to include richer lyric metadata inputs (`album`, `durationMs`, `artists`, `capturedAtMs`) while preserving existing required fields.
- Add normalization helper(s) for title variants used in matching (for example preserving raw display title and deriving a normalized lookup title where needed).
- Expand `now-playing` tests to lock fallback, parse behavior, and edge-case responses (204, malformed payload, missing item fields).

### 2) Harden lyric resolution input mapping and not-found behavior

- Route web resolver calls through explicit metadata mapping with deterministic values for title/artist/album/duration where present.
- Keep explicit fallback behavior (`sourceState: not-found`, `renderMode: plain-static`) and test it for resolver failure and no-candidate paths.
- Add tests covering remaster-title inputs from now-playing metadata to ensure resolver receives match-friendly values.

### 3) Lock shell behavior for live line progression and rail messaging

- Add app-shell tests that assert active/next lyric line transitions across progress updates while playback remains active.
- Add tests for status rail copy/variant in key transitions: resolving -> ready, ready -> not-found, playing -> paused.
- Preserve existing responsive/layout contracts from Phase 6 and parity markers from Phase 7.

## Do Not Hand-Roll

- Do not introduce a new global store for web-only playback/lyrics status.
- Do not duplicate lyric-matching normalization logic in ad hoc JSX branches.
- Do not replace current provider integration (`createLrclibClient` + `resolveLyricsForTrack`) with custom fetch pipelines.

## Common Pitfalls

- Polling cadence updates that trigger repeated lyric re-resolution for unchanged track IDs.
- Status rail copy drift between source states and playback states.
- Using only display title for matching when metadata includes variant suffixes.
- Tests that assert only happy-path rendering and miss failure/not-found transitions.

## Validation Architecture

Validation for Phase 8 should prove data flow from Spotify playback through resolver input to shell rendering:

1. **Now-playing contract coverage**
   - `npm test -- src/web/auth/now-playing.test.ts`
   - Assert fallback behavior and metadata parse invariants.

2. **Shell data-flow and state rendering coverage**
   - `npm test -- src/web/app-shell.test.tsx src/web/auth/local-verification-path.test.tsx`
   - Assert now-playing metadata visibility, status rail behavior, and live active/next line transitions.

3. **Resolver and matching confidence guardrails**
   - `npm test -- src/core/lyrics/lyrics-resolver.test.ts src/core/lyrics/lyrics-matcher.test.ts`
   - Assert remaster/live suffix matching remains accepted for real now-playing metadata variants.

4. **Build validity**
   - `npm run build`

5. **Requirement traceability checks**
   - WEB-04: connected playback metadata appears within polling cadence.
   - LYR-WEB-01: remaster-title variants resolve or explicit not-found is rendered.
   - LYR-WEB-02: active/next lyric lines update while playback progresses.

## Plan Implications

- Use three execute plans:
  1. now-playing contract hardening + tests,
  2. lyrics resolution metadata/fallback hardening,
  3. shell live-line/status verification + phase checkpoint artifact.
- Keep plans sequential where they share `src/web/app-shell.tsx`; parallelize only where file ownership is disjoint.
