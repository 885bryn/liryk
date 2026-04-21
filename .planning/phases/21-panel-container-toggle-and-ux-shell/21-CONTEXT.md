# Phase 21: Panel Container, Toggle, and UX Shell - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the dev activity panel shell: toggle button, positioned overlay container, scroll isolation from the lyric viewport, auth/connection event display, auto-scroll with pause toggle, and full visual treatment. Phase 21 establishes the panel architecture and wires auth events only. Lyrics fetch, Spotify sync, and playback clock events are wired in Phase 22.

Requirements: DEV-01, DEV-02, DEV-03, DEV-07, DEV-08, DEV-09

</domain>

<decisions>
## Implementation Decisions

### Panel placement
- Position: bottom-left corner, anchored with `fixed bottom-4 left-4 z-20`, growing upward
- Size: narrow fixed size — approximately 240px wide, 30% of viewport height
- This keeps the panel out of the lyric column center and does not conflict with the existing top-left "Exit Fullscreen" and "Show Diagnostics" controls or the bottom-right "Back to Live" button

### Panel visual style
- Match the existing diagnostics overlay style exactly: `bg-black/60 backdrop-blur-sm border border-white/15 text-[10px] text-white/72`
- Monospace text for log entries
- Subtle color tinting per event category to make entries scannable — auth events one tint, lyrics events another, clock events another (exact color palette is Claude's discretion, but they must remain muted, not bright)
- Panel header label ("Dev Log" or similar) in the same subdued tracking style as the diagnostics title

### Toggle button
- Position: top-left, stacked below the existing "Show Diagnostics" button (which sits at `top-10 sm:top-12`)
- Style: small icon button using a lucide-react icon (e.g. `Terminal` or `List`) — more compact than text, consistent z-level (`z-20`)
- Toggle icon state: one icon for closed, same or slightly different icon for open — Claude's discretion on exact icon pair
- Uses `aria-expanded` attribute (matching diagnostics toggle pattern)

### Scroll isolation
- Panel log list has its own scroll surface (`overflow-y-auto`) separate from the lyric viewport
- Panel must NOT be rendered inside the `viewportSurfaceRef` subtree — place it as a sibling of `<main>`, identical to the existing diagnostics section
- Scroll events on the panel log must not bubble into the lyric viewport wheel/touch handlers

### Circular log buffer
- Internal ring buffer (max ~150–200 entries) implemented as a React hook, e.g. `useDevActivityLog`
- `append(entry)` call signature; buffer evicts oldest entries when full
- Buffer state must not be stored in a component that is an ancestor of the two rAF loops (`progressFrameRef`, `focusFrameRef`) — scope it inside `FullscreenLyricsPage` state but pass only the log array and append function down to the panel component as props

### Auto-scroll behavior (DEV-08)
- Panel auto-scrolls to the newest log entry by default
- A small toggle control inside the panel pauses auto-scroll so the user can inspect earlier entries
- Resuming auto-scroll (or appending a new entry while auto-scroll is on) scrolls back to the bottom
- When auto-scroll is paused and the panel receives new entries, a subtle "new entries" indicator or badge is acceptable (Claude's discretion)

### Auth event content (DEV-07)
- Capture and display timestamped entries for: Spotify token refresh, auth state changes (connected / disconnected / loading), and connection status transitions
- Source: `webAuth` hook in `FullscreenLyricsPage` — changes to `webAuth.sessionAccessToken` and `webAuth` connection state via `useEffect` deps
- Entry message format: human-readable short label, e.g. `[AUTH] Token refreshed`, `[AUTH] Connected`, `[AUTH] Disconnected`
- Timestamp: `HH:MM:SS` format (Claude's discretion on exact format, must be readable at 10px)

### Claude's Discretion
- Exact lucide-react icon choice for the toggle button
- Exact color palette for per-category subtle tints (must remain muted)
- Auto-scroll "new entries" indicator design
- Timestamp display format details
- Whether the panel title shows entry count

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Fullscreen page — template and integration point
- `src/web/fullscreen-lyrics-page.tsx` — Primary integration file. The existing `showDiagnostics` overlay (lines 929–960) is the exact structural template for the dev panel. The toggle button pattern (lines 817–827) is the template for the dev toggle. The `viewportSurfaceRef` subtree (lines 982–1039) must NOT contain the dev panel. The two rAF loops (`progressFrameRef`, `focusFrameRef`) constrain where log state can live.

### Auth hook — source of auth events
- `src/web/use-web-auth-runtime.ts` — Exposes `sessionAccessToken` and connection state used by `FullscreenLyricsPage`. Auth events in Phase 21 are derived from `useEffect` deps on these values.

### Requirements for this phase
- `.planning/REQUIREMENTS.md` — DEV-01, DEV-02, DEV-03, DEV-07, DEV-08, DEV-09 definitions

### Roadmap phase goal
- `.planning/ROADMAP.md` — Phase 21 goal and success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `showDiagnostics` section (fullscreen-lyrics-page.tsx line 929): `fixed left-4 top-16 z-20 min-w-[220px] rounded-sm border border-white/15 bg-black/60 px-3 py-2 text-[10px] text-white/72 backdrop-blur-sm` — copy this pattern for the dev panel container
- Diagnostics toggle button (line 817): `fixed left-4 top-10 z-20 bg-transparent text-[10px] tracking-[0.14em] text-white/45` with `aria-expanded` — template for the icon toggle button placement
- `useState<boolean>` pattern for `showDiagnostics` — same pattern for `showDevPanel`
- `lucide-react` is already a project dependency (used elsewhere in the UI)

### Established Patterns
- All fixed overlays use `z-20` — dev panel must follow this
- All fixed controls use the same subdued `text-white/40`–`text-white/45` opacity range until hovered
- ResizeObserver watches `lyricRowRefs` — the dev panel must be absolutely positioned and NOT flow into the lyric column DOM so it never triggers row remeasurement
- Two rAF loops run continuously — log state must not be an ancestor of these loops; scope to component state passed as props

### Integration Points
- `FullscreenLyricsPage` state: add `showDevPanel` boolean and `useDevActivityLog` hook result alongside the existing `showDiagnostics` state
- Auth event wiring: add `useEffect` watching `webAuth.sessionAccessToken` and auth connection state, calling `appendLogEntry` inside
- Panel rendered as a sibling of `<main>` in the JSX return, following the diagnostics section pattern

</code_context>

<specifics>
## Specific Ideas

- The existing diagnostics section has this exact structure: `{showDiagnostics ? <section>...</section> : null}` — the dev panel should follow this exact pattern, just anchored to the bottom-left
- The user described the panel as showing "the sequence of functions that were performed by the app" — short, readable event labels are preferred over verbose debug dumps
- "Sleek and visually appealing, but not disruptive of the lyrics" — when the panel is closed, it must leave zero visual residue; when open, the lyrics remain readable above/around it

</specifics>

<deferred>
## Deferred Ideas

- Log filtering by category (DEV-F1) — future milestone
- Clear log button (DEV-F2) — future milestone
- Keyboard shortcut toggle (DEV-F3) — future milestone
- Motion/viewport event categories (DEV-F4, DEV-F5) — future milestone
- Lyrics fetch, Spotify sync, and playback clock event wiring — Phase 22

</deferred>

---

*Phase: 21-panel-container-toggle-and-ux-shell*
*Context gathered: 2026-04-17*
