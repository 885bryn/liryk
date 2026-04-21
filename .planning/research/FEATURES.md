# Feature Research

**Domain:** In-fullscreen developer activity panel overlay for a real-time lyrics sync app
**Researched:** 2026-04-17
**Confidence:** HIGH (based on direct codebase inspection plus established dev overlay patterns)

---

## Feature Landscape

### Table Stakes (Users Expect These)

These are the features the developer (sole user of this panel) will assume exist. Missing any of these makes the panel useless for its stated purpose: observing app behavior without leaving fullscreen.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Toggle button in fullscreen | Panel must be accessible without leaving fullscreen mode | LOW | A toggle already exists for timing diagnostics (`fullscreen-diagnostics-toggle`). The new panel toggle follows the same fixed-position pattern. Button goes left side, below the existing diagnostics toggle. |
| Real-time scrolling event log | The whole point — see what happened and when | MEDIUM | A scrolling `<ul>` or `<div>` with auto-scroll-to-bottom behavior. Needs bounded max entries (ring buffer, ~200 entries) to avoid memory growth over long sessions. |
| Timestamps on each entry | Without timestamps, ordering and latency are unreadable | LOW | Relative timestamps (`+0.3s`, `+1.2s` from panel open) or wall-clock `HH:MM:SS.mmm`. Relative-from-session-start is most useful for diffing poll intervals. |
| Event category labels | Log will contain mixed event types; scanning is impossible without them | LOW | Category prefix on each entry: `[POLL]`, `[LYRICS]`, `[AUTH]`, `[SYNC]`, `[NAV]`, `[ERROR]`. Color-code by category in the overlay. |
| Non-disruptive styling | Panel must not obscure lyrics content, must feel like a dark-theme terminal | LOW | Semi-transparent dark panel, same `bg-black/60 backdrop-blur-sm` language already used by the existing diagnostics section. Max width ~300-360px, anchored to left edge, below the diagnostics toggle. |

### Differentiators (Competitive Advantage)

Features that make this panel genuinely useful as a debugging instrument beyond a simple log dump.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Category filter toggles | Playback polling is noisy (fires every 4s); filtering to `[LYRICS]` or `[AUTH]` isolates what matters without clearing the log | MEDIUM | A small row of toggle-able pill buttons per category. State lives in component, not persisted. Hiding a category suppresses display, not capture — entries are still buffered. |
| Drift delta inline on poll entries | The existing polled/estimated/drift values from `LiveSyncUiState` are already computed; surfacing drift inline on each `[POLL]` entry adds immediate visibility to timing health | LOW | Pull `driftDeltaMs` and `correctionState` from existing state. Format as `drift: +12ms (synced)`. No new computation needed. |
| Track change events highlighted | Track changes are the most important moments in lyrics sync — when they happen is critical to validate | LOW | `[SYNC] track-changed: <trackId>` shown in a distinct color (e.g. `text-yellow-400/80`). Already classifiable from `PlaybackTransitionKind` emitted by `playback-runtime.ts`. |
| Log clear button | Long sessions accumulate hundreds of entries; a single-click clear without closing the panel | LOW | A small `Clear` link in the panel header. Sets the buffer back to empty. |
| Copy-to-clipboard button | Developer wants to paste a log snippet for a bug report without leaving fullscreen | LOW | `navigator.clipboard.writeText(entries.map(format).join('\n'))`. Adds a `Copy` button to the panel header. Show brief "Copied!" feedback. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Persistent log across page reloads | "I want to see what happened before the reload" | Requires `localStorage` writes on every event; auth tokens and track IDs land in storage unexpectedly; adds complexity with no payoff since reload clears all runtime state anyway | Use Copy-to-clipboard before reloading |
| Network request inspector / HAR recording | Full visibility into Spotify API calls | Would require intercepting `fetch`, adding proxy wrapper around the lrclib client and Spotify client — intrusive and fragile; Spotify 429s are already surfaced through `logDiagnostic` in `shared-playback-runtime.ts` | Surface the specific `rate_limited` and `transient_error` events that already exist |
| Editable/injectable log entries | "Let me annotate what I was doing at a point in time" | Adds UI complexity and interaction surface that conflicts with the read-only immersive context | Add a one-sentence note via browser console if needed; not worth panel complexity |
| Resizable/draggable panel | "Let me move it out of the way" | Drag interactions conflict directly with the scroll-to-browse lyrics gesture; the whole fullscreen surface is a scroll target | Fixed position with semi-transparency is sufficient; panel is narrow enough to avoid lyrics in the center column |
| Real-time chart / graph of drift over time | Visual trend of drift values | Complex to implement; the existing timing diagnostics section already shows current values; history can be inferred from log entries | Include drift value inline in each `[POLL]` log entry; developer can spot-check trend |
| Per-line lyric sync validation overlay | Show whether each line fired at the right ms | Requires instrumentation at the sync engine frame level; very noisy (fires on every animation frame) and would drown out meaningful events | A single `[SYNC] active-line: 12 @ 45320ms` on line change events is sufficient |

---

## Feature Dependencies

```
Toggle button (open/close panel)
    └──renders──> Panel container
                     └──requires──> Event bus / log buffer
                                        └──depends on──> Runtime event sources (see below)

Category filter toggles
    └──filters──> Log buffer display (does NOT affect capture)

Copy-to-clipboard
    └──reads──> Log buffer (formatted, full unfiltered buffer)

Drift delta inline display
    └──reads──> LiveSyncUiState.driftDeltaMs + correctionState (already computed in FullscreenLyricsPage)

Track change highlight
    └──reads──> PlaybackTransitionKind from playback-runtime.ts (already emitted per poll)
```

### Runtime Event Sources (existing, no new computation needed for MVP)

The following event sources already exist in the codebase and can be tapped with zero new runtime computation:

- `shared-playback-runtime.ts` — `logDiagnostic("request"|"stop"|"start"|"rate_limited"|"transient_error", ...)` is already called at every poll lifecycle moment. Replace `console.info` with a bus emit here to get `[POLL]` and `[ERROR]` categories.
- `playback-runtime.ts` — `emit({ snapshot, transition })` fires on every poll result. Subscribe to this for `[POLL]` result entries and `[SYNC] track-changed` events.
- `lyrics-resolution-runtime.ts` — `liveSyncStore.setStatusLine(...)` transitions (`"Resolving lyrics..."`, `"Lyrics ready"`, `"Lyrics not found"`, `"Refreshing cached lyrics..."`) map directly to `[LYRICS]` log events.
- `live-sync-runtime.ts` — `correctionState: "hard-reset"` assignment is the most critical sync health event. Surface as `[SYNC] hard-reset`.
- `use-web-auth-runtime.ts` / `auth-runtime.ts` — Token refresh and session state changes are `[AUTH]` events.
- `FullscreenLyricsPage` — `isLiveLocked` transitions (user scrolled away, Back to Live pressed) are `[NAV]` events.

### Dependency Notes

- **Log buffer requires event bus**: The panel component cannot directly subscribe to module-level singletons without coupling. A lightweight module-level event emitter (`DevActivityBus`, a plain `Set<listener>` with an `emit(entry)` function) is the correct approach. Runtime modules call `devActivityBus.emit(...)` at their existing instrumentation points. The panel subscribes in `useEffect`. Zero framework dependency.
- **Filter toggles depend on category labels**: Categories must be assigned at capture time, not display time.
- **Copy-to-clipboard exports full buffer**: Copy exports all buffered entries, not the filtered view. This is intentional — you want everything when filing a bug.

---

## MVP Definition

### Launch With (v1 — this milestone)

- [ ] Toggle button, fixed-position in fullscreen, matches existing ghost-button style — entry point to the panel
- [ ] Panel container with semi-transparent dark styling, bounded height with internal scroll, does not overlap lyrics center column
- [ ] Real-time event log with wall-clock timestamps and category prefixes
- [ ] Six event categories surfaced: `[POLL]` (Spotify playback polls), `[LYRICS]` (resolution lifecycle), `[AUTH]` (token/session changes), `[SYNC]` (track changes, hard-reset corrections), `[NAV]` (live-lock toggle, Back to Live), `[ERROR]` (rate limits, transient errors)
- [ ] Bounded ring buffer (200 entries max) with auto-scroll to bottom
- [ ] Log clear button

### Add After Validation (v1.x)

- [ ] Category filter toggles — add when the log proves noisy in practice; `[POLL]` fires every 4 seconds so it dominates quickly
- [ ] Copy-to-clipboard — add when copy-paste of log evidence is needed for bug reports
- [ ] Drift delta inline on `[POLL]` entries — add when timing regression investigations begin; depends on how valuable the existing diagnostics section proves to be

### Future Consideration (v2+)

- [ ] Panel width/position configurability — defer until there is a mobile use case that justifies it
- [ ] Export log to file — defer until the developer needs to share logs formally

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Toggle button | HIGH | LOW | P1 |
| Panel container + styling | HIGH | LOW | P1 |
| Real-time log with timestamps + categories | HIGH | MEDIUM | P1 |
| Ring buffer + auto-scroll | HIGH | LOW | P1 |
| Log clear button | HIGH | LOW | P1 |
| `[POLL]` events (Spotify poll lifecycle) | HIGH | LOW | P1 |
| `[LYRICS]` events (resolution lifecycle) | HIGH | LOW | P1 |
| `[SYNC]` track-change + hard-reset events | HIGH | LOW | P1 |
| `[AUTH]` session events | MEDIUM | LOW | P1 |
| `[NAV]` live-lock toggle events | MEDIUM | LOW | P1 |
| `[ERROR]` rate-limit / transient error events | HIGH | LOW | P1 |
| Category filter toggles | HIGH | MEDIUM | P2 |
| Drift delta inline on poll entries | MEDIUM | LOW | P2 |
| Copy-to-clipboard | MEDIUM | LOW | P2 |
| Track change highlight color | LOW | LOW | P2 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Implementation Notes (Dependencies on Existing Architecture)

### DevActivityBus: Recommended Approach

A module-level singleton at `src/infra/dev/activity-bus.ts`:

```ts
// A plain pub/sub ring buffer. Zero external dependencies.
type DevEntry = { ts: number; category: string; message: string };
type Listener = (entry: DevEntry) => void;
```

Runtime modules call `devBus.emit(...)` at their existing instrumentation points. The panel component subscribes in `useEffect` and appends to a local state array (capped at 200). This keeps runtime modules decoupled from the panel's React lifecycle.

The `logDiagnostic` function in `shared-playback-runtime.ts` is already the single instrumentation point for poll lifecycle — routing it through the bus is a one-line change and handles `[POLL]` and `[ERROR]` with no structural change to polling logic.

### Panel Position Constraint

The existing fullscreen layout occupies these zones:
- Top-left: "Exit Fullscreen Lyrics" (`top-3 left-4`)
- Below that: "Show Diagnostics" toggle (`top-10 left-4`)
- Below that: Diagnostics panel when open (`top-16 left-4`, fixed `min-w-[220px]`)
- Bottom-right: "Back to Live" button
- Top-right: Track metadata + karaoke controls

The dev panel toggle should sit below the diagnostics toggle (approximately `top-[4.5rem] left-4`) and the panel opens further below it. A `max-w-[300px]` or `max-w-[320px]` panel anchored left does not overlap the center lyrics column (`max-w-3xl` centered) on any viewport with normal side margins. On narrow mobile, the panel and lyrics column will share horizontal space — cap panel height and ensure it uses `pointer-events-none` when closed so it cannot intercept scroll gestures.

### Log Entry Format

```
[HH:MM:SS.mmm] [CATEGORY] message text
```

Example entries:
```
[00:01:23.045] [POLL]   request pollerId=playback-poller-1 subscribers=1
[00:01:23.201] [POLL]   result isPlaying=true trackId=abc123 progressMs=45320 nextIn=4000ms
[00:01:23.205] [LYRICS] resolved trackId=abc123 source=lrclib renderMode=synced lines=42
[00:01:35.000] [SYNC]   track-changed trackId=xyz789 transition=track_change
[00:01:35.002] [LYRICS] resolving trackId=xyz789
[00:01:40.201] [ERROR]  rate_limited retryAfterMs=30000
[00:02:11.000] [NAV]    live-lock-lost (user scrolled)
[00:02:14.500] [NAV]    live-lock-restored (Back to Live)
[00:02:14.500] [AUTH]   token-refreshed expiresIn=3600s
[00:02:30.000] [SYNC]   hard-reset drift=+2400ms
```

---

## Sources

- Codebase: `src/web/fullscreen-lyrics-page.tsx` — existing diagnostics panel, toggle button placement, styling conventions, `showDiagnostics` state pattern
- Codebase: `src/web/playback/shared-playback-runtime.ts` — `logDiagnostic` call sites, poll lifecycle events, rate-limit and transient-error paths
- Codebase: `src/app/playback-runtime.ts` — `PlaybackTransitionKind`, emit pattern, per-poll event structure
- Codebase: `src/app/lyrics-resolution-runtime.ts` — resolution lifecycle status messages, cache hit/miss/stale paths
- Codebase: `src/app/live-sync-runtime.ts` — `hard-reset` correction state, ticker lifecycle
- Codebase: `src/state/playback/live-sync-store.ts` — `LiveSyncUiState` shape, all diagnostic fields
- Codebase: `src/app/auth-runtime.ts` — session lifecycle events
- Reference patterns: Chrome DevTools overlay, Eruda mobile console, React Query Devtools, Vite HMR overlay (panel-on-dark-background, toggle button, ring buffer, category filter)

---

*Feature research for: In-fullscreen developer activity panel (Liryk v1.6)*
*Researched: 2026-04-17*
