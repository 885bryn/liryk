---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: web-app-foundation-and-theming
status: in_progress
stopped_at: Milestone initialized; ready for Phase 5 planning
last_updated: "2026-03-20T12:00:00.000Z"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-20)

**Core value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.
**Current focus:** Milestone v1.1 initialization complete; requirements and roadmap approved

## Current Position

Phase: Not started (defining requirements complete)
Plan: -
Status: Ready to begin Phase 5
Last activity: 2026-03-20 - Milestone v1.1 started

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
- [Phase 03]: Use a canonical resolved lyric line contract across synced and plain-static modes to avoid downstream shape drift.
- [Phase 03]: Score candidates with strict normalized title+artist gates before synced-first tie-break to prevent plausible wrong matches.
- [Phase 03]: Guard lyrics resolution async completions with a session counter so stale requests cannot overwrite new tracks.
- [Phase 03]: Render plain fallback in explicit plain-static mode with no active highlight and per-line direction/display metadata.
- [Phase 04]: Keep freshness policy pure in core and storage logic in infra adapter.
- [Phase 04]: Use shorter TTL windows for not-found cache entries to avoid sticky negative cache results.
- [Phase 04]: Keep cache orchestration in runtime while resolver remains provider source of truth.
- [Phase 04]: Evict invalid cache entries before provider resolve to fail closed on poisoned data.

### Pending Todos

- Confirm implementation kickoff for Phase 5 and execute shadcn install checkpoint after web scaffold/Tailwind base setup.

### Blockers/Concerns

None currently.

## Session Continuity

Last session: 2026-03-20T12:00:00.000Z
Stopped at: Milestone initialized; ready for roadmap execution
Resume file: `.planning/ROADMAP.md`
