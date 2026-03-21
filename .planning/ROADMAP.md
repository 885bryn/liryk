# Roadmap: Spotify Live Lyrics Web App

## Overview

This milestone follows completed v1.2 fullscreen delivery and focuses on eliminating playback/lyric timing drift before introducing early karaoke cueing. Timing authority moves from poll cadence to a local playback clock with frame-driven lyric updates.

## Milestone

- **Milestone:** v1.3 Playback Clock Drift Fix and Early Karaoke Cueing
- **Requirements mapped:** 7 of 7
- **First phase number:** 12

## Phases

- [ ] **Phase 12: Playback Clock Backbone and Poll Safety** - Introduce playback anchor model, local progress estimation, and stale-response guards for overlapping polls.
- [ ] **Phase 13: Frame-Synced Lyric Engine and Drift Reconciliation** - Drive active-line timing on animation frames with binary-search selection and deterministic drift correction policy.
- [ ] **Phase 14: Timing Diagnostics and Early Cueing** - Add instrumentation overlay and then apply conservative early cueing once baseline stability is verified.

## Phase Details

### Phase 12: Playback Clock Backbone and Poll Safety
**Goal**: Timing state remains stable between Spotify polls and rejects stale poll completions.
**Depends on**: Completed Phase 11
**Requirements**: CLK-01, CLK-02
**Success Criteria**:
1. Runtime stores an anchor from latest trusted playback sample and estimates live progress from local elapsed time.
2. Lyric timing consumers can read estimated progress without waiting for next poll tick.
3. Overlapping playback fetches cannot regress track/progress due to stale completion order.

**Plans:** 2/3 plans executed

Plans:
- [ ] 12-01-PLAN.md - Define playback anchor contract and estimation utility with deterministic unit coverage.
- [ ] 12-02-PLAN.md - Integrate anchor-driven estimation into now-playing runtime state updates.
- [ ] 12-03-PLAN.md - Add stale poll guards and verification runbook for overlap race scenarios.

### Phase 13: Frame-Synced Lyric Engine and Drift Reconciliation
**Goal**: Active lyric selection remains smooth and accurate via frame updates and bounded drift handling.
**Depends on**: Phase 12
**Requirements**: LYR-01, LYR-02, CLK-03
**Success Criteria**:
1. Active lyric progression updates on requestAnimationFrame instead of poll cadence.
2. Active line is selected using binary search over monotonic lyric start times.
3. Drift reconciliation policy applies hard reset above threshold and bounded soft correction below threshold.

**Plans:** 0/3 plans complete

Plans:
- [ ] 13-01-PLAN.md - Add frame-tick timing loop contract and wiring for fullscreen lyric runtime.
- [ ] 13-02-PLAN.md - Implement binary-search active-line resolver with edge-case coverage.
- [ ] 13-03-PLAN.md - Implement and verify hard-reset plus soft-correction drift reconciliation policy.

### Phase 14: Timing Diagnostics and Early Cueing
**Goal**: Drift behavior becomes observable, then early cueing is layered in safely.
**Depends on**: Phase 13
**Requirements**: DBG-01, CUE-01
**Success Criteria**:
1. Debug overlay can be toggled to inspect estimated progress, polled progress, delta, and correction state.
2. Instrumentation makes drift source identification reproducible during manual playback checks.
3. Early cueing applies a small configurable lead while preserving stable line ordering and readability.

**Plans:** 0/3 plans complete

Plans:
- [ ] 14-01-PLAN.md - Add toggleable timing diagnostics overlay and structured debug fields.
- [ ] 14-02-PLAN.md - Validate baseline drift stability against instrumentation acceptance criteria.
- [ ] 14-03-PLAN.md - Introduce conservative early cueing offset and publish final tuning checklist.

## Progress

**Execution Order:**
Phases execute in numeric order: 12 -> 13 -> 14

| Phase | Requirements | Status |
|-------|--------------|--------|
| 12. Playback Clock Backbone and Poll Safety | 2/3 | In Progress|  | 13. Frame-Synced Lyric Engine and Drift Reconciliation | LYR-01, LYR-02, CLK-03 | Not started |
| 14. Timing Diagnostics and Early Cueing | DBG-01, CUE-01 | Not started |
