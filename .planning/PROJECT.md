# Spotify Live Lyrics Web App

## What This Is

Liryk is a browser-based Spotify companion that shows synced lyrics for the currently playing track. It now has immersive fullscreen lyrics delivery plus drift-resistant playback timing. Milestone v1.4 focuses on improving reading comfort by redesigning lyric line transition motion to hold steady during a line and move only near line changes.

## Core Value

When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.

## Current Milestone: v1.4 Stable Line-Change Motion Model

**Goal:** Redesign fullscreen lyric motion to a hold-transition-settle model that stays stable while reading and only moves near line changes.

**Target features:**
- Time-windowed transition model (hold, transition, settle) instead of continuous drift
- Adaptive transition window based on per-line gap duration with readable min/max clamps
- Calm eased interpolation for lyric track movement with clean landing behavior
- Stable resting position and smooth neighboring line style transitions
- Motion-only refactor that preserves playback clock, drift correction, and active-line timing correctness

## Requirements

### Validated

- [x] Detect currently playing Spotify track and playback position on desktop via Spotify Web API OAuth PKCE
  - Validated in Phase 02: live-playback-sync-engine
- [x] Highlight lyric lines in real time based on playback position and keep view auto-scrolled
  - Validated in Phase 02: live-playback-sync-engine
- [x] Fetch lyrics for the exact track version from internet sources, prioritizing timestamped lyrics
  - Validated in Phase 03: lyrics-resolution-and-rendered-experience
- [x] Support multilingual lyric rendering (UTF-8, non-Latin scripts)
  - Validated in Phase 03: lyrics-resolution-and-rendered-experience
- [x] Gracefully handle missing lyrics by showing "Lyrics not found"
  - Validated in Phase 03: lyrics-resolution-and-rendered-experience
- [x] Cache lyrics locally by Spotify track ID to reduce redundant lookups
  - Validated in Phase 04: cache-freshness-and-repeat-load-performance
- [x] Keep lyric timing aligned through local playback anchor and estimated progress between polls
  - Validated in Phase 12: playback-clock-backbone-and-poll-safety
- [x] Drive lyric progression on animation frames with deterministic drift reconciliation
  - Validated in Phase 13: frame-synced-lyric-engine-and-drift-reconciliation
- [x] Provide timing diagnostics and conservative early cueing on stable baseline timing
  - Validated in Phase 14: timing-diagnostics-and-early-cueing

### Active

- [ ] Implement hold-transition-settle lyric motion so the active line stays visually anchored for most of each line
- [ ] Animate lyric track movement only inside an adaptive pre-change transition window near `nextLine.startMs`
- [ ] Apply calm easing with no overshoot or bounce and preserve stable resting position after each line change
- [ ] Smooth neighboring line visual tier transitions (opacity/color/scale) during movement without abrupt state flips
- [ ] Keep playback timing correctness unchanged (no regressions in clock, drift policy, or active-line selection)

### Out of Scope

- Native desktop packaging changes in this milestone - focus is web delivery first
- Full mobile-native apps (iOS/Android) - responsive web covers mobile usage for now
- New music providers beyond Spotify - migration scope is runtime and UI, not provider expansion
- Word-level karaoke fill/syllable timing - this milestone is line-level motion only
- Separate upcoming-vs-active pre-highlight state - deferred to next milestone after motion stabilization

## Context

- v1.0 is complete through Phase 4; core lyrics sync behavior is already validated.
- v1.1 is complete through Phase 8 plus inserted Phase 07.1 for end-to-end web auth hardening.
- v1.2 is complete through Phase 11 with immersive fullscreen lyrics delivery.
- Playback timing/drift issues are resolved and considered stable after phases 12-14.
- Latest user-reported issue is visual reading comfort: motion should not drift continuously and should move only near line transitions.

## Constraints

- **Security**: Credentials must come from `.env` only - never hardcoded.
- **API/Auth**: Spotify Web API remains source of truth for now-playing and playback position.
- **Timing correctness**: Do not change playback clock architecture, drift correction policy, or active-line correctness in this milestone.
- **Motion quality**: Prioritize readability and stability over flashy animation effects.
- **Responsiveness**: UI must work on desktop and mobile viewports.
- **Scope**: During initialization, update planning artifacts only.

## Current State

- Milestone v1.0 complete (Phases 1-4).
- Milestone v1.1 complete (Phases 5-8 and inserted Phase 07.1).
- Milestone v1.2 complete (Phases 9-11 immersive fullscreen delivery).
- Milestone v1.3 complete (Phases 12-14 timing stabilization and early cueing).
- Milestone v1.4 initialized for stable line-change motion redesign.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep Spotify Web API as playback source during web migration | Preserves validated sync core while changing delivery surface | - Pending |
| Start v1.1 with light and dark themes in initial build | User requirement and reduces later redesign churn | - Pending |
| Use shadcn/ui in web milestone and install at implementation kickoff | Maintains component consistency and speeds polished UI delivery | - Pending |
| Build immersive fullscreen mode as a dedicated page rather than incremental tweaks to the existing shell | Protects focused visual language without compromising utility shell workflows | - Pending |
| Prioritize typographic lyric hero treatment over panel/card UI in v1.2 | Matches user direction for premium cinematic reading experience | - Pending |
| Use local playback anchor + estimated progress as lyric timing source | Poll-driven raw progress caused multi-second drift and jitter in real playback | - Pending |
| Add early cueing only after drift baseline is stable | Cueing before timing stability would mask core clock errors | - Pending |
| Replace continuous lyric drift with hold-transition-settle line-change motion | Continuous motion reduced readability during line consumption | - Pending |
| Defer separate upcoming-vs-active pre-highlight states to next milestone | Keep v1.4 focused on motion stability and readability first | - Pending |

---
*Last updated: 2026-03-21 after milestone v1.4 initialization*
