# Roadmap: Spotify Live Lyrics Web App

## Overview

This milestone fixes a fullscreen viewport correctness bug introduced by conflicting scroll and transform centering systems. The highlighted lyric must stay visible at track boundaries, live lock must only respond to user intent, and the fix must preserve the existing timing and motion contracts.

## Milestone

- **Milestone:** v1.5 Viewport-Locked Live Lyrics
- **Requirements mapped:** 9 of 9
- **First phase number:** 18

## Phases

- [x] **Phase 18: Viewport Anchor Ownership and Scroll Surface** - Unify fullscreen live anchoring around one viewport model and remove accidental scroll-state drift from live mode. (completed 2026-04-10)
- [x] **Phase 19: Song-Boundary Visibility and Live-Lock Recovery** - Keep the highlighted lyric visible at track start/end while preserving explicit browse-away and Back to Live behavior. (completed 2026-04-10)
- [ ] **Phase 20: Viewport Regression and Timing Safety Closure** - Prove the viewport fix across boundary scenarios without regressing timing, active-line selection, or settle behavior.

## Phase Details

### Phase 18: Viewport Anchor Ownership and Scroll Surface
**Goal**: Fullscreen live lyrics use one coherent viewport anchor model and no longer rely on contradictory document scrolling during live mode.
**Depends on**: Phase 16 delivered motion-window positioning behavior; v1.4 archive documents deferred polish work.
**Requirements**: VIEW-03, LIVE-01, SCROLL-01
**Plans**: 2 plans
Plans:
- [x] 18-01-PLAN.md - Move fullscreen live anchoring to a viewport-owned model and remove accidental document scroll ownership.
- [x] 18-02-PLAN.md - Lock viewport ownership with regressions and publish a Phase 18 validation runbook.
**Success Criteria**:
1. Track changes no longer force a non-zero `window.scrollY` that offsets the visually centered active lyric in live mode.
2. Programmatic live-anchor correction cannot silently flip live lock off.
3. Fullscreen lyrics no longer expose a large accidental scroll surface that can displace the active lyric while live mode is engaged.

### Phase 19: Song-Boundary Visibility and Live-Lock Recovery
**Goal**: The highlighted lyric remains visible at the start and end of songs, and the user can intentionally leave and return to live mode without inconsistent state.
**Depends on**: Phase 18
**Requirements**: VIEW-01, VIEW-02, LIVE-02, LIVE-03
**Plans**: 2 plans
Plans:
- [x] 19-01-PLAN.md - Add boundary-aware viewport geometry so first and last synced lyrics stay visible inside fullscreen.
- [x] 19-02-PLAN.md - Gate live lock on explicit user intent and restore the computed anchor through Back to Live recovery.
**Success Criteria**:
1. The first synced lyric after track start or transition is visibly inside the fullscreen viewport.
2. The last synced lyric and final handoff remain visibly inside the fullscreen viewport near song end.
3. Manual browse-away disables live lock only on explicit user scroll intent.
4. Back to Live restores the correct live anchor and returns the highlighted lyric to the intended viewport position.

### Phase 20: Viewport Regression and Timing Safety Closure
**Goal**: Boundary-specific regressions and manual verification prove the viewport fix without changing playback timing or motion correctness.
**Depends on**: Phase 19
**Requirements**: SAFE-01, QA-01
**Plans**: 2 plans
Plans:
- [x] 20-01-PLAN.md - Harden fullscreen viewport regressions and the targeted timing/motion safety gate.
- [ ] 20-02-PLAN.md - Publish the Phase 20 validation runbook and closure evidence ledger.
**Success Criteria**:
1. Automated regression coverage proves correct behavior for track start, track end, track transitions, manual browse-away, and Back to Live recovery.
2. Verification proves playback clock, drift policy, active-line selection, and settle semantics still match the validated contracts from earlier milestones.
3. A reproducible validation runbook exists for fullscreen viewport-lock behavior and song-boundary checks.

## Progress

**Execution Order:**
Phases execute in numeric order: 18 -> 19 -> 20

| Phase | Requirements | Status |
|-------|--------------|--------|
| 18. Viewport Anchor Ownership and Scroll Surface | VIEW-03, LIVE-01, SCROLL-01 | Complete (2026-04-10) |
| 19. Song-Boundary Visibility and Live-Lock Recovery | VIEW-01, VIEW-02, LIVE-02, LIVE-03 | Complete (2026-04-15) |
| 20. Viewport Regression and Timing Safety Closure | SAFE-01, QA-01 | In Progress (1/2 plans complete) |

## Future Candidate (After v1.5)

- **Private Karaoke Mode** remains deferred until fullscreen live-anchor correctness is stable.
- **VIS-05 / final motion polish** remains deferred and can be folded into a later polish milestone if still needed after viewport locking is fixed.
