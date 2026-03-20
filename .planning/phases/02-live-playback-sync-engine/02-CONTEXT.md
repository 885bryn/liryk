# Phase 2: Live Playback Sync Engine - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver live lyric progression that stays aligned to Spotify playback position and playback controls (pause/resume/seek/skip/device changes), with readable auto-scroll and clear playback-state messaging while playback is active or unavailable.

</domain>

<decisions>
## Implementation Decisions

### Sync responsiveness
- Playback highlight should feel naturally smooth rather than twitchy or over-corrected.
- Minor timing drift should be corrected subtly when possible (avoid jarring jumps).
- Use dual emphasis in lyric rendering: current line plus next line as strong visual focus.
- Show a subtle sync-confidence indicator when timing is approximate.

### Seek and skip behavior
- On seek, highlight should jump immediately to the new playback position (no replay animation through skipped lines).
- On next/previous track, reset lyric state to the new track rather than leaving old lyrics visible.
- Follow whichever Spotify device is currently active.
- During rapid playback changes, latest action wins (settle quickly to newest state).

### Auto-scroll style
- Keep active lyric around a center-biased viewport position.
- Scroll motion should be smooth stepped per line change (not hard jumps, not constant drift).
- If user manually scrolls away, pause auto-scroll briefly to respect reading intent.
- Provide a clear "back to live line" control after manual scroll override.

### Playback-state UI behavior
- On pause, freeze highlight on the current line.
- When no track is playing, show a friendly idle message (not blank UI).
- For ads/unsupported content, show explicit lyrics-unavailable notice until supported music resumes.
- Show transient statuses (syncing/reconnecting/waiting) as a subtle text status line.

### Claude's Discretion
- Exact visual styling for dual-line emphasis, status badge, and status-line placement.
- Precise copy wording for idle/unavailable/transient states while preserving intent.
- Exact timeout duration for temporary manual-scroll override before auto-scroll resume.

</decisions>

<specifics>
## Specific Ideas

- Sync should prioritize "feels right" smoothness while still correcting drift.
- The experience should remain predictable under abrupt playback actions (seek/skip/device switch).
- Auto-scroll should support both passive live reading and active manual browsing via a clear return-to-live action.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 02-live-playback-sync-engine*
*Context gathered: 2026-03-19*
