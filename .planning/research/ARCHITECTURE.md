# Architecture Research

**Domain:** In-fullscreen developer activity panel integration
**Researched:** 2026-04-17
**Confidence:** HIGH (based on direct source inspection of all affected files)

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FullscreenLyricsPage                          │
│                                                                      │
│  useWebAuthRuntime ──► useSharedPlayback ──► shared-playback-runtime │
│  useKaraokeMode                                                      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Existing fixed overlays (z-20)                              │    │
│  │  ├── "Exit Fullscreen Lyrics" (top-left)                     │    │
│  │  ├── "Show Diagnostics" toggle + diagnostics panel           │    │
│  │  ├── "Back to Live" button (conditional)                     │    │
│  │  └── Karaoke controls (top-right)                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  NEW: Dev Activity Panel toggle + panel (z-20)               │    │
│  │  └── DevActivityPanel component                              │    │
│  │      └── useDevActivityLog hook (event log state)            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  main: lyrics viewport + track + rows                                │
└─────────────────────────────────────────────────────────────────────┘

Event Sources (captured at natural callsites, no new bus):
  ├── lyrics fetch resolved/failed  →  useEffect in FullscreenLyricsPage
  ├── playbackSnapshot changes       →  useEffect (playbackSnapshot dep)
  ├── track changes (trackId)        →  useEffect (activeTrack.trackId dep)
  ├── live-lock changes              →  setIsLiveLocked callsites
  └── poller diagnostics             →  logDiagnostic() in shared-playback-runtime
```

## Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `FullscreenLyricsPage` | Orchestrates all fullscreen state and renders the page | Exists — minor modification |
| `DevActivityPanel` | Renders the scrolling event log overlay, accepts log entries as prop | New |
| `useDevActivityLog` | Accumulates log entries via an `append(entry)` function, returns entries | New |
| `shared-playback-runtime` | Polls Spotify, owns `logDiagnostic` calls | Exists — no modification needed |

## Recommended Project Structure

```
src/
├── web/
│   ├── dev/
│   │   ├── dev-activity-panel.tsx     # Panel UI — receives entries[], isOpen
│   │   └── use-dev-activity-log.ts    # Hook — accumulates log entries, returns append + entries
│   ├── fullscreen-lyrics-page.tsx     # Modified: wires useDevActivityLog, appends events, renders DevActivityPanel
│   └── playback/
│       └── shared-playback-runtime.ts # Unchanged — logDiagnostic already exists
```

### Structure Rationale

- **web/dev/:** Isolates all dev tooling behind a folder boundary. Nothing in this folder is imported by production paths that don't already have the panel toggle. Tree-shakers can drop it entirely in a future prod build if desired.
- **use-dev-activity-log.ts:** Keeping the log accumulation in a hook rather than module-level state means it resets on component unmount (no stale log across navigations) and is unit-testable in isolation.
- **dev-activity-panel.tsx:** A pure display component. Receives `entries` and `isOpen` as props. Zero coupling to runtime internals — safe to move or remove.

## Architectural Patterns

### Pattern 1: Capture Events at Existing useEffect Callsites

**What:** In `FullscreenLyricsPage`, each significant state transition already lives in a `useEffect`. Append a log entry inside those effects using the `append` function returned by `useDevActivityLog`.

**When to use:** This is the right approach for all events that are already computed in the page component: lyrics resolution, track changes, live-lock toggles, playback snapshot changes.

**Trade-offs:** Events are tied to React's render cycle, so they reflect state after React commits. This is accurate for developer observation — it matches what the user sees. The downside is that the effect dependency list must not be modified purely to trigger new log entries (that would break existing timing invariants).

**Example:**
```typescript
// Inside FullscreenLyricsPage:
const { entries, append } = useDevActivityLog({ maxEntries: 200 });

// Existing effect — just add append() before existing work:
useEffect(() => {
  if (!webAuth.sessionAccessToken || !activeTrack?.trackId) {
    setResolvedLyrics(null);
    return;
  }
  append({ type: "lyrics:fetch-start", trackId: activeTrack.trackId });
  // ... existing resolve logic
  // inside resolve():
  //   append({ type: "lyrics:resolved", renderMode: resolved.renderMode })
  //   OR append({ type: "lyrics:not-found" })
}, [activeTrack?.artist, activeTrack?.title, activeTrack?.trackId, webAuth.sessionAccessToken]);
```

### Pattern 2: useDevActivityLog as a Bounded Ring Buffer

**What:** The hook keeps a fixed-size array (e.g. 200 entries). Each entry has `{ id, timestamp, type, payload? }`. `append()` adds to the head and drops the tail beyond the cap.

**When to use:** Always — unbounded accumulation of log entries would grow without limit for long sessions.

**Trade-offs:** Simple and predictable. A `useReducer` with an `ADD_ENTRY` action is cleaner than `useState` for this because the cap logic lives in the reducer.

**Example:**
```typescript
type LogEntry = {
  id: string;
  timestampMs: number;
  label: string;
};

function logReducer(state: LogEntry[], action: { type: "add"; entry: LogEntry }): LogEntry[] {
  return [action.entry, ...state].slice(0, MAX_ENTRIES);
}

export function useDevActivityLog({ maxEntries = 200 } = {}) {
  const [entries, dispatch] = useReducer(logReducer, []);
  const append = useCallback((label: string, extra?: object) => {
    dispatch({
      type: "add",
      entry: { id: crypto.randomUUID(), timestampMs: Date.now(), label, ...extra },
    });
  }, []);
  return { entries, append };
}
```

### Pattern 3: DevActivityPanel as a Pure Overlay (no runtime coupling)

**What:** `DevActivityPanel` is a `fixed` positioned overlay that renders `entries[]` in a scrollable list. It knows nothing about playback, lyrics, or auth. It accepts only display props.

**When to use:** Always — separating display from data keeps the panel testable and ensures dev tooling never introduces side effects in the main render path.

**Trade-offs:** The parent (`FullscreenLyricsPage`) is responsible for passing entries down. This is correct because `FullscreenLyricsPage` already owns the toggle state (`showDiagnostics` pattern already exists as precedent).

## Data Flow

### Event Log Data Flow

```
useDevActivityLog (hook in FullscreenLyricsPage)
    │
    ├─ append("lyrics:fetch-start", ...) ◄── lyrics useEffect (on trackId change)
    ├─ append("lyrics:resolved", ...)    ◄── lyrics useEffect (after await)
    ├─ append("track:changed", ...)      ◄── activeTrack trackId useEffect
    ├─ append("playback:snapshot", ...)  ◄── playbackSnapshot useEffect
    └─ append("live-lock:changed", ...)  ◄── setIsLiveLocked callsites
         │
         ▼
    entries[]  (reverse-chronological, capped at maxEntries)
         │
         ▼
    DevActivityPanel (receives entries + isOpen as props)
         │
         ▼
    Scrollable fixed overlay (z-20, dark themed)
```

### Toggle State Flow

```
showDevPanel: boolean  (useState in FullscreenLyricsPage)
    │
    ├─ toggle button (fixed overlay, same pattern as showDiagnostics)
    └─ DevActivityPanel isOpen={showDevPanel}
```

## Integration Points

### Files to Modify

| File | Change | Risk |
|------|--------|------|
| `src/web/fullscreen-lyrics-page.tsx` | Add `useDevActivityLog`, wire `append()` into 4-5 existing useEffects, add toggle button and `<DevActivityPanel>` render | Low — additive only, no existing logic changes |

### Files to Create

| File | Purpose |
|------|---------|
| `src/web/dev/use-dev-activity-log.ts` | Hook — `useReducer`-based ring buffer, returns `{ entries, append }` |
| `src/web/dev/dev-activity-panel.tsx` | Pure display component — fixed overlay, scrollable log entries |

### Files Left Unchanged

| File | Why Untouched |
|------|---------------|
| `shared-playback-runtime.ts` | Already logs via `logDiagnostic` to console. The dev panel reads state it already receives through `useSharedPlayback`. No need to tap into the poller directly. |
| `use-shared-playback.ts` | No changes needed — `FullscreenLyricsPage` already receives `playbackSnapshot` from this hook. |
| All core/infra domain modules | Dev panel is a UI-only concern |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `useDevActivityLog` ↔ `FullscreenLyricsPage` | `append()` callback called from existing useEffects | One-way, additive |
| `FullscreenLyricsPage` ↔ `DevActivityPanel` | Props: `isOpen: boolean`, `entries: LogEntry[]` | Pure data down, no callbacks up |
| Dev panel ↔ production lyric display | None — panel is a sibling fixed overlay, not inside the lyrics viewport tree | Critical: must not be inside `viewportSurfaceRef` subtree or it will receive scroll/wheel events |

## Build Order

The recommended build order respects existing dependencies and keeps each step independently testable:

1. **Create `use-dev-activity-log.ts`** — standalone hook with no imports from the rest of the app. Unit-testable in isolation. No visual changes.

2. **Create `dev-activity-panel.tsx`** — pure display component. Accepts mock entries for Storybook/manual testing. No runtime coupling.

3. **Wire into `FullscreenLyricsPage`** — call `useDevActivityLog`, add toggle button (following `showDiagnostics` precedent), render `<DevActivityPanel>`, add `append()` calls inside existing useEffects.

4. **Validate event coverage** — manually verify that the panel shows entries for: lyrics fetch start, lyrics resolved/not-found, track change, playback snapshot arrival, live-lock toggle.

## Anti-Patterns

### Anti-Pattern 1: Module-Level Event Bus

**What people do:** Create a global singleton `EventEmitter` or `Subject` that any module can import and push events to, then subscribe from the panel.

**Why it's wrong:** The existing architecture has no event bus. Introducing one adds a new coupling surface across the entire codebase. The runtime modules (lyrics resolver, playback poller) would gain a dependency on a UI-layer concern. It also bypasses React's render cycle, making the panel state diverge from what React has committed to the DOM.

**Do this instead:** Capture events at existing `useEffect` callsites in `FullscreenLyricsPage`. These effects already fire at the right moments. The page component is the correct integration point because it is already the owner of all relevant state.

### Anti-Pattern 2: Importing `append` Directly into Runtime Modules

**What people do:** Pass `append` into `resolveLyricsForTrack`, `fetchWebNowPlaying`, or `subscribeSharedPlayback` as a callback parameter to get finer-grained event capture.

**Why it's wrong:** This couples domain-layer and infrastructure modules to a UI concern. It breaks the existing clean separation and makes those modules harder to test. The granularity gained is not worth the coupling cost for a developer activity panel.

**Do this instead:** Capture at the `useEffect` level in `FullscreenLyricsPage`. The page component is already the boundary where domain output becomes UI state. Events captured there are sufficient for the panel's purpose.

### Anti-Pattern 3: Placing DevActivityPanel Inside the Lyrics Viewport Subtree

**What people do:** Render the panel as a child of `viewportSurfaceRef`'s div to keep it visually grouped with the lyrics.

**Why it's wrong:** `viewportSurfaceRef` has wheel and touch event listeners with `preventDefault`. Any element inside it will have its own scroll interaction intercepted. The panel needs to be a `fixed` sibling of the viewport, not a child.

**Do this instead:** Render `<DevActivityPanel>` as a sibling of `<main>` at the top level of the `FullscreenLyricsPage` return tree, identical to how `showDiagnostics` panel is already placed.

### Anti-Pattern 4: Re-rendering Panel on Every Animation Frame

**What people do:** Subscribe the panel to the `estimatedProgressMs` state or pass it into the panel as a live-updating prop.

**Why it's wrong:** `estimatedProgressMs` updates on every `requestAnimationFrame` tick. Passing it into the dev panel would cause the panel (and its entry list) to re-render at 60fps, regardless of whether any new events occurred.

**Do this instead:** The panel only re-renders when `entries` changes, which happens only when `append()` is called. Keep `estimatedProgressMs` and other animation-frame state out of the panel's props.

## Scaling Considerations

This is a single-user developer tool with a bounded entry list. Scaling is not a concern. The only performance concern is render frequency, which is addressed by the anti-patterns above.

## Sources

- Direct inspection of `src/web/fullscreen-lyrics-page.tsx` (source of truth for overlay pattern, toggle state, viewport structure)
- Direct inspection of `src/web/playback/shared-playback-runtime.ts` (confirms `logDiagnostic` already exists, no new bus needed)
- Direct inspection of `src/web/use-shared-playback.ts` (confirms subscription model)
- `.planning/PROJECT.md` (milestone requirements for v1.6 developer activity panel)

---
*Architecture research for: v1.6 developer activity panel integration*
*Researched: 2026-04-17*
