# Roadmap: Spotify Live Lyrics Desktop App

## Overview

This roadmap delivers the core milestone outcome in dependency order: secure Spotify connection and playback state, trustworthy real-time lyric sync behavior, correct lyric retrieval and multilingual rendering, then cache lifecycle performance. Each phase completes a user-verifiable capability and maps all v1 requirements exactly once.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Spotify Connection Foundation** - Users securely connect Spotify and maintain a working authenticated session.
- [ ] **Phase 2: Live Playback Sync Engine** - Users get reliable, real-time lyric line progression tied to playback behavior.
- [ ] **Phase 3: Lyrics Resolution and Rendered Experience** - Users receive the best available lyrics with clear fallback states and multilingual rendering.
- [ ] **Phase 4: Cache Freshness and Repeat-Load Performance** - Users get fast repeat loads without stale or invalid lyric results.

## Phase Details

### Phase 1: Spotify Connection Foundation
**Goal**: Users can securely connect Spotify and stay authenticated across restarts so playback data is available.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, SECU-01
**Success Criteria** (what must be TRUE):
  1. User can connect their Spotify account via OAuth PKCE without entering Spotify credentials into the app UI.
  2. User remains connected after restarting the desktop app and can continue without reauthorizing each launch.
  3. User secrets and auth configuration are loaded from `.env`, with no hardcoded credentials in shipped behavior.
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md - Secure env validation and Spotify PKCE auth service foundation
- [ ] 01-02-PLAN.md - Connection UX states, trust messaging, and retry/troubleshooting flow
- [ ] 01-03-PLAN.md - Session persistence, startup rehydrate, and disconnect/account switch controls

### Phase 2: Live Playback Sync Engine
**Goal**: Users see lyric progression stay aligned with current Spotify playback timing and controls.
**Depends on**: Phase 1
**Requirements**: PLAY-01, PLAY-02, PLAY-03, SYNC-01, SYNC-02
**Success Criteria** (what must be TRUE):
  1. User sees lyric sync tied to the currently playing Spotify track on desktop without requiring Spotify Premium.
  2. User sees the active lyric line update continuously from playback position while audio is playing.
  3. User sees sync behavior respond correctly when pausing, resuming, skipping tracks, or seeking within a track.
  4. User sees the lyrics viewport automatically keep the active line in view as playback advances.
**Plans**: TBD

### Phase 3: Lyrics Resolution and Rendered Experience
**Goal**: Users receive correct, readable lyrics for the active track with explicit fallback outcomes.
**Depends on**: Phase 2
**Requirements**: LYR-01, LYR-02, LYR-03, LYR-04, I18N-01, UI-01
**Success Criteria** (what must be TRUE):
  1. User gets lyrics fetched for the active Spotify track and receives the best-matching version for that track metadata.
  2. User receives timestamped lyrics when available and still gets usable plain-lyrics display when timestamps are missing.
  3. User sees "Lyrics not found" when no usable lyrics source succeeds for the current track.
  4. User can read rendered lyrics in supported UTF-8 scripts, including CJK, Arabic, and Korean text.
  5. User sees the milestone UI built using the project's existing shadcn/ui component system.
**Plans**: TBD

### Phase 4: Cache Freshness and Repeat-Load Performance
**Goal**: Users get faster repeated lyric loads while still receiving updated results when cached data is stale.
**Depends on**: Phase 3
**Requirements**: CACH-01, CACH-02
**Success Criteria** (what must be TRUE):
  1. User gets noticeably faster lyric retrieval on repeat plays of previously resolved tracks via local cache keyed by Spotify track ID.
  2. User gets refreshed lyric data when cached entries are stale or invalid rather than repeatedly seeing outdated results.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Spotify Connection Foundation | 1/3 | In Progress|  |
| 2. Live Playback Sync Engine | 0/TBD | Not started | - |
| 3. Lyrics Resolution and Rendered Experience | 0/TBD | Not started | - |
| 4. Cache Freshness and Repeat-Load Performance | 0/TBD | Not started | - |
