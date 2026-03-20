# Feature Research

**Domain:** Desktop companion app for Spotify-synced live lyrics
**Researched:** 2026-03-19
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Spotify sign-in with minimal permissions | Users expect desktop companion apps to connect quickly and safely | MEDIUM | Use OAuth PKCE with `user-read-currently-playing`/`user-read-playback-state`; token refresh is mandatory for session continuity |
| Reliable now-playing + progress detection | Core promise is "show current lyric at current moment" | MEDIUM | Must handle `200/204/401/429`, active device changes, and no-playback state without UI jitter |
| Version-aware lyric matching (track, artist, album, duration) | Users notice immediately when lyrics are from the wrong version/remix/live cut | HIGH | Match by metadata and cache by Spotify track ID; keep fallback path when strict match fails |
| Real-time line highlight + auto-scroll | This is the defining Spotify-style behavior on desktop | HIGH | Parse `syncedLyrics` timestamps (LRC-style), center active line, smooth scroll, and keep drift correction loop |
| State-aware sync (pause, seek, skip, resume) | Users expect highlight to freeze/resume instantly with playback controls | HIGH | On seek/skip, recompute active line from `progress_ms`; do not animate through old lines |
| Graceful fallback for missing or unsynced lyrics | Lyrics are not available for all tracks/devices/markets | MEDIUM | Show explicit "Lyrics not found" state; if only plain lyrics exist, show static/estimated mode with clear labeling |
| Multilingual lyric rendering (UTF-8 + RTL-safe) | Global catalogs include CJK, Arabic, Korean, mixed punctuation | MEDIUM | Font fallback, line wrapping, and RTL text direction testing are required in v1 |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Sync quality badge (`Synced`, `Estimated`, `Static`) | Sets correct user expectations and reduces "app is broken" reports | LOW | Driven directly by lyric source payload (`syncedLyrics` vs `plainLyrics`) |
| Per-song timing offset correction | Fixes small drift on imperfect community timestamps and long sessions | MEDIUM | Store local offset by Spotify track ID; apply before active-line resolution |
| Multi-source lyrics resolver with confidence score | Improves coverage while preserving accuracy-first behavior | HIGH | Query primary source first, then fallback source chain; attach provenance and confidence for debugging |
| Desktop-focused controls (keyboard jump to current line, always-on-top mini mode) | Makes the app feel purpose-built for desktop instead of a web port | MEDIUM | Ship after core reliability is stable; avoid adding playback control scope in v1 |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Word-by-word karaoke highlighting in v1 | Looks flashy and "more premium" | Requires word-level timing data not consistently available; large complexity spike for marginal MVP learning | Stick to line-level sync with excellent timing stability |
| Built-in lyric editor/crowdsourcing at launch | Users want to fix bad lyrics directly | Moderation, abuse, legal, and data quality workflows will dominate roadmap | Add lightweight "Report bad sync/lyrics" signal only |
| Playback-control heavy scope (play/pause/seek from app) | Feels like a full player replacement | Adds extra permissions and UX edge cases while not improving core lyric validation | Keep app read-only for playback state in v1 |
| Cross-service support (Apple Music, YouTube Music, local files) in MVP | Broader audience appeal | Multiplies auth/device/metadata edge cases before Spotify flow is stable | Nail Spotify path first, then add provider abstraction in v2 |

## Feature Dependencies

```
[Spotify OAuth PKCE]
    └──requires──> [Now-playing + progress polling]
                        └──requires──> [State-aware sync engine (pause/seek/skip)]
                                             └──requires──> [Line highlight + auto-scroll]

[Metadata normalization + version match]
    └──requires──> [Lyrics fetch pipeline]
                        └──requires──> [Cache by Spotify track ID]

[Lyrics source result type]
    └──drives──> [Sync quality badge]

[Multilingual rendering]
    └──enhances──> [Line highlight + auto-scroll]

[Playback-control heavy scope] ──conflicts──> [Read-only MVP focus]
[Word-level karaoke in v1] ──conflicts──> [Fast reliability-first delivery]
```

### Dependency Notes

- **Spotify OAuth PKCE requires now-playing polling:** no authorized playback state means no sync baseline.
- **State-aware sync requires now-playing progress:** pause/seek/skip handling depends on accurate `progress_ms` and playback timestamp.
- **Line highlight requires sync engine first:** rendering is easy; correctness under track changes is the hard dependency.
- **Version match requires metadata normalization:** without normalized title/artist/album/duration, wrong lyric version selection is common.
- **Sync quality badge depends on source result type:** badge logic is deterministic only when source payload distinguishes synced/plain lyrics.
- **Playback control scope conflicts with read-only MVP:** it adds API and UX complexity without validating the core lyric value proposition.

## MVP Definition

### Launch With (v1)

Minimum viable product - what's needed to validate the concept.

- [ ] Spotify OAuth PKCE + reconnect flow - mandatory to access current playback state reliably.
- [ ] Reliable now-playing detection and playback progress tracking - foundation for all lyric sync behavior.
- [ ] Version-aware lyric fetch with timestamp-first strategy - prevents visibly wrong lyric matches.
- [ ] Real-time line highlight and smooth auto-scroll - core user-perceived value.
- [ ] Pause/seek/skip resilient sync behavior - required for "feels native" Spotify-style UX.
- [ ] Missing-lyrics fallback (`Lyrics not found`) + plain-lyrics fallback mode - avoids dead-end UX.
- [ ] Local cache keyed by Spotify track ID - improves responsiveness and reduces repeated lookups.
- [ ] Multilingual rendering baseline (UTF-8 and RTL-safe layout) - prevents major global usability failures.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Sync quality badge + source attribution - add when support tickets show ambiguity about lyric quality.
- [ ] Per-song timing offset adjustment - add when mismatch complaints cluster on specific tracks.
- [ ] Keyboard shortcuts and mini always-on-top mode - add when desktop power-user usage is confirmed.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Multi-provider playback detection (non-Spotify) - defer until Spotify flow has strong reliability metrics.
- [ ] Community lyric correction workflows - defer until moderation/legal approach is explicitly funded.
- [ ] Word-level karaoke highlighting - defer until dependable word-timed datasets are available at scale.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Spotify OAuth PKCE + token lifecycle | HIGH | MEDIUM | P1 |
| Now-playing + progress detection | HIGH | MEDIUM | P1 |
| Version-aware lyric matching | HIGH | HIGH | P1 |
| Real-time highlight + auto-scroll | HIGH | HIGH | P1 |
| Pause/seek/skip state handling | HIGH | HIGH | P1 |
| Missing lyrics + plain fallback mode | HIGH | MEDIUM | P1 |
| Local cache by track ID | MEDIUM | LOW | P1 |
| Multilingual rendering baseline | HIGH | MEDIUM | P1 |
| Sync quality badge | MEDIUM | LOW | P2 |
| Per-song timing offset correction | MEDIUM | MEDIUM | P2 |
| Always-on-top mini mode | MEDIUM | MEDIUM | P2 |
| Word-level karaoke highlighting | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Competitor A | Competitor B | Our Approach |
|---------|--------------|--------------|--------------|
| Real-time scrolling lyrics | Spotify desktop shows lyrics scrolling in real time during playback | Musixmatch positions synchronized lyrics as a core offering for partners | Match Spotify-style line sync/scroll behavior first; optimize smoothness and correctness over visual effects |
| Availability messaging | Spotify explicitly notes lyrics may not exist for all songs/devices/markets | Musixmatch partnership model implies catalog/licensing coverage varies by integration | Show explicit fallback states (`Lyrics not found`, `Static lyrics`) instead of blank/ambiguous UI |
| Free-tier access expectation | Spotify states lyrics are available to Free and Premium users | Musixmatch serves both direct and partner experiences with varying feature surfaces | Do not require Premium; keep feature available wherever playback state can be read |
| Share/extra social features | Spotify includes lyric sharing, but core value is still live reading | Musixmatch also leans on social/community ecosystem | Defer sharing; prioritize sync reliability and desktop usability in v1 |

## Sources

- Spotify Support: "View lyrics" (availability caveats; Free + Premium mention) - https://support.spotify.com/us/article/lyrics/ (HIGH)
- Spotify Newsroom: 2021 lyrics launch (desktop real-time scrolling behavior; user expectation baseline) - https://newsroom.spotify.com/2021-11-18/you-can-now-find-the-lyrics-to-your-favorite-songs-in-spotify-heres-how/ (MEDIUM)
- Spotify Web API: `Get Currently Playing Track` (playback progress + status fields, response semantics) - https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track (HIGH)
- Spotify Web API: `Get Playback State` (204/429 behavior and playback metadata) - https://developer.spotify.com/documentation/web-api/reference/get-information-about-the-users-current-playback (HIGH)
- Spotify Web API: PKCE tutorial (desktop-safe auth pattern) - https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow (HIGH)
- Spotify Web API: Scopes (minimum required permissions) - https://developer.spotify.com/documentation/web-api/concepts/scopes (HIGH)
- Spotify Web API: Rate limits (`429`, `Retry-After`, rolling window model) - https://developer.spotify.com/documentation/web-api/concepts/rate-limits (HIGH)
- LRCLIB public API example response (`plainLyrics`, `syncedLyrics`, `instrumental` fields) - https://lrclib.net/api/get?track_name=Yellow&artist_name=Coldplay (MEDIUM)
- Musixmatch customer story (Spotify uses synchronized lyrics) - https://about.musixmatch.com/business/customer-stories/spotify (MEDIUM)

---
*Feature research for: Spotify-synced desktop live lyrics app*
*Researched: 2026-03-19*
