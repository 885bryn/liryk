# Roadmap: Spotify Live Lyrics Web App

## Overview

This milestone follows completed v1.1 delivery and introduces a dedicated immersive fullscreen lyrics page. The focus is cinematic, typography-first presentation with smooth karaoke progression and Simplified Chinese rendering guarantees.

## Milestone

- **Milestone:** v1.2 Immersive Fullscreen Lyrics Mode
- **Requirements mapped:** 13 of 13
- **First phase number:** 9

## Phases

- [x] **Phase 9: Fullscreen Route and Content Foundation** - Add dedicated fullscreen lyrics page structure and bind normalized lyrics content. (completed 2026-03-20)
- [x] **Phase 10: Monochrome Visual Language and Typography** - Implement pure black/white immersive visual direction with premium lyric hierarchy. (completed 2026-03-21)
- [x] **Phase 11: Karaoke Motion and Minimal Overlay Polish** - Finalize smooth progression motion, active-line transitions, and subtle metadata overlays. (completed 2026-03-21)

## Phase Details

### Phase 9: Fullscreen Route and Content Foundation
**Goal**: Users can open a dedicated fullscreen lyrics page with a stable centered lyric column and Simplified Chinese lyric normalization in place.
**Depends on**: Completed Phase 8
**Requirements**: FULL-01, FULL-02, CHN-03, CHN-04
**Success Criteria**:
1. User can enter the fullscreen lyrics page and see only immersion-focused content (no utility-shell chrome).
2. User sees centered column layout with left-aligned lyric text and generous top/bottom spacing.
3. User sees Chinese lyrics rendered in Simplified Chinese while non-Chinese text remains intact.

**Plans:** 3/3 plans complete

Plans:
- [ ] 09-01-PLAN.md - Add route-entry contract and app bootstrap wiring for dedicated `/fullscreen` path.
- [ ] 09-02-PLAN.md - Implement immersive fullscreen page layout with centered lyric column and no shell chrome.
- [ ] 09-03-PLAN.md - Lock fullscreen Simplified Chinese rendering and publish phase verification checklist.

### Phase 10: Monochrome Visual Language and Typography
**Goal**: Users experience a premium monochrome lyrics canvas with clear active-line hierarchy.
**Depends on**: Phase 9
**Requirements**: VIS-01, VIS-02, VIS-03
**Success Criteria**:
1. User sees a pure black background with no heavy card-like framing or non-lyric chrome.
2. User sees large bold lyric typography with clear contrast between active, near-active, and distant lines.
3. User sees uncluttered visual composition that keeps lyrics as the dominant focus.

**Plans:** 3/3 plans complete

Plans:
- [ ] 10-01-PLAN.md - Lock fullscreen pure-black monochrome baseline and remove utility chrome.
- [ ] 10-02-PLAN.md - Implement active/near/distant lyric typography hierarchy with explicit class contracts.
- [ ] 10-03-PLAN.md - Publish fullscreen visual verification runbook and final regression checks.

### Phase 11: Karaoke Motion and Minimal Overlay Polish
**Goal**: Users see smooth readable karaoke-style progression with subtle non-distracting supporting overlays.
**Depends on**: Phase 10
**Requirements**: MOT-01, MOT-02, MOT-03, META-01, FULL-03, FULL-04
**Success Criteria**:
1. User sees smooth continuous lyric auto-scroll with active line near viewport center during playback.
2. User sees elegant transition behavior (opacity/color/transform) without jumpy motion.
3. User may see small metadata/progress overlays that remain secondary to lyric content.
4. User can enter fullscreen from the standard shell and exit fullscreen from the fullscreen page using visible controls.

**Plans:** 3/3 plans complete

Plans:
- [ ] 11-01-PLAN.md - Add visible shell/fullscreen route controls for entering and exiting immersive mode.
- [ ] 11-02-PLAN.md - Implement center-anchored karaoke motion with explicit transform/opacity/color transitions.
- [ ] 11-03-PLAN.md - Add subtle metadata/progress overlays and publish phase verification runbook.

## Progress

**Execution Order:**
Phases execute in numeric order: 9 -> 10 -> 11

| Phase | Requirements | Status |
|-------|--------------|--------|
| 9. Fullscreen Route and Content Foundation | FULL-01, FULL-02, CHN-03, CHN-04 | Complete |
| 10. Monochrome Visual Language and Typography | 3/3 | Complete   | 2026-03-21 | 11. Karaoke Motion and Minimal Overlay Polish | MOT-01, MOT-02, MOT-03, META-01, FULL-03, FULL-04 | Not started |
