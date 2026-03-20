# Requirements: Spotify Live Lyrics Desktop App

**Defined:** 2026-03-19
**Core Value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Session

- [ ] **AUTH-01**: User can connect their Spotify account through OAuth PKCE without entering credentials into the app
- [ ] **AUTH-02**: User stays connected across app restarts through secure token refresh handling

### Playback Detection

- [ ] **PLAY-01**: User can see lyrics tied to the currently playing Spotify track without requiring Spotify Premium
- [ ] **PLAY-02**: User sees lyric sync update based on current playback position (`progress_ms`) while a track is playing
- [ ] **PLAY-03**: User sees lyric sync react correctly when playback is paused, resumed, skipped, or seeked

### Lyrics Retrieval & Matching

- [ ] **LYR-01**: User gets lyrics fetched from internet sources for the active Spotify track
- [ ] **LYR-02**: User gets the best-matching lyric version using track metadata (title, artist, album, duration)
- [ ] **LYR-03**: User gets timestamped lyrics when available, with plain-lyrics fallback when timestamps are unavailable
- [ ] **LYR-04**: User sees "Lyrics not found" when no usable lyrics are available

### Live Sync Experience

- [ ] **SYNC-01**: User sees the correct lyric line highlighted in real time during playback
- [ ] **SYNC-02**: User sees the lyrics view auto-scroll to keep the active line in view as the song progresses

### Internationalization & Rendering

- [ ] **I18N-01**: User can read lyrics in any supported UTF-8 language, including CJK, Arabic, and Korean scripts

### Cache & Performance

- [ ] **CACH-01**: User gets faster repeat lyric loads through local cache keyed by Spotify track ID
- [ ] **CACH-02**: User gets fresh lyric updates when cache entries become stale or invalid

### UI & Implementation Constraints

- [ ] **UI-01**: User sees the milestone UI implemented with the project's existing shadcn/ui components

### Security & Configuration

- [ ] **SECU-01**: User's API credentials and tokens are loaded from environment configuration (`.env`) and never hardcoded

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Quality & Power Features

- **QUAL-01**: User can see a sync quality indicator (`Synced`, `Estimated`, `Static`)
- **QUAL-02**: User can apply per-track timing offset correction for imperfect community timestamps
- **DESK-01**: User can use desktop productivity features such as always-on-top mini mode and keyboard navigation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mobile app support | Milestone 1 is explicitly desktop-only |
| Playback control features (play/pause/seek from app) | Not required to validate core live-lyrics value |
| Word-level karaoke highlighting | High complexity and inconsistent data availability; line-level sync is milestone target |
| Multi-provider music services (non-Spotify) | Scope is Spotify-only for milestone reliability |
| Deployment/publishing/distribution pipeline | Explicitly excluded in current milestone constraints |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| PLAY-01 | Phase 2 | Pending |
| PLAY-02 | Phase 2 | Pending |
| PLAY-03 | Phase 2 | Pending |
| LYR-01 | Phase 3 | Pending |
| LYR-02 | Phase 3 | Pending |
| LYR-03 | Phase 3 | Pending |
| LYR-04 | Phase 3 | Pending |
| SYNC-01 | Phase 2 | Pending |
| SYNC-02 | Phase 2 | Pending |
| I18N-01 | Phase 3 | Pending |
| CACH-01 | Phase 4 | Pending |
| CACH-02 | Phase 4 | Pending |
| UI-01 | Phase 3 | Pending |
| SECU-01 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap mapping*
