# Requirements: Spotify Live Lyrics Web App

**Defined:** 2026-03-21
**Core Value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.
**Current Milestone:** v1.3 Playback Clock Drift Fix and Early Karaoke Cueing

## v1.3 Requirements

Requirements for this milestone. Each maps to exactly one roadmap phase.

### Playback Clock Stability

- [x] **CLK-01**: User sees lyric timing stay aligned to real playback through a local playback anchor plus estimated progress between Spotify polls.
- [x] **CLK-02**: User does not experience stale playback responses overwriting newer track/progress state when polling overlaps.
- [ ] **CLK-03**: User sees deterministic drift handling where large drift hard-resets and small drift applies bounded soft correction.

### Lyric Timing Engine

- [ ] **LYR-01**: User sees active lyric updates driven by animation-frame timing rather than polling cadence.
- [ ] **LYR-02**: User sees accurate active-line selection derived by binary search over sorted lyric start times.

### Diagnostics and Tuning

- [ ] **DBG-01**: User can enable a minimal timing diagnostics overlay showing estimated progress, polled progress, and measured drift for debugging.
- [ ] **CUE-01**: User sees slight early karaoke cueing applied only after baseline drift stabilization is verified.

## Future Candidate Requirements

Deferred until after v1.3 ships.

- **THEM-04**: User can customize accent palette beyond base mood presets.
- **SOC-01**: User can share currently active lyric lines as visual cards.
- **DESK-02**: User can use compact mini-player mode for multitasking.

## Out of Scope

Explicitly excluded for v1.3.

| Feature | Reason |
|---------|--------|
| New music providers beyond Spotify | Milestone focuses on timing reliability within existing provider pipeline |
| Word-level syllable animation | This milestone only introduces line-level early cueing |
| Mobile native app packaging | Delivery remains responsive web |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLK-01 | Phase 12 | Planned |
| CLK-02 | Phase 12 | Planned |
| CLK-03 | Phase 13 | Planned |
| LYR-01 | Phase 13 | Planned |
| LYR-02 | Phase 13 | Planned |
| DBG-01 | Phase 14 | Planned |
| CUE-01 | Phase 14 | Planned |

**Coverage:**
- v1.3 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after milestone v1.3 initialization*
