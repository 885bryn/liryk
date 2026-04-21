# Requirements: Spotify Live Lyrics Web App

**Core Value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.
**Current Milestone:** v1.6 Developer Activity Panel

## v1.6 Requirements

### Panel Toggle

- [ ] **DEV-01**: User can toggle the developer activity panel open/closed via a small button in fullscreen mode
- [ ] **DEV-02**: Panel and toggle button render inside the fullscreen root element (not portaled to document.body) and are positioned absolutely so they do not affect lyric layout or fire the row ResizeObserver
- [ ] **DEV-03**: Panel scroll events do not bubble to the lyric viewport scroll surface (live lock is not accidentally disengaged by scrolling the log)

### Event Log

- [ ] **DEV-04**: Panel displays timestamped entries for lyrics fetch events (fetch initiated, cache hit, failure, provider used)
- [ ] **DEV-05**: Panel displays timestamped entries for Spotify sync events (API poll, track change, playback state update)
- [ ] **DEV-06**: Panel displays timestamped entries for playback clock events (drift corrections, hard resets)
- [ ] **DEV-07**: Panel displays timestamped entries for auth/connection events (token refresh, auth state change, connection status)

### UX & Visual

- [ ] **DEV-08**: Panel auto-scrolls to the latest entry, with a toggle to pause auto-scroll for inspection
- [ ] **DEV-09**: Panel is styled to match the dark fullscreen aesthetic and does not disrupt lyric display

## Future Requirements (v1.7+)

### Extended Panel UX

- **DEV-F1**: User can filter log entries by event category
- **DEV-F2**: User can clear the log without closing the panel
- **DEV-F3**: Keyboard shortcut (e.g. `?`) toggles the panel
- **DEV-F4**: Panel displays motion/transition events (line change, settle, phase transitions)
- **DEV-F5**: Panel displays viewport events (live-lock state changes, Back to Live activations)

---

**Archived: v1.5 Viewport-Locked Live Lyrics**
**Defined:** 2026-04-09

## v1.5 Requirements (Archived)

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

- [x] **SAFE-01**: The viewport-lock fix does not regress playback timing correctness, drift correction behavior, active-line selection, or settle semantics.
- [x] **QA-01**: Automated and manual regression coverage proves correct behavior at track start, track end, track transitions, manual browse-away, and Back to Live recovery.

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
| Log export / copy to clipboard | Nice to have but not needed for testing; defer to future |
| Resizable / draggable panel | Complexity outweighs testing benefit for v1.6 |
| Dev panel in production builds | Developer tool only; not a user-facing feature |
| Karaoke mode implementation | Separate milestone candidate |
| Playback clock or drift-policy redesign | Timing architecture is already validated and must remain stable |
| New lyric providers or source changes | Out of scope for this milestone |

## Traceability

### v1.6

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEV-01 | Phase 21 | Pending |
| DEV-02 | Phase 21 | Pending |
| DEV-03 | Phase 21 | Pending |
| DEV-04 | Phase 22 | Pending |
| DEV-05 | Phase 22 | Pending |
| DEV-06 | Phase 22 | Pending |
| DEV-07 | Phase 21 | Pending |
| DEV-08 | Phase 21 | Pending |
| DEV-09 | Phase 21 | Pending |

**Coverage:**
- v1.6 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

### v1.5 (Archived)

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIEW-01 | Phase 19 | Complete (19-01) |
| VIEW-02 | Phase 19 | Complete (19-01) |
| VIEW-03 | Phase 18 | Complete |
| LIVE-01 | Phase 18 | Complete |
| LIVE-02 | Phase 19 | Complete |
| LIVE-03 | Phase 19 | Complete |
| SCROLL-01 | Phase 18 | Complete |
| SAFE-01 | Phase 20 | Complete |
| QA-01 | Phase 20 | Complete |

---
*Requirements defined: 2026-04-17 (v1.6)*
*Last updated: 2026-04-17 after milestone v1.6 initialization*
