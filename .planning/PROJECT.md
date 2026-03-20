# Spotify Live Lyrics Web App

## What This Is

Liryk is a browser-based Spotify companion that shows synced lyrics for the currently playing track. It keeps the core value from v1.0 (correct line at the correct moment) while shifting delivery from desktop runtime boundaries to a responsive web app experience. Milestone v1.1 focuses on web foundation, polished visual design, and first-class light/dark theming.

## Core Value

When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.

## Current Milestone: v1.2 Immersive Fullscreen Lyrics Mode

**Goal:** Deliver a dedicated fullscreen lyrics page that feels cinematic, minimal, and music-first with smooth karaoke-style progression and Simplified Chinese rendering.

**Target features:**
- Full-viewport immersive lyrics mode with minimal chrome and deep warm burgundy atmosphere
- Large bold typography-led layout with centered column and left-aligned lyric flow
- Smooth auto-scroll progression with active-line emphasis near vertical center
- Subtle metadata/progress affordances that never compete with lyric content
- Chinese lyric display normalized to Simplified Chinese in this immersive mode

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

### Active

- [ ] Add a dedicated immersive fullscreen lyrics page with minimal UI chrome
- [ ] Implement cinematic visual direction (deep burgundy gradient, vignette, typographic hero layout)
- [ ] Implement smooth karaoke-style vertical progression with center-focused active line transitions
- [ ] Keep optional metadata/progress controls subtle and non-distracting
- [ ] Ensure Chinese lyrics display as Simplified Chinese in immersive mode

### Out of Scope

- Native desktop packaging changes in this milestone - focus is web delivery first
- Full mobile-native apps (iOS/Android) - responsive web covers mobile usage for now
- New music providers beyond Spotify - migration scope is runtime and UI, not provider expansion

## Context

- v1.0 is complete through Phase 4; core lyrics sync behavior is already validated.
- This milestone changes delivery target from desktop app context to web app context.
- User explicitly wants aesthetically pleasing design plus light and dark theme support from the start.
- shadcn/ui must be used, and install timing should be explicit during implementation planning.

## Constraints

- **Security**: Credentials must come from `.env` only - never hardcoded.
- **API/Auth**: Spotify Web API remains source of truth for now-playing and playback position.
- **UI System**: Use shadcn/ui components; do not replace with another design system in this milestone.
- **Theming**: Light and dark themes are required from first implementation phase.
- **Responsiveness**: UI must work on desktop and mobile viewports.
- **Scope**: Do not modify non-planning files during milestone initialization.

## Current State

- Milestone v1.0 complete (Phases 1-4).
- Milestone v1.1 complete (Phases 5-8 and inserted Phase 07.1).
- Milestone v1.2 initialized for immersive fullscreen lyrics experience.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep Spotify Web API as playback source during web migration | Preserves validated sync core while changing delivery surface | - Pending |
| Start v1.1 with light and dark themes in initial build | User requirement and reduces later redesign churn | - Pending |
| Use shadcn/ui in web milestone and install at implementation kickoff | Maintains component consistency and speeds polished UI delivery | - Pending |
| Build immersive fullscreen mode as a dedicated page rather than incremental tweaks to the existing shell | Protects focused visual language without compromising utility shell workflows | - Pending |
| Prioritize typographic lyric hero treatment over panel/card UI in v1.2 | Matches user direction for premium cinematic reading experience | - Pending |

---
*Last updated: 2026-03-20 after milestone v1.2 initialization*
