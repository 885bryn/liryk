# Architecture Research

**Domain:** Desktop live-synced lyrics app (Spotify playback + web lyrics sources)
**Researched:** 2026-03-19
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                           Presentation Layer                             │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐   ┌──────────────────────┐                    │
│  │ Lyrics View (React)  │   │ Playback HUD (React) │                    │
│  └──────────┬───────────┘   └──────────┬───────────┘                    │
│             │                           │                                │
│             └──────────────┬────────────┘                                │
├────────────────────────────┴─────────────────────────────────────────────┤
│                          Application Layer                                │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ Orchestrator: track lifecycle + retry policy + state transitions  │   │
│  └───────┬──────────────────┬──────────────────┬─────────────────────┘   │
│          │                  │                  │                         │
│  ┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼────────┐               │
│  │ Playback      │  │ Lyrics        │  │ Sync Engine     │               │
│  │ Poller        │  │ Resolver      │  │ (time mapping)  │               │
│  └───────┬───────┘  └───────┬───────┘  └───────┬────────┘               │
├──────────┴───────────────────┴──────────────────┴────────────────────────┤
│                            Data Layer                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────┐  │
│  │ Token Store      │  │ Lyrics Cache     │  │ Telemetry/Drift Store  │  │
│  │ (secure local)   │  │ (by track ID)    │  │ (optional local logs)  │  │
│  └──────────────────┘  └──────────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
            │                           │
            ▼                           ▼
    Spotify Web API               Lyrics Providers (LRCLIB first)
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Playback Poller | Poll `/me/player/currently-playing`, normalize `item.id`, `progress_ms`, `timestamp`, `is_playing`, and emit playback snapshots | Timer-driven service with adaptive cadence (fast when playing, slow when paused) + 429 backoff (`Retry-After`) |
| Lyrics Resolver | Resolve best lyric candidate for current track, prioritize timestamped lyrics, parse/normalize LRC, and attach metadata quality score | Provider pipeline (`primary -> fallback`) with deterministic matching on title/artist/duration and cache-first lookup |
| Sync Engine | Convert playback snapshots into stable lyric cursor position and smooth UI progression between polls | Monotonic clock model (`anchorProgressMs + elapsedMonotonicMs`) + periodic re-anchor and seek detection |
| State Store | Hold canonical app state (`idle/loading/ready/not-found/error`) and expose derived selectors for UI | Single client store with immutable state transitions |
| Lyrics Renderer | Render multilingual lines, active-line highlight, and auto-scroll centered on current line | Virtualized list (if needed), `dir` per line/container, font fallback stack for CJK/Arabic/Korean |
| Cache Layer | Persist lyrics by Spotify track ID and resolution fingerprint to avoid repeated web lookups | SQLite or local JSON/IndexedDB with TTL + schema versioning |

## Recommended Project Structure

```text
src/
├── app/                     # App shell, providers, route/window composition
│   ├── boot/                # startup wiring (env, auth bootstrap, store init)
│   └── App.tsx              # top-level layout using shadcn/ui
├── core/                    # Domain logic, framework-agnostic
│   ├── playback/            # Spotify polling, snapshot normalization
│   ├── lyrics/              # Provider clients, matching, parsing, scoring
│   ├── sync/                # Timeline model, drift correction, cursoring
│   └── orchestrator/        # Track lifecycle coordinator
├── state/                   # Global state store, actions, selectors
│   ├── slices/              # playback, lyrics, sync, ui slices
│   └── selectors/           # memoized derivations for UI
├── ui/                      # Presentational components
│   ├── lyrics/              # lyric list, line item, auto-scroll viewport
│   └── playback/            # song meta, playback status, fallback states
├── infra/                   # IO boundaries
│   ├── spotify/             # OAuth PKCE + Spotify API client
│   ├── providers/           # LRCLIB and optional provider adapters
│   ├── cache/               # local persistence adapter
│   └── telemetry/           # metrics/logging sink
└── shared/                  # types, errors, utilities, constants
```

### Structure Rationale

- **`core/`:** keeps timing and matching logic testable without UI or platform coupling.
- **`infra/`:** isolates external API contracts so provider/API changes do not leak across the app.
- **`state/`:** enforces single source of truth for playback/lyrics/sync transitions.
- **`ui/`:** keeps rendering concerns (auto-scroll, RTL, typography) separate from orchestration.

## Architectural Patterns

### Pattern 1: Snapshot + Prediction Sync

**What:** treat Spotify poll responses as anchor snapshots, then predict current playback between polls using a monotonic clock.
**When to use:** always, because polling interval is slower than visual update interval.
**Trade-offs:** smooth and low API load; requires careful re-anchor logic to avoid drift accumulation.

**Example:**
```typescript
type PlaybackAnchor = {
  spotifyTimestampMs: number;
  progressMs: number;
  capturedAtPerfMs: number;
  isPlaying: boolean;
};

function estimateProgressMs(anchor: PlaybackAnchor, nowPerfMs: number): number {
  if (!anchor.isPlaying) return anchor.progressMs;
  return anchor.progressMs + Math.max(0, nowPerfMs - anchor.capturedAtPerfMs);
}
```

### Pattern 2: Provider Chain with Quality Scoring

**What:** resolve lyrics via ordered providers and choose candidate by confidence score (track ID match > ISRC/duration proximity > fuzzy title/artist).
**When to use:** when source quality varies and timestamped lyrics are not guaranteed.
**Trade-offs:** higher hit rate and deterministic behavior; more up-front implementation complexity.

**Example:**
```typescript
type Candidate = { synced: boolean; durationDeltaMs: number; source: string };

function score(c: Candidate): number {
  return (c.synced ? 100 : 40) - Math.min(30, Math.floor(c.durationDeltaMs / 1000));
}
```

### Pattern 3: Event-Driven Track Session Orchestrator

**What:** create a per-track session that owns fetch, parse, cache, and sync state; reset atomically on track change/seek.
**When to use:** when multiple async tasks can overlap and stale results must be ignored.
**Trade-offs:** prevents race conditions; requires explicit cancellation and session IDs.

## Data Flow

### Request Flow

```text
[Playback Poll Tick]
    ↓
[Playback Poller] → [Spotify Client] → [/me/player/currently-playing]
    ↓
[Normalized Snapshot] → [Orchestrator]
    ↓
[Track Changed?] ── yes ──> [Lyrics Resolver] → [Cache] → [Provider API]
    │                                   ↓
    no                                  [Parsed Timeline]
    │                                   ↓
    └──────────────→ [Sync Engine Re-anchor] → [State Store] → [UI Render]
```

### State Management

```text
[State Store]
    ↓ subscribe
[Lyrics UI + Playback UI]
    ↑                     ↓
[UI actions]     [Domain actions from orchestrator]
    └────────────→ [Reducers/Mutations] → [State Store]
```

### Key Data Flows

1. **Playback polling flow:** Poll Spotify every ~1s while playing and slower while paused; on 429, pause polling until `Retry-After` then resume.
2. **Lyrics retrieval flow:** On new track ID, check cache; if miss, resolve via primary provider (timestamped first) then fallback; cache normalized result by track ID.
3. **Sync engine flow:** On each animation frame, estimate progress from latest anchor, map to active lyric line, emit line index only when changed.
4. **UI update flow:** Render active line + smooth auto-scroll; avoid full list re-render by selecting derived state (`activeLineId`, `viewportTarget`).

## Suggested Build Order (Milestone: end-to-end sync reliability)

1. **Playback foundation first:** Implement OAuth PKCE, token refresh, and normalized playback poller with logging.
2. **Deterministic sync core second:** Implement anchor/prediction sync engine with seek/skip detection before any complex UI.
3. **Single-provider lyrics path third:** Integrate one timestamped provider (LRCLIB) + parser + "Lyrics not found" fallback.
4. **Track session orchestration fourth:** Add cancellation/session IDs to prevent stale lyrics after rapid track switches.
5. **Cache + multilingual UI fifth:** Add cache-by-track-ID and robust rendering (`dir`, Unicode-safe line handling, font fallback).
6. **Polish and resilience last:** Add adaptive polling, 429 backoff behavior, and drift instrumentation.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Pure desktop-local architecture; direct Spotify + provider APIs; local cache only |
| 1k-100k users | Optional lightweight relay/proxy for provider aggregation, response normalization, and centralized rate-limit shielding |
| 100k+ users | Dedicated backend for provider federation, aggressive caching, and observability pipelines; keep desktop client thin |

### Scaling Priorities

1. **First bottleneck:** external API rate limits and provider variance; fix with adaptive polling + cache + retry discipline.
2. **Second bottleneck:** lyric quality inconsistency; fix with provider scoring, normalization, and manual override/debug tooling.

## Anti-Patterns

### Anti-Pattern 1: "UI time = Spotify progress_ms"

**What people do:** directly bind highlighted line to last polled `progress_ms`.
**Why it's wrong:** creates visible stutter and lag between polls.
**Do this instead:** use snapshot + prediction with periodic re-anchor.

### Anti-Pattern 2: Fire-and-forget lyrics fetches per poll

**What people do:** trigger lyrics resolution on every poll tick.
**Why it's wrong:** redundant network calls, race conditions, and stale UI updates.
**Do this instead:** fetch only on track/session change with cancellation token/session ID.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Spotify Web API | OAuth PKCE + periodic polling of `GET /me/player/currently-playing` | Handle 401/refresh and 429 `Retry-After`; fields `timestamp` + `progress_ms` are sync anchors |
| LRCLIB (or equivalent) | Query by metadata, prefer `syncedLyrics` over plain lyrics | API returns both `plainLyrics` and `syncedLyrics`; parse `[mm:ss.xx]` lines into timeline |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `core/playback` <-> `core/sync` | Typed snapshot events | Keep clock math in sync module only |
| `core/lyrics` <-> `infra/providers` | Interface-based adapter | Enables swapping providers without domain rewrite |
| `core/orchestrator` <-> `state` | Domain actions | Prevent UI components from coordinating async workflows directly |

## Risks and Mitigation

### Timing Drift

- **Risk:** drift accumulates when poll jitter or clock differences cause estimated progress to diverge from actual playback.
- **Mitigation:** re-anchor on every poll using Spotify `timestamp`/`progress_ms`; detect seek if delta exceeds threshold (for example >1200ms) and hard-jump cursor.
- **Mitigation:** use monotonic timing (`performance.now`) for interpolation, not wall-clock time.
- **Mitigation:** track drift metric (`estimatedMs - snapshotProgressMs`) and alert in dev overlay when sustained drift exceeds budget.

### Multilingual Rendering

- **Risk:** broken segmentation/wrapping for scripts without spaces (CJK/Thai) and bidirectional issues for Arabic/Hebrew mixed text.
- **Mitigation:** rely on Unicode-safe strings, use `Intl.Segmenter` for locale-aware segmentation where word-level operations are needed.
- **Mitigation:** set HTML `dir` attribute per line/container instead of forcing CSS `direction`; keep mixed-script punctuation visually correct.
- **Mitigation:** define font fallback chain with broad glyph coverage and test with CJK, Arabic, and Korean fixtures.

## Sources

- Spotify Web API: Get Currently Playing Track (response fields, scopes, 429 behavior): https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track
- Spotify Web API: Rate limits and `Retry-After`: https://developer.spotify.com/documentation/web-api/concepts/rate-limits
- Spotify OAuth PKCE flow: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
- LRCLIB API behavior examples (`plainLyrics`, `syncedLyrics`): https://lrclib.net/api/get?track_name=Bohemian%20Rhapsody&artist_name=Queen
- LRCLIB project overview: https://raw.githubusercontent.com/tranxuanthang/lrclib/master/README.md
- MDN `requestAnimationFrame` timing guidance: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- MDN `performance.now` monotonic clock guidance: https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
- MDN `Intl.Segmenter` locale-sensitive segmentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter
- MDN `dir` vs CSS `direction` guidance: https://developer.mozilla.org/en-US/docs/Web/CSS/direction

---
*Architecture research for: Spotify live synchronized lyrics desktop app*
*Researched: 2026-03-19*
