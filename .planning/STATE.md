---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: milestone
status: blocked
stopped_at: 20-06 checkpoint failed (manual QA drift blocker unresolved)
last_updated: "2026-04-15T23:52:30.082Z"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 10
  completed_plans: 9
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-15)

**Core value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.
**Current focus:** Phase 20 — viewport-regression-and-timing-safety-closure

## Current Position

Phase: 20 (viewport-regression-and-timing-safety-closure) — EXECUTING
Plan: 6 of 6

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
- [Phase 14]: Use a conservative default early cue lead of 120ms, exported for tuning without renderer rewrites.
- [Phase 14]: Apply cueing only to synced active-line selection; keep tier rendering and motion contracts unchanged.
- [Phase 15]: Use Math.floor plus non-negative normalization for all motion-window timing inputs.
- [Phase 15]: Model transition state as hold/transition/complete with phaseProgress pinned to 0..1.
- [Phase 15]: Use cue-adjusted progress with getTransitionPhase so fullscreen motion aligns with early-cue active-line selection.
- [Phase 15]: Keep tier styling keyed to integer active index while only translateY uses interpolated floating index.
- [Phase 15]: Export transition defaults with clear names so tuning is discoverable and reusable across layers.
- [Phase 15]: Prove fullscreen constant wiring with explicit regression checks plus combined test/build verification.
- [Phase 16]: Use a pure cubic ease-in-out helper in core to keep motion calm, bounded, and renderer-agnostic.
- [Phase 16]: Validate eased transition output with explicit non-linear midpoint coverage so linear regressions are caught early.
- [Phase 16]: Represent scroll targets as pixel offsets in core so renderer output can settle exactly at line boundaries.
- [Phase 16]: Keep active-tier selection integer-based while only translateY uses phase-aware helper interpolation.
- [Phase 19]: Clamp fullscreen boundary recentering with `getBoundaryLockedScrollTop(...)` derived from row-layout anchors and total height.
- [Phase 19]: Verify first-line and last-line viewport visibility with deterministic geometry assertions instead of transform-only checks.
- [Phase 19-song-boundary-visibility-and-live-lock-recovery]: Gate fullscreen live-lock exit behind a dedicated userScrollIntentRef so programmatic recentering and row-measurement corrections cannot masquerade as manual browse-away.
- [Phase 19-song-boundary-visibility-and-live-lock-recovery]: Remove scroll-position auto-relock and make Back to Live the explicit path that re-enables live lock while restoring the current boundary-aware anchor.
- [Phase 20-viewport-regression-and-timing-safety-closure]: Keep Phase 20 production code read-only while hardening fullscreen viewport and timing guarantees in tests.
- [Phase 20-viewport-regression-and-timing-safety-closure]: Guard fullscreen timing authority with source assertions for estimated progress, early cueing, timeline selection, and motion-window helpers.
- [Phase 20]: Keep Phase 20 production code read-only and close the phase through validation artifacts and command evidence only.
- [Phase 20]: Treat the known Vite chunk-size warning as non-blocking residual risk because build exits 0 and warning predates this closure plan.
- [Phase 20]: Use offsetHeight/clientHeight/scrollHeight as primary row-height sources before getBoundingClientRect fallback to keep live anchor invariant under visual transforms.
- [Phase 20]: Preserve existing timing authority and motion-window contracts while fixing drift strictly in fullscreen measurement flow.
- [Phase 20]: Treat sustained-drift closure as a TDD cycle with a failing 12-transition regression before measurement stabilization.
- [Phase 20]: Keep timing authority contracts unchanged and scope the fix to fullscreen row measurement stability.

### Roadmap Evolution

- v1.0 (Phases 1-4) complete.
- v1.1 (Phases 5-8 plus inserted 07.1) complete.
- v1.2 (Phases 9-11 fullscreen immersive mode) complete.
- v1.3 (Phases 12-14 timing stabilization and early cueing) complete.
- v1.4 (Phases 15-17 stable line-change motion model) closed on 2026-04-09 with deferred tech debt.
- v1.5 (Phases 18-20 viewport-locked live lyrics) initialized on 2026-04-09.

### Pending Todos

- Phase 20 manual verification: rerun all seven fullscreen scenarios in `20-04-SUMMARY.md`, capture full evidence fields (browser/viewport/track/ID), and confirm sustained drift check plus Back to Live recentering both pass.
- Decide after v1.5 whether deferred v1.4 items (`16-03`, `VIS-05`) should become a separate polish milestone or fold into a later fullscreen quality pass.
- Keep Private Karaoke Mode deferred until fullscreen viewport locking is stable.

### Blockers/Concerns

- QA-01 remains blocked after Plan 20-06 manual checkpoint failure: sustained mid-song progression still drifts upward off-screen, and Back to Live recenters to the wrong drifted anchor state.

## Session Continuity

Last session: 2026-04-15T23:52:30.082Z
Stopped at: 20-06 failed human verification checkpoint (Task 2)
Resume file: None
