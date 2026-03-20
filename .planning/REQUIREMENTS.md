# Requirements: Spotify Live Lyrics Web App

**Defined:** 2026-03-20
**Core Value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.
**Current Milestone:** v1.2 Immersive Fullscreen Lyrics Mode

## v1.2 Requirements

Requirements for this milestone. Each maps to exactly one roadmap phase.

### Fullscreen Experience

- [x] **FULL-01**: User can open a dedicated fullscreen lyrics page that occupies the full viewport without utility-shell clutter.
- [x] **FULL-02**: User sees the lyrics hero column centered on the page with left-aligned lyric text and generous vertical breathing room.

### Visual Direction

- [ ] **VIS-01**: User sees a pure black fullscreen background in immersive mode.
- [ ] **VIS-02**: User sees white lyric text hierarchy where the active line is brightest and surrounding lines remain readable with lower emphasis.
- [ ] **VIS-03**: User does not see card-heavy chrome, bordered utility panels, or distracting non-lyric UI in fullscreen mode.

### Karaoke Motion

- [ ] **MOT-01**: User sees smooth auto-scrolling lyric progression with the active line positioned near vertical center during playback.
- [ ] **MOT-02**: User sees elegant color/opacity/transform transitions as lines move between inactive, near-active, and active states.
- [ ] **MOT-03**: User sees motion remain readable and stable (no jumpy line transitions) across track progression.

### Chinese Rendering

- [ ] **CHN-03**: User sees Chinese lyrics rendered in Simplified Chinese in fullscreen mode.
- [ ] **CHN-04**: User sees non-Chinese text preserved while Chinese-script text is normalized.

### Optional Minimal Overlay

- [ ] **META-01**: User may see understated song metadata/progress affordances that remain visually secondary to lyrics.

## v1.3+ Candidate Requirements

Deferred to future milestones.

### Enhancements

- **THEM-04**: User can customize accent palette beyond base mood presets.
- **SOC-01**: User can share currently active lyric lines as visual cards.
- **DESK-02**: User can use compact mini-player mode for multitasking.

## Out of Scope

Explicitly excluded for v1.2.

| Feature | Reason |
|---------|--------|
| New music providers beyond Spotify | Milestone focuses on immersive presentation, not source expansion |
| Word-level karaoke syllable timing | Not required for this fullscreen milestone |
| Mobile native app packaging | Web fullscreen mode remains delivery target |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FULL-01 | Phase 9 | Complete |
| FULL-02 | Phase 9 | Complete |
| VIS-01 | Phase 10 | Pending |
| VIS-02 | Phase 10 | Pending |
| VIS-03 | Phase 10 | Pending |
| MOT-01 | Phase 11 | Pending |
| MOT-02 | Phase 11 | Pending |
| MOT-03 | Phase 11 | Pending |
| CHN-03 | Phase 9 | Pending |
| CHN-04 | Phase 9 | Pending |
| META-01 | Phase 11 | Pending |

**Coverage:**
- v1.2 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after milestone v1.2 definition*
