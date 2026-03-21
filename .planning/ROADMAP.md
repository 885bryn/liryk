# Roadmap: Spotify Live Lyrics Web App

## Overview

This milestone follows completed v1.3 timing stabilization and focuses on visual readability. The lyric stack should hold still while a line is being read, transition only near line changes, then settle cleanly. Playback timing correctness remains unchanged.

## Milestone

- **Milestone:** v1.4 Stable Line-Change Motion Model
- **Requirements mapped:** 8 of 8
- **First phase number:** 15

## Phases

- [x] **Phase 15: Hold-and-Transition Motion Windowing** - Implement adaptive pre-change transition windows with stable hold behavior for active-line readability. (completed 2026-03-21)
- [ ] **Phase 16: Smooth Transition Execution and Settling** - Deliver eased line-change motion that lands cleanly without drift, snap, bounce, or overshoot.
- [ ] **Phase 17: Visual Continuity and Timing Guardrails** - Smooth neighboring line emphasis changes and verify no regressions in playback timing correctness.

## Phase Details

### Phase 15: Hold-and-Transition Motion Windowing
**Goal**: Lyrics stay still while reading and move only inside an adaptive pre-change window near the next line start.
**Depends on**: Completed Phase 14
**Requirements**: MOT-04, MOT-05, TRN-01
**Success Criteria**:
1. User sees active line remain visually anchored through most of the current line interval.
2. User sees upward lyric motion begin only near the next line boundary, not continuously across the whole gap.
3. User sees transition timing adapt to per-line gap with readable min/max clamp behavior.

**Plans:** 3/3 plans complete

Plans:
- [ ] 15-01-PLAN.md - Add transition-window helper contracts (`getAdaptiveTransitionMs`, `getTransitionPhase`) with deterministic tests.
- [ ] 15-02-PLAN.md - Refactor fullscreen track offset calculation to hold before window and animate only within window.
- [ ] 15-03-PLAN.md - Expose and tune motion constants for readable defaults and clamp behavior verification.

### Phase 16: Smooth Transition Execution and Settling
**Goal**: Transition movement feels calm and premium, then lands into a stable resting position on each line change.
**Depends on**: Phase 15
**Requirements**: MOT-06, TRN-02, VIS-04
**Success Criteria**:
1. User sees compact but smooth motion on short lyric gaps and late-start controlled motion on long gaps.
2. User sees eased interpolation without bounce, overshoot, or spring-like wobble.
3. User sees line-change motion complete with clear settle and no residual drift after landing.

**Plans:** 0/3 plans complete

Plans:
- [ ] 16-01-PLAN.md - Add core easing helper and deterministic transition-progress tests for calm interpolation.
- [ ] 16-02-PLAN.md - Implement `getTargetScrollOffset` settle semantics and wire fullscreen short/long-gap edge handling.
- [ ] 16-03-PLAN.md - Finalize quality gate with regression/build verification plus manual fullscreen playback checkpoint.

### Phase 17: Visual Continuity and Timing Guardrails
**Goal**: Neighboring line visual state changes remain smooth while preserving all existing timing correctness guarantees.
**Depends on**: Phase 16
**Requirements**: VIS-05, SAFE-01
**Success Criteria**:
1. User sees active and nearby line opacity/color/scale transitions change smoothly during handoff without abrupt flips.
2. User sees stable visual hierarchy before, during, and after transitions with no harsh style jumps.
3. User retains timing correctness: playback clock, drift policy, and active-line selection tests remain green.

**Plans:** 0/3 plans complete

Plans:
- [ ] 17-01-PLAN.md - Smooth neighboring line tier transition contracts during line-change motion.
- [ ] 17-02-PLAN.md - Add regression suite proving motion refactor does not alter timing correctness.
- [ ] 17-03-PLAN.md - Publish readability verification runbook and finalize motion quality gate.

## Progress

**Execution Order:**
Phases execute in numeric order: 15 -> 16 -> 17

| Phase | Requirements | Status |
|-------|--------------|--------|
| 15. Hold-and-Transition Motion Windowing | 3/3 | Complete   | 2026-03-21 | 16. Smooth Transition Execution and Settling | MOT-06, TRN-02, VIS-04 | Not started |
| 17. Visual Continuity and Timing Guardrails | VIS-05, SAFE-01 | Not started |
