---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
status: Ready to begin Phase 5
stopped_at: Completed 05-01-PLAN.md
last_updated: "2026-03-20T09:18:27.421Z"
last_activity: 2026-03-20 - Milestone v1.1 started
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 3
  completed_plans: 1
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-20)

**Core value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.
**Current focus:** Milestone v1.1 initialization complete; requirements and roadmap approved

## Current Position

Phase: 05 - Web Runtime and Theme Foundation
Plan: 02 of 03 (next)
Status: In progress (05-01 complete)
Last activity: 2026-03-20 - Completed 05-01 runtime scaffold and Tailwind baseline

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
- [Phase 05]: Use a thin browser composition layer (src/main.tsx + AppShell) without touching existing auth/lyrics model contracts.
- [Phase 05]: Adopt class-based dark mode tokens in global CSS before shadcn work so later primitives inherit stable theme variables.

### Pending Todos

- Execute Phase 05-02 shadcn/ui initialization and primitive verification checkpoint.

### Blockers/Concerns

None currently.

## Session Continuity

Last session: 2026-03-20T09:18:27.419Z
Stopped at: Completed 05-01-PLAN.md
Resume file: None

## Performance Metrics

| Phase | Plan | Duration (s) | Tasks | Files |
|-------|------|--------------|-------|-------|
| 05 | 01 | 475 | 2 | 13 |
