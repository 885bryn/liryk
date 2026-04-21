# Phase 22: Event Emission Wiring - Research

**Researched:** 2026-04-19
**Domain:** React useEffect event wiring, runtime observability, devtools panel integration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Lyrics fetch events (DEV-04)
- Fire on result only — no fetch-start entry. One entry per track load.
- No cache-hit detection.
- Entry messages by sourceState:
  - `sourceState: "synced"` → `[LYRICS] Synced lyrics (lrclib)` with `category: "lyrics"`
  - `sourceState: "plain"` → `[LYRICS] Plain lyrics (lrclib)` with `category: "lyrics"`
  - `sourceState: "low-confidence"` → `[LYRICS] Low-confidence lyrics (lrclib)` with `category: "lyrics"`
  - `sourceState: "not-found"` → `[LYRICS] No lyrics found` with `category: "lyrics"`
  - catch block → also `[LYRICS] No lyrics found` with `category: "lyrics"`
- Wiring: call `appendLogEntry` inside the existing `resolve()` async function in the `useEffect` at line 688, immediately after `setResolvedLyrics(resolved)` and inside the catch block.

#### Spotify sync events (DEV-05)
- Log meaningful state changes only — silent poll ticks produce no entry.
- Events to log:
  - `nowPlaying?.trackId` change while non-null → `[SYNC] Track changed` with `category: "sync"`
  - `playbackSnapshot?.isPlaying` flips false→true → `[SYNC] Playback resumed` with `category: "sync"`
  - `playbackSnapshot?.isPlaying` flips true→false → `[SYNC] Playback paused` with `category: "sync"`
  - `nowPlaying` becomes null → `[SYNC] No active playback` with `category: "sync"`
- Wiring: separate `useEffect` instances per event type, watching reactive state from `useSharedPlayback`. Use sentinel refs (not `undefined`) to prevent spurious fires on mount.

#### Playback clock events (DEV-06)
- Log hard resets only — soft drift corrections produce no entry.
- `useEffect` watching relevant `syncState` field — no rAF loop modification.
- Entry: `[CLOCK] Hard reset` with `category: "clock"`. Delta ms in message is Claude's discretion.

#### Event message format
- `[CATEGORY] short human-readable label`
- Category prefixes: `[LYRICS]`, `[SYNC]`, `[CLOCK]`
- Category values: `"lyrics"`, `"sync"`, `"clock"`

### Claude's Discretion
- Exact field(s) of `syncState` to watch for clock hard-reset detection
- Whether to include drift delta ms in the `[CLOCK] Hard reset` message
- Exact `useEffect` dependency arrays for each Spotify sync event

### Deferred Ideas (OUT OF SCOPE)
- Soft drift correction log entries
- Cache-hit logging
- Per-poll tick logging
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEV-04 | Panel displays timestamped entries for lyrics fetch events (fetch initiated, cache hit, failure, provider used) | Lyrics resolve useEffect at line 688 is the only wiring point; `resolveLyricsForTrack` returns `ResolvedLyrics` with `sourceState` field; catch block already exists |
| DEV-05 | Panel displays timestamped entries for Spotify sync events (API poll, track change, playback state update) | `nowPlaying` and `playbackSnapshot` are reactive state from `useSharedPlayback`; sentinel ref pattern from Phase 21 (lines 724–760) is the template |
| DEV-06 | Panel displays timestamped entries for playback clock events (drift corrections, hard resets) | `syncState.trackId` is the correct watchable signal for hard resets — changes on snap; `driftDeltaMs` is frame-by-frame and unusable in useEffect |
</phase_requirements>

## Summary

Phase 22 wires three categories of runtime event calls into `FullscreenLyricsPage`: lyrics fetch lifecycle (DEV-04), Spotify sync state changes (DEV-05), and playback clock hard resets (DEV-06). The ring buffer (`useDevActivityLog`), panel component (`DevActivityPanel`), and auth events are all complete from Phase 21 — this phase adds the remaining three event sources only. No new modules, hooks, or infrastructure are required; everything plugs into existing call sites.

The lyrics wiring is the simplest: two `appendLogEntry` calls inside the existing `resolve()` async function — one after `setResolvedLyrics(resolved)` switching on `resolved.sourceState`, one in the catch block. The Spotify sync wiring uses the same sentinel ref pattern already in production at lines 724–760 for auth events. The clock wiring requires a `useEffect` watching `syncState.trackId` (the field that changes on snap) — this is the correct observable proxy for hard resets without modifying the rAF loop.

**Primary recommendation:** Add all three event categories as `useEffect` pairs (or single effects with internal logic) inside `FullscreenLyricsPage`, following the sentinel ref pattern from Phase 21 auth events. Zero new files, zero new hooks.

## Standard Stack

### Core (already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | `useEffect`, `useRef` — event wiring primitives | Already in use throughout the component |
| `useDevActivityLog` | internal | Ring buffer with `append()` — already instantiated at line 145 as `appendLogEntry` | Phase 21 deliverable; ready to call |
| `useSharedPlayback` | internal | Reactive Spotify state (`nowPlaying`, `playbackSnapshot`) — already consumed at lines 129–139 | Established hook; `nowPlaying` and `playbackSnapshot` are the event sources |

**Installation:** None required.

## Architecture Patterns

### Pattern 1: Sentinel Ref for Stable useEffect Change Detection (Phase 21 template)

**What:** A `useRef` initialized to a sentinel value (not `undefined`) stores the previous value of a reactive dep. On each effect run, compare current to previous. If changed AND both parties are non-sentinel, emit the log entry. Skip emission if current === previous. The sentinel (e.g., `undefined` was used for `prevTokenRef`, initialized to `undefined` at line 159 but then skipped on first run via the `=== undefined` guard) prevents the initial render from firing a spurious entry.

**When to use:** Every Spotify sync useEffect (DEV-05) and the clock useEffect (DEV-06).

**Exact Phase 21 implementation to follow (lines 724–753):**

```typescript
// Token refresh pattern — use this as the template for all Spotify sync effects
useEffect(() => {
  if (prevTokenRef.current === undefined) {
    prevTokenRef.current = webAuth.sessionAccessToken;
    return;   // skip spurious fire on mount
  }
  if (webAuth.sessionAccessToken !== prevTokenRef.current) {
    prevTokenRef.current = webAuth.sessionAccessToken;
    if (webAuth.sessionAccessToken) {
      appendLogEntry({ category: "auth", message: "[AUTH] Token refreshed" });
    }
  }
}, [webAuth.sessionAccessToken, appendLogEntry]);
```

**Key pattern notes:**
- `useRef` initialized to `undefined` — the guard `=== undefined` skips the first run.
- The `prevTokenRef.current` is updated unconditionally when different, so subsequent stable renders never re-emit.
- `appendLogEntry` is included in the dep array because it comes from `useCallback` (stable reference, but ESLint exhaustive-deps requires it).

### Pattern 2: Lyrics Fetch — Inline Inside Existing async resolve()

**What:** `appendLogEntry` is called directly inside the `resolve()` async function at line 697, after the `await` resolves and before/inside error handling. No new `useEffect` needed.

**When to use:** DEV-04 only.

**Exact insertion points (current lines 707–714):**

```typescript
// CURRENT CODE (line 707):
if (active) {
  setResolvedLyrics(resolved);
  // INSERT appendLogEntry here, inside the `if (active)` guard
}

// CURRENT CODE (line 710):
} catch {
  if (active) {
    setResolvedLyrics({ sourceState: "not-found", renderMode: "plain-static", lines: [] });
    // INSERT appendLogEntry here, also inside `if (active)` guard
  }
}
```

**Resolved sourceState → message mapping:**

```typescript
function lyricsFetchMessage(sourceState: string): string {
  switch (sourceState) {
    case "synced": return "[LYRICS] Synced lyrics (lrclib)";
    case "plain": return "[LYRICS] Plain lyrics (lrclib)";
    case "low-confidence": return "[LYRICS] Low-confidence lyrics (lrclib)";
    default: return "[LYRICS] No lyrics found";   // "not-found" + any other value
  }
}
```

The switch can be written inline or as a local helper. `"loading"` never appears as a resolved value from `resolveLyricsForTrack` — the function only returns `"synced"`, `"plain"`, `"low-confidence"`, or `"not-found"` (see `lyrics-resolver.ts`).

### Pattern 3: Clock Hard Reset via syncState.trackId Watch

**What:** `syncState.trackId` is the correct watchable proxy for clock hard resets. Analysis of the snap logic at lines 450–469:

```typescript
useEffect(() => {
  // ...
  const trackChanged = renderedTrackIdRef.current !== activeTrack?.trackId;  // line 452
  const indexJump = Math.abs(renderedFloatingIndexRef.current - floatingSyncedIndex);  // line 453
  // ...
  if (trackChanged || indexJump > LIVE_INDEX_SNAP_THRESHOLD) {  // line 461
    renderedTrackIdRef.current = activeTrack?.trackId ?? null;
    renderedFloatingIndexRef.current = floatingSyncedIndex;
    setRenderedFloatingIndex(floatingSyncedIndex);   // snap happens here
    return;
  }
  // ...
}, [activeTrack?.trackId, canRenderSyncedMotion, floatingSyncedIndex]);
```

A hard reset (snap) occurs when `trackChanged === true` OR `indexJump > LIVE_INDEX_SNAP_THRESHOLD` (3 lines). `trackChanged` is detectable by watching `activeTrack?.trackId`. `indexJump` large means a mid-song drift snap — these are the "hard resets" Phase 21 notes call out.

**The problem:** `syncState.trackId` is computed at line 357:
```typescript
trackId: activeTrack?.trackId ?? null,
```
This is exactly `activeTrack?.trackId`. A `useEffect` watching `activeTrack?.trackId` fires on track change (which is always a hard reset). But index-jump hard resets (mid-song drift) do NOT change `trackId`.

**Better signal:** `syncState.correctionState` is computed at line 366:
```typescript
correctionState: karaoke.mode === "karaoke" || activeTrack ? "synced" : "static",
```
This only transitions between `"static"` and `"synced"` — it does not distinguish hard resets from soft corrections at all. It is NOT a useful signal for this purpose.

**Correct approach for CONTEXT.md alignment:** The CONTEXT.md says to watch `syncState.correctionState` or a field that changes on snap, and to use `syncState.trackId` as the proxy for track-change snaps. For index-jump snaps (large drift), the actual snap is performed inside the `useEffect` at lines 450–469, and the state update is `setRenderedFloatingIndex(floatingSyncedIndex)`. This is not directly observable from outside that effect.

**Practical resolution:** The most reliable observable proxy that does not require rAF loop modification is `activeTrack?.trackId` combined with `renderedFloatingIndex`. A track change fires when `activeTrack?.trackId` changes. An index-jump snap is reflected as a discontinuous step in `renderedFloatingIndex`. But `renderedFloatingIndex` is floating-point and changes continuously during normal playback — it cannot reliably distinguish a snap from normal animation.

**Recommended implementation:** Watch `activeTrack?.trackId` (which always represents a hard reset via track swap) and accept that mid-song index-jump snaps are not observable without rAF loop modification. This matches the CONTEXT.md intent ("no modification to the rAF loop") and produces correct events for the most common hard-reset case (track changes). If the delta value is desired for diagnostic value, compute `Math.abs(syncState.driftDeltaMs)` at the moment the effect fires (it is available synchronously from `syncState`) — however `driftDeltaMs` in `syncState` is the instantaneous estimated-minus-polled difference, not the correction amount.

**Alternative:** Watch both `activeTrack?.trackId` AND the rendered snap side-effect. The snap effect at line 461 calls `setRenderedFloatingIndex`. The component state `renderedFloatingIndex` will discontinuously jump when a snap occurs. A `useEffect` can compare the previous rendered index to detect a non-animated jump, but this requires more careful sentinel logic and may fire spuriously.

**Final recommendation for planner:** Use `activeTrack?.trackId` as the primary watch signal. On each change, emit `[CLOCK] Hard reset`. Optionally include `syncState.driftDeltaMs` in the message if non-zero and above a threshold (e.g., 100ms) for diagnostic value: `[CLOCK] Hard reset (+320ms)`. A sentinel ref (initialized to a sentinel) prevents the mount fire.

### Anti-Patterns to Avoid

- **Modifying the rAF tick loop:** The rAF tick at lines 426–448 runs every frame. Any log call inside it will emit hundreds of entries per second. All log calls must be in `useEffect` only.
- **Watching `driftDeltaMs` in a useEffect:** `driftDeltaMs` is computed from `progressSourceMs - playbackSnapshot.progressMs`. It changes every frame (because `estimatedProgressMs` is set every frame by the rAF loop). A `useEffect` dep on `driftDeltaMs` would re-run constantly and cannot be used for event detection.
- **Watching `correctionState` from syncState for hard resets:** `correctionState` at line 366 is `"synced"` whenever a track is active and `"static"` otherwise. It does not encode hard-reset information.
- **Omitting `appendLogEntry` from dep arrays:** `appendLogEntry` is a `useCallback`-wrapped stable function, but React's exhaustive-deps lint rule requires it in dep arrays. Include it everywhere.
- **Missing `active` guard for lyrics events:** The `resolve()` function has an `active` guard (`if (active) { ... }`) to prevent stale async updates from stale closures. The `appendLogEntry` calls must be inside this guard or they will fire even after the component has moved to a different track.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timestamp generation | Custom date formatting | `useDevActivityLog.append()` auto-generates `HH:MM:SS` timestamp inside the hook | Already implemented in Phase 21; manual timestamps would be inconsistent |
| Change detection state | Custom reducer or useState for prev values | `useRef` sentinel pattern (Phase 21 template) | Refs don't cause re-renders; established pattern already in use in the same component |
| Category typing | String literals | `DevLogEntry["category"]` union: `"auth" \| "lyrics" \| "clock" \| "sync"` | Type safety is enforced at the call site by `Omit<DevLogEntry, "id" \| "timestamp">` |

## Common Pitfalls

### Pitfall 1: Spurious Mount Fire from Missing Sentinel
**What goes wrong:** A `useEffect` watching `nowPlaying?.trackId` fires on mount because `nowPlaying` transitions from its initial `null` to the first non-null value. This emits `[SYNC] Track changed` before any actual track change.
**Why it happens:** React runs effects after the initial render. The dep value changes from nothing to the initial value.
**How to avoid:** Use the Phase 21 sentinel ref pattern exactly. Initialize the ref to a sentinel (e.g., `undefined`), check `if (prevRef.current === undefined) { prevRef.current = current; return; }` on first run.
**Warning signs:** A `[SYNC] Track changed` entry appears in the log immediately on page load without any Spotify state change.

### Pitfall 2: appendLogEntry Outside the `active` Guard in resolve()
**What goes wrong:** When a new track loads while the previous async resolve is still in flight, the stale resolve completes and calls `appendLogEntry` even though the component has moved on. This produces a duplicate lyrics entry for the wrong track.
**Why it happens:** The `active` boolean in the `resolve()` closure is set to `false` by the cleanup function when the dep array changes (e.g., `activeTrack?.trackId` changes). Without the guard, the stale callback still runs.
**How to avoid:** Place `appendLogEntry(...)` inside `if (active) { ... }` — the same guard already protecting `setResolvedLyrics`.
**Warning signs:** Two `[LYRICS]` entries appear for one track change.

### Pitfall 3: Watching driftDeltaMs in useEffect for Clock Events
**What goes wrong:** The component emits hundreds of `[CLOCK] Hard reset` entries per second.
**Why it happens:** `driftDeltaMs` is derived from `estimatedProgressMs` which is updated every animation frame (~60fps). Any `useEffect` with `driftDeltaMs` in its dep array re-runs at frame rate.
**How to avoid:** Do not use `driftDeltaMs` or `estimatedProgressMs` in useEffect dep arrays. Watch `activeTrack?.trackId` instead.
**Warning signs:** Log fills up immediately with clock entries.

### Pitfall 4: Double-Entry on nowPlaying null→non-null for Track Changed
**What goes wrong:** When `nowPlaying` goes from null to a track, both the "Track changed" effect and the "No active playback" effect might emit.
**Why it happens:** If the sentinel ref for `nowPlaying` tracks `nowPlaying?.trackId` and the sentinel for null-state tracks `nowPlaying === null`, both can fire on the same state change depending on implementation.
**How to avoid:** Use separate sentinel refs for each effect. The "No active playback" effect should check `nowPlaying === null` as the condition for emission, not any trackId comparison.

### Pitfall 5: isPlaying Pause/Resume Missing Initial Value in Sentinel
**What goes wrong:** Pause/Resume fires on mount when Spotify reports a paused track on first load.
**Why it happens:** The sentinel ref for `isPlaying` has no initial value, so the first non-undefined value looks like a "change".
**How to avoid:** Initialize the `isPlaying` sentinel to a symbol or `undefined` and skip emission on mount (same pattern as auth events).

## Code Examples

### Lyrics Fetch Event Wiring (DEV-04)

```typescript
// Source: fullscreen-lyrics-page.tsx line 697 — inside existing resolve() async function
const resolve = async () => {
  try {
    const resolved = await resolveLyricsForTrack(
      { trackId: activeTrack.trackId, title: activeTrack.title, artist: activeTrack.artist },
      lrclib,
    );
    if (active) {
      setResolvedLyrics(resolved);
      // --- NEW: DEV-04 lyrics fetch event ---
      const lyricsMessage: Record<string, string> = {
        synced: "[LYRICS] Synced lyrics (lrclib)",
        plain: "[LYRICS] Plain lyrics (lrclib)",
        "low-confidence": "[LYRICS] Low-confidence lyrics (lrclib)",
      };
      appendLogEntry({
        category: "lyrics",
        message: lyricsMessage[resolved.sourceState] ?? "[LYRICS] No lyrics found",
      });
    }
  } catch {
    if (active) {
      setResolvedLyrics({ sourceState: "not-found", renderMode: "plain-static", lines: [] });
      // --- NEW: DEV-04 lyrics exception event ---
      appendLogEntry({ category: "lyrics", message: "[LYRICS] No lyrics found" });
    }
  }
};
```

### Spotify Sync — Track Changed (DEV-05)

```typescript
// Source: follows Phase 21 sentinel ref pattern at lines 724–735
const prevTrackIdRef = useRef<string | null | undefined>(undefined);

useEffect(() => {
  const currentTrackId = nowPlaying?.trackId ?? null;
  if (prevTrackIdRef.current === undefined) {
    prevTrackIdRef.current = currentTrackId;
    return;
  }
  if (currentTrackId !== prevTrackIdRef.current) {
    prevTrackIdRef.current = currentTrackId;
    if (currentTrackId !== null) {
      appendLogEntry({ category: "sync", message: "[SYNC] Track changed" });
    } else {
      appendLogEntry({ category: "sync", message: "[SYNC] No active playback" });
    }
  }
}, [nowPlaying?.trackId, appendLogEntry]);
```

### Spotify Sync — Playback Paused/Resumed (DEV-05)

```typescript
const prevIsPlayingRef = useRef<boolean | undefined>(undefined);

useEffect(() => {
  const isPlaying = playbackSnapshot?.isPlaying;
  if (prevIsPlayingRef.current === undefined) {
    prevIsPlayingRef.current = isPlaying;
    return;
  }
  if (isPlaying !== prevIsPlayingRef.current) {
    prevIsPlayingRef.current = isPlaying;
    if (isPlaying === true) {
      appendLogEntry({ category: "sync", message: "[SYNC] Playback resumed" });
    } else if (isPlaying === false) {
      appendLogEntry({ category: "sync", message: "[SYNC] Playback paused" });
    }
    // isPlaying === undefined means playbackSnapshot became null — no entry (covered by trackId effect)
  }
}, [playbackSnapshot?.isPlaying, appendLogEntry]);
```

### Clock Hard Reset (DEV-06)

```typescript
const prevClockTrackIdRef = useRef<string | null | undefined>(undefined);

useEffect(() => {
  const currentTrackId = activeTrack?.trackId ?? null;
  if (prevClockTrackIdRef.current === undefined) {
    prevClockTrackIdRef.current = currentTrackId;
    return;
  }
  if (currentTrackId !== prevClockTrackIdRef.current) {
    prevClockTrackIdRef.current = currentTrackId;
    if (currentTrackId !== null) {
      // Optional: include drift delta for diagnostic value
      const driftMs = Math.round(Math.abs(syncState.driftDeltaMs));
      const driftLabel = driftMs > 100 ? ` (+${driftMs}ms)` : "";
      appendLogEntry({ category: "clock", message: `[CLOCK] Hard reset${driftLabel}` });
    }
  }
}, [activeTrack?.trackId, syncState.driftDeltaMs, appendLogEntry]);
```

Note: Including `syncState.driftDeltaMs` in the dep array causes the effect to re-run whenever drift changes, but the emission is gated on `currentTrackId !== prevClockTrackIdRef.current` so no spurious entries are produced. The `driftDeltaMs` read is used only for message formatting, not for detection. If the delta clutter is unwanted, remove it and use `[activeTrack?.trackId, appendLogEntry]` as the dep array.

## Test Wiring Patterns (for New Tests)

### Mock infrastructure already in place

From `fullscreen-lyrics-page.test.tsx`:

1. **`useSharedPlayback` mock** (lines 92–100): Returns `{ nowPlaying: nowPlayingResponse, playbackSnapshot: getCachedPlaybackSnapshot(), ... }`. To drive Spotify sync events in tests, mutate `nowPlayingResponse` between renders (already the pattern for all existing tests).

2. **`resolveLyricsForTrack` mock** (lines 127–129): `vi.mock("@/core/lyrics/lyrics-resolver", () => ({ resolveLyricsForTrack: vi.fn(() => resolvedLyricsResponse) }))`. To drive lyrics events, set `resolvedLyricsResponse` before render, or change it between renders.

3. **`useDevActivityLog` is NOT mocked** — the real hook runs in tests. The `entries` state is populated by real `append()` calls. Tests verify log entries by checking rendered text inside the dev panel (after clicking the toggle to open it) using `screen.getByText(/\[AUTH\] Connected/)` — this is the exact pattern used in the existing `auth Connected event logged` test at line 2000.

4. **`scrollIntoView` stub** (line 1930): Required in the `beforeEach` of `describe("dev panel integration")` because `DevActivityPanel` calls `scrollIntoView`. New tests that open the panel must be inside this describe block or add the same stub.

### Pattern for verifying log entries

```typescript
// From existing test at line 2000 — follow this exactly
it("lyrics synced event logged when track resolves", async () => {
  hookModel = { ...hookModel, sessionAccessToken: "session-token" };
  nowPlayingResponse = { trackId: "track-123", title: "T", artist: "A", progressMs: 0, isPlaying: true };
  resolvedLyricsResponse = { sourceState: "synced", renderMode: "synced", lines: [] };

  const { rerender } = render(<FullscreenLyricsPage />);
  const toggle = screen.getByTestId("fullscreen-dev-panel-toggle");
  await act(async () => { fireEvent.click(toggle); });

  // Trigger lyrics resolution by providing a track with a token
  await act(async () => { rerender(<FullscreenLyricsPage />); });
  await waitFor(() => {
    expect(screen.getByText(/\[LYRICS\] Synced lyrics/)).toBeDefined();
  });
});
```

### Dep array reference — verified from source

From lines 724–753 in fullscreen-lyrics-page.tsx, the existing auth effects use:
- `[webAuth.sessionAccessToken, appendLogEntry]` — deps are the watched value and the stable callback
- `[webAuth.uiState.status, appendLogEntry]` — same pattern

The new effects follow identical structure:
- Lyrics: no new effect; `appendLogEntry` is called inside the existing effect at line 688 which already has deps `[activeTrack?.artist, activeTrack?.title, activeTrack?.trackId, webAuth.sessionAccessToken]`
- Spotify sync trackId: `[nowPlaying?.trackId, appendLogEntry]`
- Spotify sync isPlaying: `[playbackSnapshot?.isPlaying, appendLogEntry]`
- Clock: `[activeTrack?.trackId, syncState.driftDeltaMs, appendLogEntry]` (or `[activeTrack?.trackId, appendLogEntry]` if delta not included)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (version from package.json) |
| Config file | `vite.config.ts` |
| Quick run command | `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx` |
| Full suite command | `rtk vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEV-04 | `[LYRICS]` entry appears in log after track resolves (synced, plain, low-confidence, not-found, exception) | Integration | `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx` | ✅ (extend existing file) |
| DEV-05 | `[SYNC]` entries appear for track change, pause, resume, null playback | Integration | `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx` | ✅ (extend existing file) |
| DEV-06 | `[CLOCK]` entry appears on track change (hard reset proxy) | Integration | `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx` | ✅ (extend existing file) |

### Sampling Rate
- **Per task commit:** `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx`
- **Per wave merge:** `rtk vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. New tests are additions to `describe("dev panel integration")` in `src/web/fullscreen-lyrics-page.test.tsx`.

## Sources

### Primary (HIGH confidence)
- `src/web/fullscreen-lyrics-page.tsx` — Lines 145, 159–161, 688–722, 724–753, 354–373, 450–469 — direct source read
- `src/web/dev-activity-panel/use-dev-activity-log.ts` — `DevLogEntry` type, `append()` signature, category union
- `src/web/dev-activity-panel/dev-activity-panel.tsx` — panel rendering, color classes per category
- `src/web/fullscreen-lyrics-page.test.tsx` — mock patterns, test structure, verify-by-DOM approach
- `src/core/lyrics/types.ts` — `LyricsSourceState` union: `"synced" | "plain" | "low-confidence" | "not-found" | "loading"`
- `src/core/lyrics/lyrics-resolver.ts` — `resolveLyricsForTrack` return values (never returns `"loading"`)
- `src/web/use-shared-playback.ts` — `useSharedPlayback` exposes `SharedPlaybackState` reactively
- `.planning/config.json` — `nyquist_validation: true` confirmed

### Secondary (MEDIUM confidence)
- `.planning/phases/22-event-emission-wiring/22-CONTEXT.md` — all locked decisions verified against source code
- `.planning/STATE.md` — Phase 21 sentinel ref decision confirmed in source at lines 724–753

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; no new deps
- Architecture: HIGH — implementation approach is read directly from existing call sites and Phase 21 template
- Pitfalls: HIGH — all pitfalls verified against actual source code behavior
- Test patterns: HIGH — verified against existing test at line 2000

**Research date:** 2026-04-19
**Valid until:** 2026-05-19 (stable codebase; no external dependencies)
