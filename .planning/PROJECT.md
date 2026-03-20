# Spotify Live Lyrics Web App

## What This Is

Liryk is a browser-based Spotify companion that shows synced lyrics for the currently playing track. It keeps the core value from v1.0 (correct line at the correct moment) while shifting delivery from desktop runtime boundaries to a responsive web app experience. Milestone v1.1 focuses on web foundation, polished visual design, and first-class light/dark theming.

## Core Value

When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.

## Current Milestone: v1.1 Web App Foundation and Theming

**Goal:** Convert the experience into a polished web app with responsive layout, light/dark themes, and shadcn/ui-driven interface consistency.

**Target features:**
- Browser-accessible app shell that replaces desktop-only delivery assumptions
- Aesthetic, responsive lyrics interface with intentional typography and visual hierarchy
- Light and dark theme support with user toggle and persisted preference
- Explicit shadcn/ui setup checkpoint during implementation (install immediately after web scaffold and Tailwind base setup)

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

- [ ] Deliver web app foundation and browser runtime wiring for the existing lyrics experience
- [ ] Ship light/dark theme system with persistent user preference
- [ ] Implement milestone UI with shadcn/ui components after explicit install checkpoint
- [ ] Improve visual polish (layout, typography, spacing, and interaction states) for desktop and mobile web

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
- Milestone v1.1 initialized for web app conversion and theming.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep Spotify Web API as playback source during web migration | Preserves validated sync core while changing delivery surface | - Pending |
| Start v1.1 with light and dark themes in initial build | User requirement and reduces later redesign churn | - Pending |
| Use shadcn/ui in web milestone and install at implementation kickoff | Maintains component consistency and speeds polished UI delivery | - Pending |

---
*Last updated: 2026-03-20 after milestone v1.1 initialization*
