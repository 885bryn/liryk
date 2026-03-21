---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: milestone
current_plan: 0
status: planning
stopped_at: Completed 14-02-PLAN.md
last_updated: "2026-03-21T04:45:37.307Z"
last_activity: 2026-03-21
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 9
  completed_plans: 8
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-21)

**Core value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.
**Current focus:** v1.3 kickoff for playback clock drift stabilization and early karaoke cueing.

## Current Position

Phase: Not started (pre-Phase 12 planning)
Plan: -
Current Plan: 0
Total Plans in Phase: 0
Status: Ready for phase planning
Last Activity: 2026-03-21

## Accumulated Context

### Decisions

Decisions are logged in `PROJECT.md` Key Decisions table.
Recent decisions affecting current work:

- [v1.3] Move timing authority to local playback anchor plus estimated progress between polls.
- [v1.3] Add drift reconciliation policy with hard-reset and bounded soft-correction paths.
- [v1.3] Prevent stale poll responses from overwriting newer playback samples.
- [v1.3] Add timing diagnostics before introducing early cueing behavior.
- [Phase 12]: Export playback clock contracts from core playback types for stable downstream timing imports.
- [Phase 12]: Keep playback progress estimation pure and monotonic-time-driven for deterministic behavior.
- [Phase 12]: Publish estimatedProgressMs on runtime frame updates so lyric consumers read between-poll progress.
- [Phase 12]: Add optional nowPerfMs runtime dependency for deterministic playback-clock test control.
- [Phase 12]: Enforce explicit stale-by-request and stale-by-freshness checks before playback runtime emits or updates latest snapshot.
- [Phase 12]: Use deferred overlap race fixtures plus build gate as repeatable CLK-02 verification proof.
- [Phase 13]: Use dependency-injected requestAnimationFrame/cancelAnimationFrame hooks for deterministic runtime tests.
- [Phase 13]: Invalidate frame callbacks with loop tokens so stale scheduled callbacks cannot update state after cancellation.
- [Phase 13]: Resolve active line as latest startMs less than or equal to progress, not by inferred end bounds.
- [Phase 13]: Define pre-first progress as active null with next pointing to index zero for deterministic UI behavior.
- [Phase 13]: Use a hard snap threshold of 1200ms to avoid prolonged desync when drift is large.
- [Phase 13]: Clamp soft correction to 100ms per sample so in-band drift converges without abrupt jumps.
- [Phase 14]: Diagnostics drift is computed as estimated minus latest trusted polled progress from the same sample.
- [Phase 14]: Fullscreen diagnostics remain optional via a subdued toggle so lyric hierarchy stays primary.
- [Phase 14]: Mark large no-change drift corrections as hard-reset diagnostics state to distinguish them from in-band estimated corrections.
- [Phase 14]: Gate early cueing on explicit automated and manual diagnostics baseline verification.

### Roadmap Evolution

- v1.0 (Phases 1-4) complete.
- v1.1 (Phases 5-8 plus inserted 07.1) complete.
- v1.2 (Phases 9-11 fullscreen immersive mode) complete.
- v1.3 initialized with Phases 12-14.

### Pending Todos

- Start Phase 12 planning.

### Blockers/Concerns

None currently.

## Session Continuity

Last session: 2026-03-21T04:45:37.305Z
Stopped at: Completed 14-02-PLAN.md
Resume file: None
