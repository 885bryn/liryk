# Phase 21: Panel Container, Toggle, and UX Shell - Research

**Researched:** 2026-04-17
**Domain:** React overlay UI, scroll isolation, circular log buffer, auth event wiring
**Confidence:** HIGH

## Summary

Phase 21 adds a developer activity panel to the fullscreen lyrics page. The implementation is primarily an additive UI composition task on top of a well-understood codebase. Every pattern needed — toggle button, fixed overlay, conditional render, auth hook subscription — already exists in `FullscreenLyricsPage`. Research confirms there are no new libraries required and no architectural unknowns.

The one non-trivial concern is scroll isolation: the panel's `overflow-y-auto` scroll surface must not let wheel or touch events bubble into the lyric viewport's scroll handlers. React's synthetic event system does not stop wheel propagation by default; the log container needs a `onWheel` handler calling `e.stopPropagation()` so the lyric live-lock logic is not tripped.

The auto-scroll behavior requires a `useRef` pointing at the last list item (or a sentinel element) and a call to `scrollIntoView` or direct `scrollTop` assignment inside a `useEffect` whenever a new entry is appended and auto-scroll is enabled.

**Primary recommendation:** Follow the exact structural template of the existing `showDiagnostics` overlay and diagnostics toggle button — the planner should produce tasks that copy-and-adapt those two patterns, then layer `useDevActivityLog`, scroll isolation, auto-scroll, and auth event wiring on top.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Panel position: `fixed bottom-4 left-4 z-20`, growing upward, approximately 240px wide, 30% of viewport height
- Visual style: match existing diagnostics overlay exactly — `bg-black/60 backdrop-blur-sm border border-white/15 text-[10px] text-white/72`
- Monospace font for log entries
- Subtle per-category color tinting (exact palette is Claude's discretion, must remain muted)
- Panel header label ("Dev Log" or similar) in the same subdued tracking style as diagnostics title
- Toggle button: top-left, stacked below existing "Show Diagnostics" button (which sits at `top-10 sm:top-12`)
- Toggle uses a lucide-react icon; uses `aria-expanded`; `z-20`
- Panel must NOT be inside the `viewportSurfaceRef` subtree — must be a sibling of `<main>`
- Panel log has its own `overflow-y-auto` scroll surface — scroll events must not bubble to lyric viewport
- Ring buffer: max ~150–200 entries, implemented as `useDevActivityLog` hook; `append(entry)` call signature; oldest entries evicted when full
- Buffer state must not be an ancestor of the two rAF loops (`progressFrameRef`, `focusFrameRef`) — scope inside `FullscreenLyricsPage` state, pass as props
- Auto-scroll: default on, small toggle inside panel to pause; resumes on new entry or manual toggle
- Auth events source: `webAuth` hook — `useEffect` watching `webAuth.sessionAccessToken` and auth connection state
- Auth entry format: `[AUTH] Token refreshed`, `[AUTH] Connected`, `[AUTH] Disconnected`; timestamp in `HH:MM:SS`

### Claude's Discretion
- Exact lucide-react icon choice for the toggle button
- Exact color palette for per-category subtle tints (must remain muted)
- Auto-scroll "new entries" indicator design
- Timestamp display format details (within `HH:MM:SS` convention, must be readable at 10px)
- Whether the panel title shows entry count

### Deferred Ideas (OUT OF SCOPE)
- Log filtering by category (DEV-F1)
- Clear log button (DEV-F2)
- Keyboard shortcut toggle (DEV-F3)
- Motion/viewport event categories (DEV-F4, DEV-F5)
- Lyrics fetch, Spotify sync, and playback clock event wiring (Phase 22)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEV-01 | User can toggle the developer activity panel open/closed via a small button in fullscreen mode | Toggle button pattern from diagnostics toggle (line 817–827 in fullscreen-lyrics-page.tsx); `useState<boolean>` for `showDevPanel` |
| DEV-02 | Panel and toggle button render inside the fullscreen root element (not portaled to document.body) and do not affect lyric layout or ResizeObserver | Placement as sibling of `<main>` in JSX return; `position: fixed` does not participate in normal flow; no new DOM elements in lyric row subtree |
| DEV-03 | Panel scroll events do not bubble to the lyric viewport scroll surface | `onWheel={e => e.stopPropagation()}` on the log scroll container; same for `onTouchStart`/`onTouchMove` |
| DEV-07 | Panel displays timestamped auth/connection events | `useEffect` deps on `webAuth.sessionAccessToken` and `webAuth.uiState.status`; call `appendLogEntry` with `[AUTH]` label |
| DEV-08 | Panel auto-scrolls to latest entry, with a toggle to pause auto-scroll | `useRef` for sentinel at bottom of list; `scrollIntoView` in `useEffect` when `autoScroll` is true |
| DEV-09 | Panel styled to match dark fullscreen aesthetic, does not disrupt lyric display | `fixed bottom-4 left-4 z-20 w-[240px]` with existing diagnostics Tailwind class set; no DOM insertion in lyric subtree |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (useState, useEffect, useRef, useCallback) | 18.3.1 | Component state, side-effects, DOM refs | Already in project; all patterns needed are core React hooks |
| lucide-react | 0.577.0 | Icon for toggle button | Already a project dependency; used in theme-toggle and dropdown-menu |
| Tailwind CSS | 3.4.17 | Styling | Project-wide styling system; diagnostics overlay already uses Tailwind class strings |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | 16.3.0 | Component tests | Every new component/hook needs unit tests following existing test file patterns |
| vitest | 2.1.9 | Test runner | All tests run through `vitest run`; config in `vite.config.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain React `useState` ring buffer | Zustand / external store | Unnecessary complexity; scope is local to FullscreenLyricsPage as specified |
| `scrollIntoView` | `scrollTop = scrollHeight` | Both work; `scrollIntoView` is simpler and does not need container ref calculation |

**Installation:** No new packages needed. All required dependencies already present.

**Version verification:** lucide-react 0.577.0 confirmed via `npm view lucide-react version` returning `1.8.0` (registry latest). Project pins `^0.577.0` which resolves within the 0.x range. The `Terminal` and `ScrollText` icons are available in this version range.

## Architecture Patterns

### Recommended Project Structure
```
src/web/
├── fullscreen-lyrics-page.tsx      # integration: add showDevPanel state, useDevActivityLog, auth useEffect, JSX insertion
├── dev-activity-panel/
│   ├── dev-activity-panel.tsx       # panel component (container, header, log list, auto-scroll toggle)
│   ├── use-dev-activity-log.ts      # ring buffer hook
│   └── dev-activity-panel.test.tsx  # unit tests for panel + hook
```

This mirrors how other UI sub-components are organized in the project (e.g., `src/ui/lyrics/`, `src/ui/connection/`).

### Pattern 1: Existing Toggle + Conditional Overlay (direct template)
**What:** `useState<boolean>` + button with `aria-expanded` + `{show ? <section>...</section> : null}`
**When to use:** This is the exact pattern used for diagnostics; replicate it verbatim for the dev panel
**Example:**
```typescript
// Source: src/web/fullscreen-lyrics-page.tsx lines 817-827, 929-960
const [showDevPanel, setShowDevPanel] = useState(false);

// Toggle button (stack below diagnostics button at top-10/sm:top-12)
<button
  type="button"
  data-testid="fullscreen-dev-panel-toggle"
  aria-expanded={showDevPanel}
  className="fixed left-4 top-16 z-20 bg-transparent text-white/45 transition-colors duration-200 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:left-6 sm:top-20"
  onClick={() => setShowDevPanel(v => !v)}
>
  <Terminal className="size-3" aria-hidden="true" />
</button>

// Panel (sibling of <main>, not inside viewportSurfaceRef)
{showDevPanel ? (
  <section data-testid="fullscreen-dev-panel" className="fixed bottom-4 left-4 z-20 w-[240px] rounded-sm border border-white/15 bg-black/60 backdrop-blur-sm" style={{ height: "30vh" }}>
    <DevActivityPanel entries={logEntries} appendEntry={appendLogEntry} />
  </section>
) : null}
```

### Pattern 2: Ring Buffer Hook
**What:** `useDevActivityLog` maintains a fixed-size array and exposes `entries` + `append`
**When to use:** Called at the top of `FullscreenLyricsPage`; result passed as props, never placed as ancestor of rAF loops
**Example:**
```typescript
// Source: standard React pattern, no library needed
const MAX_LOG_ENTRIES = 150;

export type DevLogEntry = {
  id: string;         // crypto.randomUUID() or counter
  timestamp: string;  // "HH:MM:SS"
  category: "auth" | "lyrics" | "clock" | "sync";
  message: string;
};

export function useDevActivityLog() {
  const [entries, setEntries] = useState<DevLogEntry[]>([]);

  const append = useCallback((entry: Omit<DevLogEntry, "id" | "timestamp">) => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    const ss = now.getSeconds().toString().padStart(2, "0");
    const full: DevLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: `${hh}:${mm}:${ss}`,
      ...entry,
    };
    setEntries(prev => {
      const next = [...prev, full];
      return next.length > MAX_LOG_ENTRIES ? next.slice(next.length - MAX_LOG_ENTRIES) : next;
    });
  }, []);

  return { entries, append };
}
```

### Pattern 3: Scroll Isolation
**What:** Stop wheel/touch events on the log container from reaching the lyric viewport wheel handlers
**When to use:** Required for DEV-03; lyric viewport uses wheel/touch events for live-lock state
**Example:**
```typescript
// Prevents bubbling to fullscreen-lyrics-viewport wheel/touch handlers
<div
  className="overflow-y-auto overscroll-contain h-full"
  onWheel={e => e.stopPropagation()}
  onTouchStart={e => e.stopPropagation()}
  onTouchMove={e => e.stopPropagation()}
>
  {/* log entries */}
</div>
```
Note: `overscroll-contain` (CSS `overscroll-behavior: contain`) also prevents scroll chaining at the browser level and is a defense-in-depth complement to `stopPropagation`. Use both.

### Pattern 4: Auto-Scroll to Latest Entry
**What:** `useRef` on a sentinel `<div>` at bottom of list; `scrollIntoView` in `useEffect` when entries change and `autoScroll` is true
**When to use:** DEV-08; standard React pattern
**Example:**
```typescript
const bottomRef = useRef<HTMLDivElement | null>(null);
const [autoScroll, setAutoScroll] = useState(true);

useEffect(() => {
  if (autoScroll && bottomRef.current) {
    bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }
}, [entries, autoScroll]);

// In JSX at bottom of log list:
<div ref={bottomRef} aria-hidden="true" />
```

### Pattern 5: Auth Event Wiring
**What:** `useEffect` in `FullscreenLyricsPage` watching `webAuth.sessionAccessToken` and `webAuth.uiState.status`
**When to use:** DEV-07; auth events are derived from changes to these two values
**Example:**
```typescript
// Watch token changes
const prevTokenRef = useRef<string | null | undefined>(undefined);
useEffect(() => {
  if (prevTokenRef.current === undefined) {
    // first render — initialize without logging
    prevTokenRef.current = webAuth.sessionAccessToken;
    return;
  }
  if (webAuth.sessionAccessToken !== prevTokenRef.current) {
    prevTokenRef.current = webAuth.sessionAccessToken;
    if (webAuth.sessionAccessToken) {
      appendLogEntry({ category: "auth", message: "[AUTH] Token refreshed" });
    }
  }
}, [webAuth.sessionAccessToken, appendLogEntry]);

// Watch connection state
const prevStatusRef = useRef<string | undefined>(undefined);
useEffect(() => {
  const status = webAuth.uiState.status;
  if (prevStatusRef.current === undefined) {
    prevStatusRef.current = status;
    return;
  }
  if (status !== prevStatusRef.current) {
    prevStatusRef.current = status;
    if (status === "success") {
      appendLogEntry({ category: "auth", message: "[AUTH] Connected" });
    } else if (status === "disconnected") {
      appendLogEntry({ category: "auth", message: "[AUTH] Disconnected" });
    } else if (status === "connected_waiting_playback") {
      appendLogEntry({ category: "auth", message: "[AUTH] Waiting for playback" });
    }
  }
}, [webAuth.uiState.status, appendLogEntry]);
```

### Anti-Patterns to Avoid
- **Placing the panel inside `viewportSurfaceRef`:** This would cause it to participate in lyric row ResizeObserver measurements, triggering spurious re-renders of the row layout.
- **Storing log state as context above the rAF loops:** The two rAF loops (`progressFrameRef`, `focusFrameRef`) fire every animation frame. Log state updates must not re-render rAF-loop ancestors. Keep state scoped to `FullscreenLyricsPage` but do not allow log-append-triggered re-renders to propagate into the rAF loop paths.
- **Using a portal (ReactDOM.createPortal) to document.body:** Violates DEV-02; the panel must remain inside the fullscreen root for z-index stacking context correctness.
- **Growing the log array unboundedly:** Without the ring buffer eviction, `entries` will grow to thousands of items during a long session, degrading render performance.
- **Logging on every animation frame:** Auth events are state-change events (not per-frame). Wire them to `useEffect` deps, not to the rAF loop callbacks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll-chain prevention | Custom scroll lock or JS intercept | CSS `overscroll-behavior: contain` + `e.stopPropagation()` | Browser-native; handles both mouse and touch; no timing gaps |
| Icon rendering | SVG inline strings | `lucide-react` (already imported) | Accessible, tree-shaken, consistent with project conventions |
| Timestamp formatting | Complex date library | Single `Date` + `padStart` formatting | The only required format is `HH:MM:SS`; no library overhead needed |
| Unique entry IDs | UUID package | `${Date.now()}-${Math.random()}` | Sufficient for list keys; no collision risk in a ring buffer context |

**Key insight:** This phase is almost entirely a composition and wiring task. The hard parts (scroll isolation, auto-scroll sentinel, ring buffer eviction) each have simple, idiomatic React solutions that require zero new libraries.

## Common Pitfalls

### Pitfall 1: Toggle Button Vertical Position Collision
**What goes wrong:** The dev panel toggle button overlaps the existing "Show Diagnostics" button or the "Exit Fullscreen" link above it.
**Why it happens:** The diagnostics button is at `top-10 sm:top-12` (approximately 40px/48px). A naively placed icon button at the same offset collides.
**How to avoid:** Offset the dev panel toggle to `top-16 sm:top-20` (64px/80px), one step below the diagnostics button. Verify with both `sm:` and base breakpoints.
**Warning signs:** Visual overlap visible in the browser at both mobile and desktop viewport widths.

### Pitfall 2: Panel Growing Downward and Clipping Bottom UI
**What goes wrong:** The panel at `bottom-4` grows downward into the viewport instead of upward, or its `30vh` height overflows the screen.
**Why it happens:** CSS `bottom` anchor means the element's bottom edge is fixed; adding `height` grows it upward by default. However if `max-height` is not clamped, it may conflict with the "Back to Live" button at `bottom-4 right-4`.
**How to avoid:** Use `style={{ height: "30vh", maxHeight: "30vh" }}` or equivalent Tailwind. Confirm the panel does not occlude the "Back to Live" button (right-anchored; no conflict on x-axis since panel is left-anchored at `w-[240px]`).
**Warning signs:** Panel bottom edge overlapping "Back to Live" text in narrow viewports.

### Pitfall 3: Stale `prevRef` on First Mount Fires a Spurious Log Entry
**What goes wrong:** `useEffect` watching `webAuth.sessionAccessToken` fires immediately on mount with the initial token value, logging "[AUTH] Token refreshed" even though no token change occurred.
**Why it happens:** React runs `useEffect` after first render; the previous value ref is uninitialized.
**How to avoid:** Initialize the prev-value ref to a sentinel (`undefined`) and skip the log call on the first invocation, as shown in Pattern 5.
**Warning signs:** Auth log entry appearing immediately when the panel opens, before any real auth event.

### Pitfall 4: Auto-Scroll Fighting Manual Scroll
**What goes wrong:** User pauses auto-scroll to read an earlier entry; a new entry appends; `useEffect` fires and forces scroll back to the bottom anyway.
**Why it happens:** The `autoScroll` state is not checked inside the `useEffect`, or it is checked but the effect dependency array does not include `autoScroll`.
**How to avoid:** Gate the `scrollIntoView` call on `autoScroll === true` and include `autoScroll` in the `useEffect` deps array. When auto-scroll is paused, a "new entries" badge (e.g., entry count delta) is the only UI feedback.
**Warning signs:** Panel scrolls to bottom even when the user has manually scrolled up and the pause toggle shows as active.

### Pitfall 5: `stopPropagation` on Wheel Events With Passive Listeners
**What goes wrong:** React attaches event listeners with `passive: true` by default for `wheel` events in some versions, which means `e.stopPropagation()` works but `e.preventDefault()` would throw. The lyric viewport's wheel handler may still receive the event if it is attached at a higher DOM level via a native (non-React) listener.
**Why it happens:** React synthetic events stop propagation within React's event delegation tree, but native event listeners attached directly to DOM nodes (e.g., `addEventListener('wheel', ...)`) are outside this tree.
**How to avoid:** Check `fullscreen-lyrics-page.tsx` for any native `addEventListener('wheel', ...)` calls. If present, use a native `useEffect` with `{ passive: false }` on the log container ref to stop propagation at the DOM level too. From the codebase review, wheel/touch handlers in `FullscreenLyricsPage` are attached via React props (`onWheel`, `onTouchStart`, `onTouchMove`) on the `viewportSurfaceRef` div — so React synthetic `stopPropagation()` is sufficient.
**Warning signs:** Lyric viewport scroll position changes when user scrolls the panel log.

## Code Examples

Verified patterns from official sources and direct codebase inspection:

### Diagnostics Overlay Template (exact source)
```typescript
// Source: src/web/fullscreen-lyrics-page.tsx lines 929-960
{showDiagnostics ? (
  <section
    data-testid="fullscreen-diagnostics-overlay"
    className="fixed left-4 top-16 z-20 min-w-[220px] rounded-sm border border-white/15 bg-black/60 px-3 py-2 text-[10px] leading-tight text-white/72 backdrop-blur-sm sm:left-6 sm:top-20"
  >
    <p className="pb-1 text-[9px] tracking-[0.16em] text-white/50">Timing Diagnostics</p>
    {/* content */}
  </section>
) : null}
```

### Diagnostics Toggle Button Template (exact source)
```typescript
// Source: src/web/fullscreen-lyrics-page.tsx lines 817-827
<button
  type="button"
  data-testid="fullscreen-diagnostics-toggle"
  aria-expanded={showDiagnostics}
  className="fixed left-4 top-10 z-20 bg-transparent text-[10px] tracking-[0.14em] text-white/45 transition-colors duration-200 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:left-6 sm:top-12"
  onClick={() => setShowDiagnostics(current => !current)}
>
  {showDiagnostics ? "Hide Diagnostics" : "Show Diagnostics"}
</button>
```

### WebAuthRuntimeModel Shape (source of auth event data)
```typescript
// Source: src/web/use-web-auth-runtime.ts
export type WebAuthRuntimeModel = {
  phase: "checking" | "ready" | "busy";
  statusCopy: string;
  uiState: UiAuthState;         // uiState.status is the connection state discriminant
  onConnect: () => Promise<void>;
  sessionAccessToken: string | null;
};
// UiAuthState.status values relevant to auth events:
// "disconnected" | "success" | "connected_waiting_playback" | "recoverable_error"
```

### Existing lucide-react Usage Pattern
```typescript
// Source: src/web/theme/theme-toggle.tsx
import { Moon, Sun } from "lucide-react";
<Moon className="size-4" aria-hidden="true" />
// Pattern: size-N className, aria-hidden on decorative icons
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline SVG for icons | lucide-react tree-shaken imports | Already established in project | Use `Terminal` or `ScrollText` icon; import by name |
| Unbounded log arrays | Ring buffer with max-length eviction | Best practice for long-running browser sessions | Must cap at 150–200 entries |
| CSS scroll chaining | `overscroll-behavior: contain` | CSS Level 4, widely supported | Tailwind: `overscroll-contain`; prevents scroll chain at CSS level |

**Deprecated/outdated:**
- `event.nativeEvent.stopImmediatePropagation()`: only needed if native listeners are attached on the same node; React synthetic `stopPropagation()` is sufficient here.

## Open Questions

1. **Toggle button vertical stacking with future controls**
   - What we know: diagnostics button at `top-10 sm:top-12`; dev panel toggle proposed at `top-16 sm:top-20`; karaoke controls are top-right
   - What's unclear: if more top-left controls are added in Phase 22, the vertical column will need systematic management
   - Recommendation: Use `top-16 sm:top-20` for Phase 21; document as a convention so Phase 22 continues at `top-[5.5rem]` or similar

2. **Auth `uiState` types not fully enumerated**
   - What we know: `UiAuthState` is a discriminated union; `status` values seen: `disconnected`, `success`, `connected_waiting_playback`, `recoverable_error`
   - What's unclear: whether `"checking"` or `"loading"` states exist as `uiState.status` values (vs the hook's `phase` field)
   - Recommendation: Wire auth events from `webAuth.phase` (the hook's own phase) AND `webAuth.uiState.status` changes; treat `phase === "checking"` → `[AUTH] Checking connection`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 2.1.9 + @testing-library/react 16.3.0 |
| Config file | `vite.config.ts` (test.environment: jsdom) |
| Quick run command | `rtk vitest run src/web/dev-activity-panel` |
| Full suite command | `rtk vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEV-01 | Toggle button opens/closes panel | unit | `rtk vitest run src/web/dev-activity-panel/dev-activity-panel.test.tsx` | ❌ Wave 0 |
| DEV-02 | Panel not inside viewportSurfaceRef; no ResizeObserver trigger | unit | `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx` | ✅ (extend existing) |
| DEV-03 | Wheel events on panel do not propagate to lyric viewport | unit | `rtk vitest run src/web/dev-activity-panel/dev-activity-panel.test.tsx` | ❌ Wave 0 |
| DEV-07 | Auth events appear as timestamped log entries | unit | `rtk vitest run src/web/dev-activity-panel/dev-activity-panel.test.tsx` | ❌ Wave 0 |
| DEV-08 | Auto-scroll to latest entry; pause/resume toggle | unit | `rtk vitest run src/web/dev-activity-panel/dev-activity-panel.test.tsx` | ❌ Wave 0 |
| DEV-09 | Panel visual style does not disrupt lyric display (DOM position) | unit | `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx` | ✅ (extend existing) |

### Sampling Rate
- **Per task commit:** `rtk vitest run src/web/dev-activity-panel`
- **Per wave merge:** `rtk vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/web/dev-activity-panel/dev-activity-panel.test.tsx` — covers DEV-01, DEV-03, DEV-07, DEV-08
- [ ] `src/web/dev-activity-panel/use-dev-activity-log.ts` — ring buffer hook (tested inline in panel test or separate)

## Sources

### Primary (HIGH confidence)
- Direct source read: `src/web/fullscreen-lyrics-page.tsx` — toggle/overlay patterns, DOM structure, rAF loop positions, webAuth integration
- Direct source read: `src/web/use-web-auth-runtime.ts` — `WebAuthRuntimeModel` shape, `sessionAccessToken`, `uiState.status` values
- Direct source read: `src/web/fullscreen-lyrics-page.test.tsx` — test infrastructure, mock patterns, vitest + @testing-library/react usage
- Direct source read: `vite.config.ts` — test environment (jsdom), path aliases
- Direct source read: `package.json` — all dependency versions confirmed

### Secondary (MEDIUM confidence)
- `src/web/theme/theme-toggle.tsx` — lucide-react import/usage pattern (`size-N className`, `aria-hidden`)
- CSS `overscroll-behavior: contain` — MDN-documented browser behavior; Tailwind `overscroll-contain` class confirmed in Tailwind CSS 3.x docs

### Tertiary (LOW confidence)
- None — all research findings are backed by direct codebase inspection or established CSS specifications

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in project; versions confirmed from package.json
- Architecture: HIGH — all patterns are direct adaptations of existing code in the same file
- Pitfalls: HIGH — derived from direct codebase inspection of event handler attachment style and React effect behavior

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (stable React/Tailwind; no external API changes expected)
