# Milestones

## v1.6 Developer Activity Panel (Shipped: 2026-04-19)

**Phases completed:** 2 phases (21–22), 3 plans, all requirements satisfied (9/9)  
**Timeline:** 2026-04-17 → 2026-04-19 (3 days)  
**TypeScript LOC:** 16,217

**Delivered:** A toggleable in-fullscreen developer overlay wired to all real runtime events — lyrics fetch, Spotify sync, playback clock, and auth/connection — so the developer can trace a complete operational cycle without leaving fullscreen mode.

**Key accomplishments:**

- `useDevActivityLog` 150-entry ring-buffer hook with stable `append` callback and `DevActivityPanel` scroll-isolated component with auto-scroll, pause/resume, and per-category color tints (Phase 21)
- Panel and toggle button wired inside the fullscreen root — scroll events blocked from lyric viewport, preserving live lock throughout (Phase 21)
- Auth/connection events emitted via sentinel-ref change detection (token refresh, connect/disconnect/waiting) — DEV-07 (Phase 21)
- Lyrics fetch lifecycle events: cache hit / live fetch with provider / low-confidence / not-found labels — DEV-04 (Phase 22)
- Spotify sync events: track-changed, playback-resumed, playback-paused, no-active-playback — DEV-05 (Phase 22)
- Playback clock hard reset events with drift-delta label on track ID change — DEV-06, completing the full operational tracing loop (Phase 22)

**Archive:** `milestones/v1.6-ROADMAP.md`, `milestones/v1.6-REQUIREMENTS.md`

---

## Latest Completed

### v1.4 Stable Line-Change Motion Model

- Completed: 2026-04-09
- Status: Shipped with deferred tech debt
- Scope: Phases 15-17
- Archive: `milestones/v1.4-ROADMAP.md`
- Requirements archive: `milestones/v1.4-REQUIREMENTS.md`

Delivered:

- Adaptive hold-transition-settle motion in fullscreen lyrics
- Calm eased interpolation with exact settled landing
- Centralized transition-window timing defaults and regression coverage

Known gaps accepted at close:

- Deferred `16-03` final quality gate and manual fullscreen playback checkpoint
- Deferred `VIS-05` neighboring-line visual continuity work
- Deferred `SAFE-01` timing-guardrail regression proof for the motion refactor

## Prior Milestones

- v1.3: playback-clock backbone, poll safety, drift reconciliation, diagnostics, and early cueing
- v1.2: immersive fullscreen lyrics delivery
- v1.1: web runtime/auth hardening and lyrics parity work
- v1.0: Spotify connection, live playback sync, lyrics resolution, and cache foundation
