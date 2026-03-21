# Requirements: Spotify Live Lyrics Web App

**Defined:** 2026-03-21
**Core Value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.
**Current Milestone:** v1.4 Stable Line-Change Motion Model

## v1.4 Requirements

Requirements for this milestone. Each maps to exactly one roadmap phase.

### Motion Windowing

- [x] **MOT-04**: User sees the active lyric line remain visually anchored during most of its active interval (no continuous upward drift).
- [x] **MOT-05**: User sees lyric track movement begin only in a pre-change transition window near the next line start.
- [x] **MOT-06**: User sees each line change finish in a stable settled resting position with no residual motion.

### Adaptive Transition Timing

- [x] **TRN-01**: User sees transition duration adapt to each line gap and clamp to readable min/max bounds.
- [x] **TRN-02**: User sees short gaps handled smoothly (no violent snaps) and long gaps held still until near line change.

### Visual Continuity

- [x] **VIS-04**: User sees lyric movement eased with calm interpolation (no bounce/overshoot/springy jumps).
- [ ] **VIS-05**: User sees nearby line style transitions (opacity/color/scale emphasis) update smoothly during line handoff.

### Timing Guardrails

- [ ] **SAFE-01**: User continues to get accurate lyric timing with no regressions to playback clock, drift correction, or active-line selection behavior.

## Future Candidate Requirements

Deferred until after v1.4 ships.

- **CUE-02**: User sees subtle upcoming-line pre-highlight distinct from active-line state.
- **THEM-04**: User can customize accent palette beyond base mood presets.
- **SOC-01**: User can share currently active lyric lines as visual cards.

## Out of Scope

Explicitly excluded for v1.4.

| Feature | Reason |
|---------|--------|
| Playback clock architecture changes | Timing stack is now stable; this milestone is motion-only |
| Drift policy re-tuning | Drift reconciliation already validated and should remain unchanged |
| Word-level karaoke fill and syllable timing | Out of scope for line-motion polish milestone |
| Audio analysis driven animation | Not needed for current readability-focused behavior |
| Mobile native app packaging | Delivery remains responsive web |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MOT-04 | Phase 15 | Complete |
| MOT-05 | Phase 15 | Complete |
| MOT-06 | Phase 16 | Complete |
| TRN-01 | Phase 15 | Complete |
| TRN-02 | Phase 16 | Complete |
| VIS-04 | Phase 16 | Complete |
| VIS-05 | Phase 17 | Pending |
| SAFE-01 | Phase 17 | Pending |

**Coverage:**
- v1.4 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after milestone v1.4 definition*
