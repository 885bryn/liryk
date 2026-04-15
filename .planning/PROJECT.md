# Spotify Live Lyrics Web App

## What This Is

Liryk is a browser-based Spotify companion that shows synced lyrics for the currently playing track. It includes immersive fullscreen lyrics delivery, drift-resistant playback timing, and a hold-transition-settle motion model for line changes. The current milestone focuses on fixing fullscreen viewport drift so the active lyric stays visible at song boundaries and live mode behaves predictably.

## Core Value

When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.

## Current Milestone: v1.5 Viewport-Locked Live Lyrics

**Goal:** Eliminate the scroll/transform conflict in fullscreen lyrics so the active line stays inside the viewport at track boundaries and live lock only changes on real user intent.

**Target features:**
- A single viewport anchoring model for fullscreen lyrics that does not drift when tracks change
- Live-lock behavior that distinguishes programmatic corrections from manual browsing
- Boundary regression coverage for track start, track end, track transition, and Back to Live recovery

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

- [ ] Prove the viewport-lock fix does not regress playback timing, active-line selection, or motion settling behavior

### Deferred Tech Debt

- [ ] Smooth neighboring line visual tier transitions (opacity/color/scale) during movement without abrupt state flips
- [ ] Re-publish explicit proof that playback timing correctness stayed unchanged after the motion refactor
- [ ] Run the deferred final motion quality gate and fullscreen manual checkpoint captured in `16-03-PLAN.md`

### Future Candidate

- [ ] Private Karaoke Mode (Spotify selector + YouTube backing source)

## Context

- v1.0 is complete through Phase 4; core lyrics sync behavior is validated.
- v1.1 is complete through Phase 8 plus inserted Phase 07.1 for end-to-end web auth hardening.
- v1.2 is complete through Phase 11 with immersive fullscreen lyrics delivery.
- v1.3 is complete through Phases 12-14 with playback timing stabilization and early cueing.
- v1.4 was closed on 2026-04-09 after shipping the core motion redesign and accepting the remaining polish work as tech debt.
- Phase 18 replaced the old browser-window scroll anchoring path with a viewport-owned center stage and internal scroll surface.
- Remaining viewport bugs are now narrowed to boundary visibility and explicit live-lock recovery behavior at track start/end and manual browse-away flows.

## Constraints

- **Security**: Credentials must come from `.env` only; never hardcode them.
- **API/Auth**: Spotify Web API remains the source of truth for now-playing and playback position.
- **Timing correctness**: Future UI or motion work must preserve playback clock architecture, drift correction policy, and active-line correctness.
- **Motion quality**: Prioritize readability and stability over flashy animation effects.
- **Responsiveness**: UI must work on desktop and mobile viewports.
- **Scope**: v1.5 is a fullscreen viewport-lock and live-scroll ownership fix, not a karaoke or provider-expansion milestone.

## Current State

- v1.4 is archived and its deferred motion-polish items remain documented in the milestone archive.
- v1.5 is in progress, and Phase 19 completed song-boundary visibility plus Back to Live/manual-scroll recovery behavior.
- The next implementation work is Phase 20: viewport regression and timing safety closure.

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

---
*Last updated: 2026-04-15 after completing Phase 19*
