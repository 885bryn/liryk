# Pitfalls Research

**Domain:** Developer activity panel overlay on a rAF-driven, fullscreen immersive React app
**Researched:** 2026-04-17
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: Event-log setState calls triggering React re-renders inside the rAF loop

**What goes wrong:**
Every time a new event is appended to the log, a `setState` call fires, which schedules a React commit. In this codebase the fullscreen lyrics page runs two concurrent rAF loops (`progressFrameRef`, `focusFrameRef`) that update derived state on every animation frame. If the event-log state lives in the same component or a parent that owns those loops, every log push causes the loops' enclosing render to re-execute, increasing per-frame budget consumption. On a 60 Hz display that budget is 16.67 ms; on 120 Hz it is 8.33 ms.

**Why it happens:**
Developers co-locate dev tooling state with production state because it is the path of least resistance. A single top-level component becomes both the animation coordinator and the log consumer.

**How to avoid:**
Keep event-log state in an isolated module or React context that is not a parent or ancestor of the rAF-loop component. The preferred pattern for this codebase is to write events into a module-level circular buffer (not React state at all) and let the panel component pull from that buffer independently on its own, slow update cycle (e.g. every 500 ms via `setInterval`, or on user-visible RAF at most). The production animation path should write events by calling a plain function — never by dispatching React state actions.

**Warning signs:**
- Chrome Performance tab shows React commit work appearing inside every animation frame
- The rAF loop's measured frame cost jumps by 3–8 ms after adding the panel
- `renderedFloatingIndex` or `centerCorrectionPx` state updates visually stutter when the panel is open

**Phase to address:**
Design phase (before the event-log store is wired). Establish the circular-buffer + pull model before any event emission is added to production runtime code.

---

### Pitfall 2: Panel DOM presence causes layout/reflow during the rAF frame

**What goes wrong:**
Adding even an absolutely positioned overlay element to the same stacking context as the lyric track can force synchronous layout reads. This codebase reads `getBoundingClientRect()` on each lyric row (`getUnscaledRectHeight`) and writes `translateY` on the lyric track in the same rAF callback. If the panel's render (triggered by React commit) interleaves between those reads and writes, the browser must flush layout between the two operations — known as layout thrashing — costing 5–25 ms per frame.

**Why it happens:**
React batches commits asynchronously but the browser's layout engine is shared synchronously. Any DOM write by the panel (even a CSS class toggle) that occurs between a layout-read and a layout-write in the rAF callback will invalidate the layout cache and force a re-flow before the read can return stale results.

**How to avoid:**
Render the panel in a React Portal appended to `document.body` rather than inside the fullscreen viewport's DOM subtree. Portals escape the stacking context of the lyric container and their commits do not invalidate the lyric track's layout cache. Ensure the panel never touches the lyric DOM or measures any shared DOM nodes.

**Warning signs:**
- Chrome DevTools Performance tab shows "Forced reflow" warnings on frames where the panel is visible
- `getBoundingClientRect` call duration increases from < 0.1 ms to > 1 ms when panel is open
- Frame timing variance increases even when the panel is idle (content not changing)

**Phase to address:**
Phase that introduces the panel container — ensure Portal rendering is part of the initial implementation, not retrofitted.

---

### Pitfall 3: Fullscreen stacking context traps the panel behind the lyric surface

**What goes wrong:**
The fullscreen element (`viewportSurfaceRef`) creates a new top-level stacking context that receives the highest paint order. Any child element of the fullscreened element can receive arbitrary `z-index` without issue, but sibling elements rendered outside the fullscreen root (including portals appended to `document.body`) are painted *below* the fullscreen element regardless of their `z-index` value. The toggle button, if placed outside the fullscreen subtree, becomes invisible in fullscreen mode.

**Why it happens:**
The Fullscreen API specification places the fullscreened element and all its descendants into a pseudo-stacking context that supersedes the normal document stacking order. Developers familiar with modal z-index patterns assume a high z-index on the overlay will win; it does not when the parent is fullscreened via the Fullscreen API.

**How to avoid:**
Both the toggle button and the panel must be rendered *inside* the fullscreen root element, not in a document.body portal. Use a portal scoped to the fullscreen root element (`viewportSurfaceRef.current`) if DOM isolation is needed. Set `z-index` only relative to siblings within the fullscreen root.

**Warning signs:**
- Panel or button disappears when browser enters fullscreen mode via `document.requestFullscreen()`
- Panel is visible in windowed mode but invisible in fullscreen despite high z-index
- Setting `z-index: 9999` on the panel has no effect in fullscreen

**Phase to address:**
Panel container setup phase — verify fullscreen visibility in the acceptance criteria before adding log content.

---

### Pitfall 4: Unbounded log array causes steady memory growth and eventual GC stalls

**What goes wrong:**
If new log entries are pushed into an array without a cap, and the app runs for a 4-minute song with events emitted at every Spotify poll (every 4 s) plus every line change (on average every 3–5 s), the array grows to several hundred entries per song. Over a multi-hour session the retained object graph can exceed several MB. When the GC eventually collects, it may produce a pause visible as a frame drop at an unpredictable time.

**Why it happens:**
Developers building dev tooling append entries for debugging convenience and never add a trim step, because in short test sessions the growth is imperceptible.

**How to avoid:**
Use a fixed-length circular buffer (e.g. 200–500 entries max). Implement the buffer as a plain module-level array with a write-head pointer rather than a React state array to avoid per-push React renders. When the buffer is full, overwrite the oldest entry. The panel reads the buffer snapshot at its own refresh rate.

**Warning signs:**
- `performance.memory.usedJSHeapSize` grows steadily over 10+ minutes with the panel mounted
- GC pauses appear in the Performance timeline after extended sessions
- Memory snapshot shows hundreds of retained event-log objects under a dev-panel key

**Phase to address:**
Event-log store design phase — the circular buffer model should be the initial design, not a retrofit.

---

### Pitfall 5: Dev panel toggle state leaks into production runtime logic

**What goes wrong:**
If the boolean that controls panel visibility (`showPanel`) is stored in a shared context or influences branching in production code paths (e.g., "if showPanel, emit extra diagnostic events"), the production runtime's behavior diverges from what users experience when the panel is off. Timing-sensitive features like the center-correction gain loop or the drift reconciliation path may behave differently during development sessions than during production sessions, masking bugs.

**Why it happens:**
It is convenient to gate extra diagnostic emission behind the panel-visible boolean, since "we only need this data when the panel is open." Over time these gates proliferate and the production code path becomes permanently entangled with dev tooling state.

**How to avoid:**
The panel toggle state must live entirely in UI layer code and never be imported by or passed to runtime modules (`shared-playback-runtime`, `lyric-motion-window`, `playback-clock`, etc.). Production code should emit events unconditionally into the circular buffer; the panel merely reads that buffer when it wants to display it. Disable emission entirely with a build-time constant (`import.meta.env.DEV`) so the buffer and emission code are tree-shaken in production builds.

**Warning signs:**
- A runtime module imports anything from the dev panel's module
- `showPanel` or any dev-tooling state variable appears as a prop or argument to a non-UI function
- Behavior of lyric timing, drift correction, or live-lock changes when the panel is toggled open or closed

**Phase to address:**
Event emission wiring phase — establish the one-way data flow rule (runtime emits → buffer stores → panel reads) and enforce it as a code review gate.

---

### Pitfall 6: Panel scroll surface conflicting with the lyric viewport scroll surface

**What goes wrong:**
The fullscreen lyrics page owns a single internal scroll surface (`viewportSurfaceRef`) with `overflow-y: scroll` that drives the manual browse behavior. If the panel is rendered inside this scroll container and has its own `overflow-y: scroll` content (the event log), the browser's native scroll event bubbling means a two-finger scroll or wheel event aimed at the panel's log list can propagate up to the lyric viewport, inadvertently exiting live lock. Alternatively, the lyric viewport may intercept scroll events intended for the log, making the panel unusable.

**Why it happens:**
Nested overflow contexts in a fullscreen immersive app are common, but wheel/touch event bubbling rules catch developers off guard when one scroll surface is the parent of another.

**How to avoid:**
Apply `touch-action: none` and `e.stopPropagation()` on `wheel` and `touchmove` events on the panel's scroll container. Alternatively, render the panel as an overlay that is a sibling to (not a descendant of) the lyric scroll surface. Verify that toggling the panel does not change `isLiveLocked` state or trigger `userScrollIntentRef`.

**Warning signs:**
- Scrolling the event log list scrolls the lyric track simultaneously
- Live lock disengages when the user scrolls within the panel
- `manualBrowseOffsetPx` changes when the cursor is over the panel

**Phase to address:**
Panel layout phase — test scroll isolation as an explicit acceptance criterion with a live-locked track playing.

---

### Pitfall 7: ResizeObserver on panel elements interfering with lyric row measurement

**What goes wrong:**
This codebase already uses a `ResizeObserver` (`rowResizeObserverRef`) to measure lyric row heights, feeding those measurements into `buildRowLayout` which drives the `translateY` motion model. If the dev panel introduces additional ResizeObserver instances or causes the lyric container's dimensions to change (e.g., by pushing content, consuming viewport height, or changing the parent's flex layout), the existing observer fires spuriously, triggering unnecessary `setRowHeights` updates, which in turn rebuild `rowLayout` and snap `renderedFloatingIndex` — a visible lyric jump.

**Why it happens:**
Developers add the panel as a flex child of the main layout without realizing the fullscreen container's height is already measured as the viewport height for the lyric centering math. Any element that consumes vertical space inside that container invalidates the height assumption.

**How to avoid:**
The panel must be positioned `absolute` or `fixed` within the fullscreen root, never as a flow-document child that consumes block space. Confirm that `viewportSurfaceRef` dimensions remain unchanged (same `clientHeight`) before and after the panel is opened, with a test using `ResizeObserver` entries as a proxy.

**Warning signs:**
- `rowHeights` state updates fire when the panel is toggled open
- Lyric track snaps or shifts position at the moment the panel opens
- ResizeObserver callback fires with a new entry for the lyric container element when the panel visibility changes

**Phase to address:**
Panel layout phase — include a "no layout shift on panel toggle" check in the acceptance criteria.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store log entries in `useState` alongside production state | Simple to implement | Every log push re-renders the rAF-loop component; frame stutter | Never for this codebase |
| Render panel as a sibling div inside the lyric scroll container | No Portal boilerplate | Scroll surface conflict; ResizeObserver interference | Never — use absolute positioning or a scoped portal |
| Gate diagnostic emission behind `showPanel` toggle | Only pay emission cost when panel is visible | Production behavior diverges from dev; bugs masked | Never for timing-sensitive paths |
| Append to an unbounded array | Simplest log store code | Memory growth and GC stalls in long sessions | Never — circular buffer always |
| Use `z-index: 9999` on a body portal | Works in windowed mode | Panel invisible in fullscreen mode | Never for fullscreen apps |
| Import panel toggle state in runtime modules | Easy conditional logging | Tight coupling; runtime behavior changes with UI state | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Fullscreen API + overlay visibility | Portal to `document.body` for z-index isolation | Portal scoped to the fullscreen root element (`viewportSurfaceRef.current`) |
| rAF loop + event emission | Calling `setState` from within the rAF callback to push log entries | Write to a module-level circular buffer; panel pulls on its own slower cycle |
| ResizeObserver (lyric rows) + panel layout | Panel takes block space inside the lyric container | Panel uses `position: absolute` inside the fullscreen root; never in document flow |
| Scroll event handling + nested overflow | Panel scroll bubbles to lyric viewport, exiting live lock | `stopPropagation()` on wheel/touch events inside the panel's scroll container |
| Production build + dev tooling code | Dev emission code included in production bundle | Gate all emission and buffer code behind `import.meta.env.DEV`; Vite tree-shakes it |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| React state in rAF loop ancestor | Frame cost increases, lyric motion stutters | Circular buffer + isolated panel component with independent refresh | Immediately at 60 Hz; worse at 120 Hz |
| Layout thrashing (read-write interleave) | Forced reflow warnings in DevTools; frame time spikes > 5 ms | Portal outside lyric container DOM subtree | Every frame when panel is open |
| Unbounded log array | Heap grows steadily; GC pauses after 10+ min | Fixed circular buffer (200–500 entries) | 5–10 min of active session |
| Frequent DOM mutations in panel (text updates) | Paint cost rises while panel is open | Virtualize the log list or limit visible rows to 20–30 entries | When log updates faster than ~10/s |
| Panel open causing scroll surface resize | `rowHeights` recalculated; lyric snap | `position: absolute` for panel; never in flow | Every time panel is toggled |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Panel covers the active lyric line | Developer cannot see the lyric they are trying to debug | Anchor panel to a corner with a compact collapsed state by default; max-height capped |
| Toggle button hard to reach without leaving fullscreen | Dev cannot open panel without exiting the fullscreen experience | Fixed-position button in a corner of the fullscreen root (e.g., top-right, small tap target) |
| Panel always visible on load | Normal fullscreen experience broken for non-debug use | Default `showDiagnostics` to `false`; persist choice only in `sessionStorage`, not `localStorage` |
| Log text too dense to read at a glance | Panel is open but unreadable during playback | Use monospace, timestamp + short event-type prefix, color-coded by severity; newest entries at top |
| Panel cannot be dismissed quickly mid-song | Cognitive distraction during lyric viewing | Single-key toggle or a clearly visible close button; `Escape` key should close the panel |

---

## "Looks Done But Isn't" Checklist

- [ ] **Panel visible in fullscreen mode:** Tested with browser's native fullscreen (`F11` or `document.requestFullscreen()`), not just windowed mode — verify the toggle button and panel are visible.
- [ ] **Live lock unaffected by panel toggle:** Open the panel while a track is live-locked and playing; confirm `isLiveLocked` remains `true` and `manualBrowseOffsetPx` stays `0`.
- [ ] **No frame-time regression:** Measure rAF frame cost with Chrome Performance tab both with panel closed and panel open; confirm no increase > 1 ms.
- [ ] **Lyric position stable on toggle:** Open and close the panel while a track is playing; confirm the lyric track does not snap, shift, or lose center correction.
- [ ] **Memory stable over long session:** Run with panel open for 10 minutes; confirm heap size plateaus rather than growing monotonically.
- [ ] **Log entries bounded:** Confirm that the circular buffer caps at the configured maximum and does not grow beyond it.
- [ ] **Panel scroll isolated:** Scroll within the event log list; confirm the lyric track does not move.
- [ ] **Production build excludes panel code:** `vite build` output should not include event emission or buffer modules when `import.meta.env.DEV` is false.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| rAF loop re-renders from log state | MEDIUM | Extract event store to module-level buffer; remove log state from fullscreen component; re-test frame timing |
| Layout thrashing from panel DOM | MEDIUM | Wrap panel in `createPortal(panel, fullscreenRoot)` instead of inline render; re-profile |
| Panel invisible in fullscreen | LOW | Move portal target from `document.body` to `viewportSurfaceRef.current`; set appropriate `z-index` within that root |
| Live lock broken by panel scroll | LOW | Add `stopPropagation()` + `touch-action: none` to panel scroll container; re-test scroll isolation |
| Memory growth from unbounded log | LOW | Replace array with circular buffer implementation (< 1 hour to write); no API changes needed |
| Lyric snap on panel toggle | LOW | Change panel CSS from `display: block` (flow) to `position: absolute`; re-measure `clientHeight` before/after |
| Panel toggle state in runtime code | HIGH | Audit all imports; remove `showPanel` from non-UI modules; replace conditional emission with unconditional buffer writes |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| rAF loop re-renders from log setState | Event-log store design (first phase) | Frame cost profiling in Chrome DevTools with panel open |
| Layout thrashing from panel DOM | Panel container implementation | DevTools Performance tab shows no "Forced reflow" entries |
| Fullscreen stacking context visibility | Panel container implementation | Toggle button and panel visible in native fullscreen mode |
| Unbounded log array memory growth | Event-log store design (first phase) | Heap snapshot after 10-min session shows stable plateau |
| Dev state leaking into runtime logic | Event emission wiring phase | No runtime module imports panel state; `grep` for `showPanel` in non-UI files returns nothing |
| Panel scroll conflicting with lyric viewport | Panel layout phase | Scrolling log list does not change `isLiveLocked` or `manualBrowseOffsetPx` |
| ResizeObserver interference / lyric snap | Panel layout phase | `rowHeights` does not update on panel toggle; lyric position stable |

---

## Sources

- Layout thrashing and forced reflow detection: https://webperf.tips/tip/layout-thrashing/ (MEDIUM confidence)
- What forces layout/reflow (comprehensive list): https://gist.github.com/paulirish/5d52fb081b3570c81e3a (HIGH confidence — authoritative reference)
- React Portals and stacking context escape: https://www.ujjwalbasnet.com.np/blog/react-portals-solving-z-index-and-stacking-context-issues (MEDIUM confidence)
- Fullscreen API stacking context behavior: https://www.smashingmagazine.com/2026/01/unstacking-css-stacking-contexts/ (MEDIUM confidence)
- Unbounded array growth as memory leak pattern: https://blog.logrocket.com/memory-leaks-in-react-applications/ (MEDIUM confidence)
- rAF and React state synchronization pitfalls: https://css-tricks.com/using-requestanimationframe-with-react-hooks/ (MEDIUM confidence)
- Event-driven architecture for decoupled React communication: https://dev.to/nicolalc/event-driven-architecture-for-clean-react-component-communication-fph (MEDIUM confidence)
- Direct DOM mutation to avoid React commit overhead in animation loops: https://www.streaver.com/blog/posts/react-animations-how-a-simple-component-can-affect-your-performance (MEDIUM confidence)
- Codebase inspection: `src/web/fullscreen-lyrics-page.tsx`, `src/web/playback/shared-playback-runtime.ts` (HIGH confidence — first-party)

---
*Pitfalls research for: developer activity panel overlay on rAF-driven fullscreen lyric sync app*
*Researched: 2026-04-17*
