# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-19)

**Core value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.
**Current focus:** Phase 2 - Live Playback Sync Engine

## Current Position

Phase: 2 of 4 (Live Playback Sync Engine)
Plan: 1 of TBD in current phase
Status: In Progress
Last activity: 2026-03-20 - Completed 01-04 runtime wiring for OAuth connect/callback and startup bootstrap

Progress: [###-------] 25%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 4.8 min
- Total execution time: 0.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Spotify Connection Foundation | 4 | 19 min | 4.8 min |
| 2. Live Playback Sync Engine | 0 | 0 min | 0 min |
| 3. Lyrics Resolution and Rendered Experience | 0 | 0 min | 0 min |
| 4. Cache Freshness and Repeat-Load Performance | 0 | 0 min | 0 min |

**Recent Trend:**
- Last 5 plans: Phase 01 P01 (4 min, 2 tasks, 7 files) | Phase 01 P02 (3 min, 3 tasks, 7 files) | Phase 01 P03 (4 min, 3 tasks, 7 files) | Phase 01 P04 (8 min, 3 tasks, 6 files)
- Trend: Stable

## Accumulated Context

### Decisions

Decisions are logged in `PROJECT.md` Key Decisions table.
Recent decisions affecting current work:

- [Phase 1]: Keep Spotify auth/session and environment-security constraints in the first delivery boundary.
- [Phase 2]: Deliver playback and live sync as one coherent user-visible capability.
- [Phase 3]: Group lyric matching, fallback UX, multilingual rendering, and shadcn/ui milestone UI in one experience phase.
- [Phase 4]: Isolate cache freshness/performance as the final reliability/perf boundary.
- [Phase 01]: Keep auth secrets and token internals in service-private state and expose only lifecycle-safe renderer state.
- [Phase 01]: Use a single env loader with strict required-variable checks to block auth startup on invalid config.
- [Phase 01]: Use a single UI auth store contract that includes user-facing reason, retry eligibility, and account identity fields for deterministic rendering.
- [Phase 01]: Represent connection UI as pure view-model builders so message/state behavior stays testable without renderer coupling.
- [Phase 01-spotify-connection-foundation]: Treat persisted auth tokens as secure-secret-store data only and clear malformed entries eagerly.
- [Phase 01-spotify-connection-foundation]: Use bounded startup refresh retries with visible recoverable status before reconnect fallback.
- [Phase 01-spotify-connection-foundation]: Capture callback token exchange inside runtime wiring so persistence remains outside renderer-facing auth lifecycle state.

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-20 22:27
Stopped at: Completed 01-04-PLAN.md
Resume file: None
