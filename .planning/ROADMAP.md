# Roadmap: Spotify Live Lyrics Web App

## Overview

This milestone follows completed v1.1 delivery and introduces a dedicated immersive fullscreen lyrics page. The focus is cinematic, typography-first presentation with smooth karaoke progression and Simplified Chinese rendering guarantees.

## Milestone

- **Milestone:** v1.2 Immersive Fullscreen Lyrics Mode
- **Requirements mapped:** 11 of 11
- **First phase number:** 9

## Phases

- [ ] **Phase 9: Fullscreen Route and Content Foundation** - Add dedicated fullscreen lyrics page structure and bind normalized lyrics content.
- [ ] **Phase 10: Monochrome Visual Language and Typography** - Implement pure black/white immersive visual direction with premium lyric hierarchy.
- [ ] **Phase 11: Karaoke Motion and Minimal Overlay Polish** - Finalize smooth progression motion, active-line transitions, and subtle metadata overlays.

## Phase Details

### Phase 9: Fullscreen Route and Content Foundation
**Goal**: Users can open a dedicated fullscreen lyrics page with a stable centered lyric column and Simplified Chinese lyric normalization in place.
**Depends on**: Completed Phase 8
**Requirements**: FULL-01, FULL-02, CHN-03, CHN-04
**Success Criteria**:
1. User can enter the fullscreen lyrics page and see only immersion-focused content (no utility-shell chrome).
2. User sees centered column layout with left-aligned lyric text and generous top/bottom spacing.
3. User sees Chinese lyrics rendered in Simplified Chinese while non-Chinese text remains intact.

**Plans:** 3 plans

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

**Plans:** 0 plans

Plans:
- [ ] TBD (run `/gsd-plan-phase 10`)

### Phase 11: Karaoke Motion and Minimal Overlay Polish
**Goal**: Users see smooth readable karaoke-style progression with subtle non-distracting supporting overlays.
**Depends on**: Phase 10
**Requirements**: MOT-01, MOT-02, MOT-03, META-01
**Success Criteria**:
1. User sees smooth continuous lyric auto-scroll with active line near viewport center during playback.
2. User sees elegant transition behavior (opacity/color/transform) without jumpy motion.
3. User may see small metadata/progress overlays that remain secondary to lyric content.

**Plans:** 0 plans

Plans:
- [ ] TBD (run `/gsd-plan-phase 11`)

## Progress

**Execution Order:**
Phases execute in numeric order: 9 -> 10 -> 11

| Phase | Requirements | Status |
|-------|--------------|--------|
| 9. Fullscreen Route and Content Foundation | FULL-01, FULL-02, CHN-03, CHN-04 | Not started |
| 10. Cinematic Visual Language and Typography | VIS-01, VIS-02, VIS-03 | Not started |
| 11. Karaoke Motion and Minimal Overlay Polish | MOT-01, MOT-02, MOT-03, META-01 | Not started |
