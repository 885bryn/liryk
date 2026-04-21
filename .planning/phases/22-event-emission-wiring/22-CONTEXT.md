# Phase 22: Event Emission Wiring - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire `appendLogEntry` calls for three runtime event categories into `FullscreenLyricsPage`: lyrics fetch lifecycle (DEV-04), Spotify sync state changes (DEV-05), and playback clock hard resets (DEV-06). The ring buffer, panel component, and auth events are already wired from Phase 21 — this phase adds the remaining event sources only.

Requirements: DEV-04, DEV-05, DEV-06

</domain>

<decisions>
## Implementation Decisions

### Lyrics fetch events (DEV-04)
- Fire on result only — no fetch-start entry. One entry per track load.
- No cache-hit detection: the current architecture has no explicit cache lookup before `resolveLyricsForTrack`. Log the network result only.
- Entry messages by sourceState:
  - `sourceState: "synced"` → `[LYRICS] Synced lyrics (lrclib)` with `category: "lyrics"`
  - `sourceState: "plain"` → `[LYRICS] Plain lyrics (lrclib)` with `category: "lyrics"`
  - `sourceState: "low-confidence"` → `[LYRICS] Low-confidence lyrics (lrclib)` with `category: "lyrics"`
  - `sourceState: "not-found"` → `[LYRICS] No lyrics found` with `category: "lyrics"`
  - catch block (exception) → also `[LYRICS] No lyrics found` with `category: "lyrics"` (single message covers both failure modes)
- Wiring: call `appendLogEntry` inside the existing `resolve()` async function in the `useEffect` at line 688, immediately after `setResolvedLyrics(resolved)` and inside the catch block

### Spotify sync events (DEV-05)
- Log meaningful state changes only — silent poll ticks produce no entry
- Events to log:
  - `nowPlaying?.trackId` change while non-null → `[SYNC] Track changed` with `category: "sync"`
  - `playbackSnapshot?.isPlaying` flips false→true → `[SYNC] Playback resumed` with `category: "sync"`
  - `playbackSnapshot?.isPlaying` flips true→false → `[SYNC] Playback paused` with `category: "sync"`
  - `nowPlaying` becomes null (nothing playing) → `[SYNC] No active playback` with `category: "sync"`
- Wiring: separate `useEffect` instances (one per event type) watching the reactive state from `useSharedPlayback` — consistent with the auth event useEffect pattern from Phase 21. Use sentinel refs (initialized to a sentinel value, not `undefined`) so the initial render does not fire a spurious entry.

### Playback clock events (DEV-06)
- Log hard resets only — soft drift corrections produce no entry
- Hard reset detected via `useEffect` watching `syncState.correctionState` or a relevant field of `syncState` — no modification to the rAF loop
- Entry message: `[CLOCK] Hard reset` with `category: "clock"`
- Note: `syncState` is the diagnostics state object computed at lines ~357–366 in `fullscreen-lyrics-page.tsx`. The `correctionState` field transitions between "static" and "synced". A snap event changes `trackId` or jumps the `activeLineIndex` — the effect should watch `syncState.trackId` or a field that changes on snap, not the frame-by-frame `driftDeltaMs`.
- Claude's discretion: exact field(s) of syncState to watch for reliable hard-reset detection (read the rAF snap logic at line 461 to find the right signal)

### Event message format
- Carry forward Phase 21 pattern: `[CATEGORY] short human-readable label`
- Category prefixes: `[LYRICS]`, `[SYNC]`, `[CLOCK]`
- Timestamp format: `HH:MM:SS` (set by `useDevActivityLog` hook automatically — no manual timestamp needed in message)
- Category values passed to `append()`: `"lyrics"`, `"sync"`, `"clock"` (matching the `DevLogEntry.category` union type)

### Claude's Discretion
- Exact field(s) of `syncState` to watch for clock hard-reset detection
- Whether to include drift delta ms in the `[CLOCK] Hard reset` message (e.g., `[CLOCK] Hard reset (+320ms)`) — acceptable if it adds diagnostic value without cluttering
- Exact `useEffect` dependency arrays for each Spotify sync event (the minimum correct deps to avoid spurious fires)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Primary integration file
- `src/web/fullscreen-lyrics-page.tsx` — All three event wiring targets live here. Lyrics fetch: lines 688–722 (useEffect with `resolveLyricsForTrack`). Spotify sync: `sharedPlayback.nowPlaying` and `sharedPlayback.playbackSnapshot` (lines 133–139). Clock drift: `syncState` object (lines 357–366), snap logic at line 461.

### Phase 21 wiring pattern (auth events — template to follow)
- `src/web/dev-activity-panel/use-dev-activity-log.ts` — `DevLogEntry` type, `append()` signature, category union type
- `src/web/dev-activity-panel/dev-activity-panel.tsx` — Existing panel component (no changes needed)

### Shared playback runtime (Spotify events)
- `src/web/playback/shared-playback-runtime.ts` — Poller that drives `nowPlaying` and `playbackSnapshot`. Subscribe via `useSharedPlayback` — do not modify this module.
- `src/web/use-shared-playback.ts` — Hook that exposes reactive sharedPlayback state to the component

### Lyrics resolver (lyrics events)
- `src/core/lyrics/lyrics-resolver.ts` — `resolveLyricsForTrack` return type: `ResolvedLyrics` with `sourceState` field
- `src/core/lyrics/types.ts` — `LyricsSourceState` union ("synced" | "plain" | "low-confidence" | "not-found" | "loading")

### Requirements
- `.planning/REQUIREMENTS.md` — DEV-04, DEV-05, DEV-06 definitions and acceptance criteria

### Tests to extend
- `src/web/fullscreen-lyrics-page.test.tsx` — Existing test file where new integration tests for these three event categories should be added

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useDevActivityLog` hook (`src/web/dev-activity-panel/use-dev-activity-log.ts`): exposes `{ entries, append }` — already instantiated in `FullscreenLyricsPage` from Phase 21. Call `append({ category: "lyrics"|"sync"|"clock", message: "..." })`.
- Phase 21 auth event useEffect pattern (lines ~724–760 in fullscreen-lyrics-page.tsx): sentinel ref initialized to a sentinel value, useEffect dep on auth state, call `append(...)` inside. Use this exact pattern for Spotify sync events.

### Established Patterns
- All event wiring uses `useEffect` — no rAF loop modification, no callbacks into shared modules
- Sentinel refs (initialized to an impossible initial value, not `undefined`) prevent spurious fires on mount — mandatory for Spotify and clock events

### Integration Points
- Lyrics: inside `resolve()` at line 699, after `await resolveLyricsForTrack(...)` resolves and in the catch block
- Spotify sync: new `useEffect` instances watching `sharedPlayback.nowPlaying?.trackId` and `playbackSnapshot?.isPlaying`
- Clock: new `useEffect` watching the relevant field of `syncState` that changes on snap (investigate lines 357–366 and 461)

</code_context>

<specifics>
## Specific Ideas

- The developer should be able to see a complete operational trace in the log: track starts playing → lyrics fetched → sync events as they play → occasional clock hard resets if drift is detected. All three categories in chronological order.
- "[CLOCK] Hard reset (+320ms)" style (with delta) is acceptable if it adds diagnostic value — Claude's discretion.

</specifics>

<deferred>
## Deferred Ideas

- Soft drift correction log entries — deferred to future milestone (DEV-F4 territory)
- Cache-hit logging — deferred until a proper lyrics cache layer is added to the architecture
- Per-poll tick logging — deferred (too noisy for current use case; future DEV-F1 filter could make it useful)

</deferred>

---

*Phase: 22-event-emission-wiring*
*Context gathered: 2026-04-19*
