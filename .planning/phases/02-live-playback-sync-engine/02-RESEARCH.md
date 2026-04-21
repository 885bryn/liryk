# Phase 2: Live Playback Sync Engine - Research

**Researched:** 2026-03-19
**Domain:** Spotify playback polling and real-time lyric line synchronization
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Playback highlight should feel naturally smooth rather than twitchy or over-corrected.
- Minor timing drift should be corrected subtly when possible (avoid jarring jumps).
- Use dual emphasis in lyric rendering: current line plus next line as strong visual focus.
- Show a subtle sync-confidence indicator when timing is approximate.
- On seek, highlight should jump immediately to the new playback position (no replay animation through skipped lines).
- On next/previous track, reset lyric state to the new track rather than leaving old lyrics visible.
- Follow whichever Spotify device is currently active.
- During rapid playback changes, latest action wins (settle quickly to newest state).
- Keep active lyric around a center-biased viewport position.
- Scroll motion should be smooth stepped per line change (not hard jumps, not constant drift).
- If user manually scrolls away, pause auto-scroll briefly to respect reading intent.
- Provide a clear "back to live line" control after manual scroll override.
- On pause, freeze highlight on the current line.
- When no track is playing, show a friendly idle message (not blank UI).
- For ads/unsupported content, show explicit lyrics-unavailable notice until supported music resumes.
- Show transient statuses (syncing/reconnecting/waiting) as a subtle text status line.

### Claude's Discretion
- Exact visual styling for dual-line emphasis, status badge, and status-line placement.
- Precise copy wording for idle/unavailable/transient states while preserving intent.
- Exact timeout duration for temporary manual-scroll override before auto-scroll resume.

### Deferred Ideas (OUT OF SCOPE)
- None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAY-01 | User can see lyrics tied to the currently playing Spotify track without requiring Spotify Premium | Use Spotify Web API `currently playing` polling (read-only scopes) and per-track session reset keyed by Spotify track ID/device context |
| PLAY-02 | User sees lyric sync update based on current playback position (`progress_ms`) while a track is playing | Build timestamp-anchored prediction clock and emit active-line updates on animation cadence between poll snapshots |
| PLAY-03 | User sees lyric sync react correctly when playback is paused, resumed, skipped, or seeked | Detect control transitions from snapshot deltas, freeze on pause, hard re-anchor on seek/skip, and cancel stale sessions |
| SYNC-01 | User sees the correct lyric line highlighted in real time during playback | Map predicted progress to timestamped lyric timeline with binary-search cursoring and drift-correction thresholds |
| SYNC-02 | User sees the lyrics view auto-scroll to keep the active line in view as the song progresses | Center-biased scroll controller with smooth stepped movement, temporary manual override, and return-to-live action |
</phase_requirements>

## Summary

Phase 2 should establish one deterministic runtime loop: poll Spotify for the active playback snapshot, maintain a local monotonic clock between polls, and continuously map estimated playback position to the active lyric line. This is where sync reliability is won or lost; the core risk is not missing APIs but race conditions and drift behavior when playback changes quickly.

The plan should separate concerns into playback acquisition, sync computation, and UI projection. That keeps timing logic framework-agnostic and testable while allowing renderer behavior (dual emphasis, auto-scroll pause/resume, status line) to evolve without destabilizing the clock math. The user constraints require immediate seek jumps, latest-action-wins semantics, and explicit idle/unavailable messaging, so state transitions must be first-class instead of inferred ad hoc in UI components.

**Primary recommendation:** Implement a session-based sync engine with snapshot anchoring and explicit playback transition handling first, then wire a viewport controller that respects manual scrolling while preserving live-line recovery.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Existing Spotify runtime adapter (`src/infra/spotify`) | current repo | Pull normalized currently-playing snapshots and handle auth reuse | Reuses established Phase 1 auth/session boundary and avoids duplicate token logic |
| TypeScript + Vitest | current repo | Deterministic sync math and transition unit tests | Timing behavior needs fast deterministic tests on pure functions and orchestrators |
| Browser `performance.now` + `requestAnimationFrame` | platform | Monotonic interpolation and smooth cursor refresh | Required to avoid stutter from network poll cadence mismatch |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing `AuthRuntime` session surface | current repo | Access valid Spotify session and connected/waiting status | Use as precondition for playback polling and reconnect messaging |
| Existing React renderer testing setup | current repo | Verify highlight, status, and auto-scroll behavior | Use for interaction tests around manual scroll override and return-to-live |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Poll + predict clock | Poll-only UI updates | Simpler, but visibly jumpy and fails smoothness constraint |
| Hard snap on every drift delta | Soft-correction threshold then snap for large drift | Hard snap is easy but violates non-jarring sync requirement |

## Architecture Patterns

### Recommended Project Structure
```
src/
  core/playback/      # snapshot normalization + transition detection
  core/sync/          # clock anchor, drift correction, lyric cursor mapping
  app/                # runtime orchestration of polling + sync loop
  state/playback/     # canonical playback/sync UI state
  ui/lyrics/          # live lyrics panel, status line, auto-scroll controls
```

### Pattern 1: Snapshot Anchor + Local Prediction Clock
**What:** Store latest Spotify `timestamp` + `progress_ms` snapshot, then estimate current progress via monotonic elapsed time while playing.
**When to use:** Entire playback-active loop.

### Pattern 2: Transition Classifier with Latest-Action-Wins
**What:** Compare consecutive snapshots to classify pause/resume/seek/skip/device switch and ignore stale async updates by session sequence.
**When to use:** Every poll cycle and asynchronous lyric-session updates.

### Pattern 3: Center-Biased Auto-Scroll with Temporary Manual Override
**What:** Drive scroll target from active line index, pause automated scrolling on user interaction for a short window, show return-to-live control.
**When to use:** Lyric list viewport updates.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-time interpolation clock | Wall-clock (`Date.now`) delta math and ad-hoc timers | `performance.now`-anchored estimator | Wall-clock shifts and timer jitter create drift artifacts |
| Transition handling | UI component-local conditional spaghetti | Central playback transition classifier in `core/playback` | Prevents inconsistent pause/seek/skip behavior across screens |
| Scroll orchestration | Direct DOM jumps on each frame | Line-change driven smooth stepped scrolling | Reduces motion noise and preserves readability |

## Common Pitfalls

### Pitfall 1: Treating `progress_ms` as continuously current
**What goes wrong:** Active line updates only when poll response arrives, creating visible stutter.
**How to avoid:** Use monotonic prediction between snapshots and re-anchor each poll.

### Pitfall 2: Over-correcting small drift
**What goes wrong:** Highlight jitters backward/forward on minor network timing variance.
**How to avoid:** Apply soft correction for small deltas and snap only beyond seek threshold.

### Pitfall 3: Race conditions on rapid seek/skip/device changes
**What goes wrong:** Old track/position events overwrite newer state.
**How to avoid:** Track session/version IDs and enforce latest-action-wins update guards.

### Pitfall 4: Auto-scroll fights user interaction
**What goes wrong:** Manual reading is interrupted immediately by live scroll.
**How to avoid:** Suspend auto-scroll for a bounded timeout on manual scroll and provide explicit return-to-live action.

## Code Examples

### Predicted playback estimator
```typescript
export function estimateProgressMs(anchor: {
  progressMs: number;
  capturedAtPerfMs: number;
  isPlaying: boolean;
}, nowPerfMs: number): number {
  if (!anchor.isPlaying) {
    return anchor.progressMs;
  }

  return Math.max(0, anchor.progressMs + (nowPerfMs - anchor.capturedAtPerfMs));
}
```

### Drift correction policy
```typescript
export function applyDriftCorrection(input: {
  estimatedMs: number;
  observedMs: number;
}): { correctedMs: number; confidence: "synced" | "estimated" } {
  const driftMs = input.observedMs - input.estimatedMs;
  if (Math.abs(driftMs) > 1200) {
    return { correctedMs: input.observedMs, confidence: "synced" };
  }

  return {
    correctedMs: input.estimatedMs + driftMs * 0.25,
    confidence: Math.abs(driftMs) > 300 ? "estimated" : "synced",
  };
}
```

## Open Questions

1. Should playback polling run in renderer runtime or main process IPC bridge for this repository's eventual Electron split?
   - What we know: current codebase is TypeScript module-level runtime with no finalized process split.
   - Recommendation: Keep Phase 2 runtime in app-layer module with interface-based Spotify client so process migration remains mechanical later.

## Sources

### Primary (HIGH confidence)
- Existing project architecture and pitfall research (`.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md`)
- Spotify currently playing endpoint semantics (`timestamp`, `progress_ms`) and rate-limit behavior

### Secondary (MEDIUM confidence)
- Existing Phase 1 runtime/auth patterns in `src/app/auth-runtime.ts` and related tests

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - builds directly on repo-established runtime and test tools
- Architecture: HIGH - aligns with phase requirements and locked context decisions
- Pitfalls: HIGH - specific to timing drift, transition races, and viewport control
