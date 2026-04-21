# Spotify Live Lyrics Web App

## What This Is

Liryk is a browser-based Spotify companion that shows synced lyrics for the currently playing track. It includes immersive fullscreen lyrics delivery, drift-resistant playback timing, a hold-transition-settle motion model for line changes, and a developer activity panel that logs real-time app operations — lyrics fetch, Spotify sync, playback clock, and auth events — from within fullscreen mode.

## Core Value

When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.

## Latest Shipped Milestone: v1.6 Developer Activity Panel

**Closed:** 2026-04-19  
**Outcome:** All 9 requirements satisfied, shipped in 3 days

Delivered in v1.6:

- Toggleable developer panel inside the fullscreen root with scroll isolation from the lyric viewport
- Real-time event log wired to lyrics fetch, Spotify sync, playback clock, and auth/connection events
- Auto-scroll with pause/resume, per-category color tints, 150-entry ring buffer

## Previous Milestones

**v1.5 Viewport-Locked Live Lyrics** — Blocked at Phase 20-06 (sustained mid-song viewport drift + Back to Live recentering unresolved); phases 18-20 shipped viewport ownership unification and song-boundary visibility improvements

## Latest Shipped Milestone: v1.4 Stable Line-Change Motion Model

**Closed:** 2026-04-09  
**Outcome:** Shipped with deferred tech debt

Delivered in v1.4:

- Time-windowed fullscreen lyric motion with hold, transition, and settle phases
- Adaptive pre-change transition windows with readable min/max clamps
- Calm cubic eased interpolation with bounded, exact landing behavior

Deferred at milestone close:

- Final motion quality-gate execution and human fullscreen playback checkpoint from `16-03-PLAN.md`
- Neighboring line visual continuity polish (`VIS-05`)
- Explicit timing-guardrail regression proof for the motion refactor (`SAFE-01`)

## Requirements

### Validated

- ✓ User can toggle a developer activity panel open/closed from fullscreen mode — v1.6
- ✓ Developer panel displays a real-time event log of app operations (lyrics fetch, Spotify sync, playback changes, auth events) — v1.6
- ✓ Panel is styled to fit the dark fullscreen aesthetic without disrupting lyric display — v1.6
- [x] Detect currently playing Spotify track and playback position on desktop via Spotify Web API OAuth PKCE
  - Validated in Phase 02: live-playback-sync-engine
- [x] Highlight lyric lines in real time based on playback position and keep view auto-scrolled
  - Validated in Phase 02: live-playback-sync-engine
- [x] Fetch lyrics for the exact track version from internet sources, prioritizing timestamped lyrics
  - Validated in Phase 03: lyrics-resolution-and-rendered-experience
- [x] Support multilingual lyric rendering (UTF-8, non-Latin scripts)
  - Validated in Phase 03: lyrics-resolution-and-rendered-experience
- [x] Gracefully handle missing lyrics by showing "Lyrics not found"
  - Validated in Phase 03: lyrics-resolution-and-rendered-experience
- [x] Cache lyrics locally by Spotify track ID to reduce redundant lookups
  - Validated in Phase 04: cache-freshness-and-repeat-load-performance
- [x] Keep lyric timing aligned through local playback anchor and estimated progress between polls
  - Validated in Phase 12: playback-clock-backbone-and-poll-safety
- [x] Drive lyric progression on animation frames with deterministic drift reconciliation
  - Validated in Phase 13: frame-synced-lyric-engine-and-drift-reconciliation
- [x] Provide timing diagnostics and conservative early cueing on stable baseline timing
  - Validated in Phase 14: timing-diagnostics-and-early-cueing
- [x] Implement hold-transition-settle lyric motion so the active line stays visually anchored for most of each line
  - Validated in Phase 15
- [x] Animate lyric track movement only inside an adaptive pre-change transition window near `nextLine.startMs`
  - Validated in Phase 15
- [x] Apply calm easing with no overshoot or bounce and preserve stable resting position after each line change
  - Validated in Phase 16
- [x] Use one consistent live-anchor model for fullscreen lyrics instead of conflicting `translateY` and window-scroll centering
  - Validated in Phase 18
- [x] Prevent programmatic live-anchor corrections from silently disabling live lock
  - Validated in Phase 18
- [x] Remove the accidental browser-document scroll surface from fullscreen live mode
  - Validated in Phase 18
- [x] Keep the highlighted synced lyric fully visible inside the fullscreen viewport at the beginning of a track
  - Validated in Phase 19
- [x] Keep the highlighted synced lyric fully visible inside the fullscreen viewport at the end of a track
  - Validated in Phase 19
- [x] Re-enable live lock through explicit Back to Live recovery and preserve intentional manual browse-away behavior
  - Validated in Phase 19

### Active

- [ ] Resolve sustained mid-song viewport drift and Back to Live recentering failure from v1.5 (Phase 20-06 blocker)
- [ ] Decide whether v1.5 closure work should be a dedicated v1.7 fix milestone or folded into broader polishing work

### Deferred Tech Debt

- [ ] Smooth neighboring line visual tier transitions (opacity/color/scale) during movement without abrupt state flips
- [ ] Re-publish explicit proof that playback timing correctness stayed unchanged after the motion refactor
- [ ] Run the deferred final motion quality gate and fullscreen manual checkpoint captured in `16-03-PLAN.md`

### Future Candidate

- [ ] Private Karaoke Mode (Spotify selector + YouTube backing source)

## Context

- v1.0–v1.4 complete through Phase 17; core lyrics sync, timing, and motion model are validated.
- v1.5 (Phases 18-20) partially shipped: viewport ownership unified, song-boundary visibility fixed, but Phase 20-06 sustained-drift blocker was deferred.
- v1.6 (Phases 21-22) shipped 2026-04-19: developer activity panel wired to all runtime event categories.
- Codebase: 16,217 TypeScript LOC as of v1.6 close.
- Tech stack: Vite + React + TypeScript, Spotify Web API PKCE, LRCLib lyrics provider, Tailwind CSS.
- Outstanding tech debt: sustained mid-song viewport drift (Phase 20-06), deferred motion polish (VIS-05, 16-03 quality gate, SAFE-01 timing proof), pre-existing test failures in lrc-parser and plain-lyrics-timing.

## Constraints

- **Security**: Credentials must come from `.env` only; never hardcode them.
- **API/Auth**: Spotify Web API remains the source of truth for now-playing and playback position.
- **Timing correctness**: Future UI or motion work must preserve playback clock architecture, drift correction policy, and active-line correctness.
- **Motion quality**: Prioritize readability and stability over flashy animation effects.
- **Responsiveness**: UI must work on desktop and mobile viewports.
- **Scope**: v1.5 is a fullscreen viewport-lock and live-scroll ownership fix, not a karaoke or provider-expansion milestone.

## Current State

- v1.6 shipped 2026-04-19 — developer activity panel fully wired across all event categories.
- Next work: decide direction for v1.7 — resolve v1.5 viewport drift blocker vs. begin Karaoke Mode vs. other enhancement.
- Pre-existing test failures in lrc-parser and plain-lyrics-timing remain deferred; should be cleaned up in next milestone.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep Spotify Web API as playback source during web migration | Preserves validated sync core while changing delivery surface | Good |
| Build immersive fullscreen mode as a dedicated page rather than incremental tweaks to the existing shell | Protects focused visual language without compromising utility shell workflows | Good |
| Use local playback anchor + estimated progress as lyric timing source | Poll-driven raw progress caused multi-second drift and jitter in real playback | Good |
| Add early cueing only after drift baseline is stable | Cueing before timing stability would mask core clock errors | Good |
| Replace continuous lyric drift with hold-transition-settle line-change motion | Continuous motion reduced readability during line consumption | Good |
| Close v1.4 with deferred tech debt instead of extending the milestone | Keeps shipped motion improvements while preserving unresolved polish work explicitly in the backlog | Accepted tradeoff |
| Treat viewport drift as a dedicated bug-fix milestone before karaoke expansion | The fullscreen reader must remain trustworthy at track boundaries before adding broader mode complexity | Good |
| Move fullscreen live anchoring onto a viewport-owned stage instead of browser-window scroll | Eliminates the transform/document-scroll conflict and keeps programmatic live corrections from mutating global page scroll | Good |
| Split dev panel into container/scaffold phase (21) and event wiring phase (22) | Infrastructure-first approach gives wiring phase a clean stable hook API to call | Good |
| Place dev panel as JSX sibling of `<main>`, not inside viewportSurfaceRef | Keeps panel DOM outside the lyric viewport so it cannot affect row ResizeObservers or live-lock scroll detection | Good |
| Use sentinel-ref pattern (undefined initial) for all change-detecting useEffects | Prevents spurious log entries on mount without needing component-level mount tracking | Good |

---
*Last updated: 2026-04-19 after v1.6 milestone*
