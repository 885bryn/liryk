# Requirements: Spotify Live Lyrics Web App

**Defined:** 2026-04-09
**Core Value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.
**Current Milestone:** v1.5 Viewport-Locked Live Lyrics

## v1.5 Requirements

### Viewport Anchoring

- [x] **VIEW-01**: User always sees the highlighted synced lyric row inside the visible fullscreen viewport on the first active lyric after a track starts or transitions.
- [x] **VIEW-02**: User always sees the highlighted synced lyric row inside the visible fullscreen viewport on the last active lyric and final line handoff near song end.
- [x] **VIEW-03**: Automatic live-anchor correction uses the same viewport reference model as fullscreen lyric positioning instead of a contradictory document-scroll calculation.

### Live Lock and Scroll Intent

- [x] **LIVE-01**: Programmatic live-anchor correction does not disable live lock.
- [x] **LIVE-02**: Live lock disables only after explicit user scroll intent moves the viewport away from live mode.
- [x] **LIVE-03**: Back to Live restores the correct live anchor and re-enables live lock without leaving the active lyric misaligned.
- [x] **SCROLL-01**: The fullscreen lyrics page no longer exposes a large accidental document scroll range that can push translateY-centered lyrics off-screen during live mode.

### Safety and Verification

- [ ] **SAFE-01**: The viewport-lock fix does not regress playback timing correctness, drift correction behavior, active-line selection, or settle semantics.
- [ ] **QA-01**: Automated and manual regression coverage proves correct behavior at track start, track end, track transitions, manual browse-away, and Back to Live recovery.

## v2 Requirements

Deferred until after v1.5 ships.

### Motion Polish

- **VIS-05**: User sees nearby line style transitions update smoothly during line handoff.
- **VAL-01**: User-facing motion quality gate from deferred `16-03-PLAN.md` is executed and documented.

### Karaoke

- **KAR-01**: User can enter Karaoke Mode from fullscreen while Spotify remains the remote selector/reference.
- **KAR-02**: Karaoke Mode uses local YouTube playback as the backing source with durable mapping and cache support.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Karaoke mode implementation | Separate milestone candidate; this milestone is focused on fullscreen viewport correctness |
| Broad visual redesign of fullscreen lyrics | Existing visual language is acceptable; the urgent problem is active-line visibility and live lock correctness |
| Playback clock or drift-policy redesign | Timing architecture is already validated and must remain stable |
| New lyric providers or source changes | The bug is in fullscreen layout/scroll behavior, not lyric resolution |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIEW-01 | Phase 19 | Complete (19-01) |
| VIEW-02 | Phase 19 | Complete (19-01) |
| VIEW-03 | Phase 18 | Complete |
| LIVE-01 | Phase 18 | Complete |
| LIVE-02 | Phase 19 | Complete |
| LIVE-03 | Phase 19 | Complete |
| SCROLL-01 | Phase 18 | Complete |
| SAFE-01 | Phase 20 | Pending |
| QA-01 | Phase 20 | Pending |

**Coverage:**
- v1.5 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-15 after Phase 19 completion*
