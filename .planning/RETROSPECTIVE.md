# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.6 — Developer Activity Panel

**Shipped:** 2026-04-19  
**Phases:** 2 (21–22) | **Plans:** 3 | **Timeline:** 3 days

### What Was Built

- `useDevActivityLog` ring-buffer hook (150 entries, stable append callback) and `DevActivityPanel` scroll-isolated component with auto-scroll sentinel and pause/resume toggle
- Toggle button and panel injected into FullscreenLyricsPage as a DOM sibling of `<main>` — inside fullscreen root, not portaled — preserving lyric layout and live lock
- Auth/connection event wiring via sentinel-ref change detection (token refresh, connect/disconnect/waiting states)
- Lyrics fetch lifecycle events (cache hit / live fetch / low-confidence / not-found) wired inside the active resolver guard
- Spotify sync events (track-changed, playback-resumed, playback-paused, no-active-playback) wired with sentinel refs
- Playback clock hard reset events with drift-delta labels, completing the full operational loop for tracing app behavior from fullscreen

### What Worked

- Splitting panel scaffolding (Phase 21) from event wiring (Phase 22) created a clean integration surface — Phase 22 only needed to call `appendLogEntry` in the right places
- Sentinel-ref pattern (undefined initial value) established in Phase 21 for auth events transferred identically to all three Phase 22 categories — zero deviation in pattern usage
- TDD-first on the hook and component (Phase 21-01) meant the integration work in 21-02 and 22-01 was purely about wiring, not debugging component behavior

### What Was Inefficient

- Pre-existing test failures (lrc-parser, plain-lyrics-timing) create noise in every test run — they were out of scope for v1.6 but forced repeated confirmation they were baseline failures, not regressions
- No milestone audit was run before completing — the workflow recommends `/gsd:audit-milestone` first; skipped in yolo mode

### Patterns Established

- **Sentinel-ref guard:** All change-detecting useEffects initialize the ref to `undefined`, skip on mount, then track changes — used for auth events (21-02), sync events (22-01), and clock events (22-01)
- **DOM sibling placement:** Dev panel placed as JSX sibling of `<main>`, not inside `viewportSurfaceRef`, to satisfy the DEV-02 constraint that panel must not affect lyric layout or fire row ResizeObservers
- **Source-contract tests as guardrails:** The `Math.round(Math.abs` source-contract test caught an implementation detail immediately — respect source contracts as first-class constraints, not bureaucratic gates

### Key Lessons

1. When adding observability to an existing runtime, splitting container/scaffolding from event wiring into separate phases is clean — the scaffolding phase produces a stable hook API that makes wiring trivial
2. Pre-existing test failures should be triaged and either fixed or explicitly catalogued before a milestone starts — running them as "known failures" creates cognitive overhead on every verification
3. Sentinel-ref pattern for change-detecting useEffects is robust and portable — worth documenting as a project convention

### Cost Observations

- Model mix: ~100% Sonnet 4.6
- Sessions: 3 (plan + 2 execute sessions)
- Notable: Phase 22 completed in 7 minutes — the pattern from Phase 21 was so clear that execution was essentially mechanical

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 4 | ~8 | Initial project setup, Spotify auth, lyrics sync |
| v1.1 | 4+1 insert | ~8 | End-to-end web auth hardening, lyrics parity |
| v1.2 | 3 | ~6 | Immersive fullscreen lyrics delivery |
| v1.3 | 3 | ~9 | Playback clock backbone, drift reconciliation, early cueing |
| v1.4 | 3 | ~9 | Hold-transition-settle motion model, closed with deferred debt |
| v1.5 | 3 | ~6 | Viewport-locked live lyrics (blocked before archival) |
| v1.6 | 2 | 3 | Developer activity panel — smallest milestone, fastest execution |

### Top Lessons (Verified Across Milestones)

1. Splitting complex phases into infrastructure-first / wiring-second reduces integration risk and makes each phase independently testable
2. Deferred tech debt accumulates — v1.4's deferred motion polish and v1.5's sustained-drift blocker continue to surface as context overhead in later milestones
3. Sentinel-ref pattern and source-contract tests are recurring patterns worth maintaining as project conventions
