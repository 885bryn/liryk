# Spotify Live Lyrics Desktop App

## What This Is

A desktop app that mirrors Spotify's live lyrics experience for any currently playing track. It detects the active Spotify song and playback position, fetches matching lyrics from internet sources, and highlights lines in sync with auto-scroll. Milestone 1 focuses on end-to-end lyric sync reliability across songs and languages.

## Core Value

When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Detect currently playing Spotify track and playback position on desktop via Spotify Web API OAuth PKCE
- [ ] Fetch lyrics for the exact track version from internet sources, prioritizing timestamped lyrics
- [ ] Highlight lyric lines in real time based on playback position and keep view auto-scrolled
- [ ] Support multilingual lyric rendering (UTF-8, non-Latin scripts)
- [ ] Gracefully handle missing lyrics by showing "Lyrics not found"
- [ ] Cache lyrics locally by Spotify track ID to reduce redundant lookups

### Out of Scope

- Mobile apps (iOS/Android) - milestone is desktop-only
- Publishing/deployment/distribution setup - explicitly excluded for this milestone
- Replacing shadcn/ui with another UI library - existing installed UI stack must be used

## Context

- Target milestone is a working desktop experience equivalent to Spotify-style live lyric progression.
- Track detection must not require Spotify Premium.
- Accuracy depends on timestamped lyric sources (for example lrclib.net) with fallback behavior when only plain lyrics are available.
- Existing project direction requires use of shadcn/ui components already installed in this repository.

## Constraints

- **Security**: Credentials must come from `.env` only - never hardcoded
- **API/Auth**: Spotify Web API with OAuth PKCE for current track and playback position
- **Lyrics Data**: Prioritize timestamped lyrics; fallback to estimated timing for plain lyrics
- **Caching**: Store lyrics locally by track ID to avoid redundant requests
- **Compatibility**: Must render multilingual UTF-8 lyrics including CJK, Arabic, and Korean scripts
- **UX Fallback**: Show "Lyrics not found" when no lyrics source succeeds
- **Scope**: Do not modify files outside this project directory

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Spotify Web API + OAuth PKCE for playback state | Required to detect currently playing track and playback position securely | - Pending |
| Timestamped lyrics first, plain lyrics fallback second | Best path to accurate sync while preserving broad song coverage | - Pending |
| Local lyrics cache keyed by Spotify track ID | Reduces repeated network calls and improves responsiveness | - Pending |
| shadcn/ui as required UI component system | Project constraint and consistency with existing setup | - Pending |

---
*Last updated: 2026-03-19 after initialization*
