# Phase 20: Viewport Regression and Timing Safety Closure - Research

**Researched:** 2026-04-15
**Domain:** Fullscreen viewport regression closure, timing safety verification, and manual validation runbooks
**Confidence:** HIGH

## User Constraints

No Phase 20 `CONTEXT.md` exists. Constraints below are taken from the user prompt, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md`, and prior Phase 18/19 artifacts.

### Locked Scope
- Phase 20 addresses `SAFE-01` and `QA-01`.
- Do not redesign playback clock, drift policy, active-line selection, early cueing, lyric providers, auth, or karaoke behavior.
- Prove the viewport fix across track start, track end, track transitions, manual browse-away, and Back to Live recovery.
- Prove playback clock, drift policy, active-line selection, and settle semantics still match earlier validated contracts.
- Publish a reproducible fullscreen viewport-lock and song-boundary validation runbook.

### Preserved Prior Decisions
- Fullscreen live anchoring uses a viewport-owned internal surface, not browser-window scroll.
- Programmatic recentering must not disable live lock.
- Manual browse-away disables live lock only after explicit user scroll intent.
- Back to Live is the explicit relock path and must restore the computed live anchor.
- Boundary visibility consumes the existing row-layout and timeline contracts; it must not invent a second active-line selector.

### Out of Scope
- Karaoke mode.
- Broad fullscreen visual redesign.
- New lyric provider/source work.
- Deferred `VIS-05` neighboring-line polish, unless a minimal assertion is needed to prove timing or settle safety.

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SAFE-01 | The viewport-lock fix does not regress playback timing correctness, drift correction behavior, active-line selection, or settle semantics. | Use the existing core safety suite: `playback-clock`, `lyric-sync-engine`, `lyric-timeline`, `lyric-motion-window`, `live-sync-runtime`, plus fullscreen motion tests. Do not modify timing internals unless a regression is proven. |
| QA-01 | Automated and manual regression coverage proves correct behavior at track start, track end, track transitions, manual browse-away, and Back to Live recovery. | Extend or tighten `src/web/fullscreen-lyrics-page.test.tsx` and publish a Phase 20 validation/runbook artifact that repeats Phase 19 real-browser checks with exact scenarios and expected outcomes. |

</phase_requirements>

## Summary

Phase 20 is a closure phase, not another viewport implementation phase. Phase 18 moved live anchoring to a viewport-owned internal surface, and Phase 19 added boundary visibility plus explicit manual browse-away and Back to Live recovery. Phase 20 should preserve those implementation boundaries, tighten regression confidence, and publish a milestone-level validation artifact proving the fix did not disturb the timing and motion contracts from Phases 12-16.

The current local baseline is green for the relevant safety set: `src/web/fullscreen-lyrics-page.test.tsx`, `src/core/sync/lyric-timeline.test.ts`, `src/core/sync/lyric-sync-engine.test.ts`, `src/core/sync/lyric-motion-window.test.ts`, `src/core/playback/playback-clock.test.ts`, and `src/app/live-sync-runtime.test.ts` passed 79 tests on 2026-04-15. `rtk npm run build` also passed with the existing large chunk warning. However, the fullscreen suite emits React `act(...)` warnings in programmatic recentering and Back to Live tests; Phase 20 should either eliminate those warnings or explicitly account for them before treating the run as clean closure evidence.

**Primary recommendation:** Plan Phase 20 as a verification hardening pass: add independent regression assertions where current Phase 19 tests are too coupled to helper output, run the combined viewport/timing/motion safety suite, and create a reproducible validation runbook for real fullscreen browser checks.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | Fullscreen component state/effects/refs | Existing fullscreen page uses React hooks, refs, effects, and Testing Library render behavior. |
| TypeScript | 5.9.3 | Typed UI/core contracts | Existing playback, sync, and fullscreen contracts are TypeScript-first. |
| Vitest | 2.1.9 | Deterministic unit/integration test runner | Project test script is `vitest run`; targeted file filters are already used throughout GSD validation. |
| @testing-library/react | 16.3.2 | jsdom-backed fullscreen behavior tests | Existing fullscreen tests use render, screen queries, fireEvent, cleanup, and waitFor. |
| jsdom | 26.1.0 | DOM environment for fullscreen tests | `vite.config.ts` sets `test.environment = "jsdom"`; viewport geometry is stubbed in tests. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vite | 5.4.21 | Build and Vitest config host | Use for the final `rtk npm run build` phase gate. |
| @vitejs/plugin-react | 4.7.0 | React transform for Vite/Vitest | Existing config plugin; no change needed. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing Vitest + jsdom fullscreen tests | Playwright/Cypress browser automation | More realistic, but adds a new stack and setup for a closure phase. Keep browser validation manual unless automation gaps persist after v1.5. |
| Existing core timing tests | New synthetic timing harness | Duplicates well-tested contracts and risks diverging from production helpers. |
| Existing manual runbook docs | Ad hoc user approval notes only | Approval notes are not reproducible enough for milestone closure. |

**Installation:**
```bash
npm install
```

No new package should be installed for Phase 20.

**Version verification:** Exact versions above were read from `package-lock.json` on 2026-04-15. `vite v5.4.21` was also observed in `rtk npm run build`. `npm view` registry checks were not required because Phase 20 should use the current workspace stack, not introduce or upgrade dependencies.

## Architecture Patterns

### Recommended Project Structure

```text
src/
|- web/
|  |- fullscreen-lyrics-page.tsx       # preserve viewport-owned anchor, manual intent, Back to Live paths
|  `- fullscreen-lyrics-page.test.tsx  # boundary, browse-away, recovery, fullscreen motion regressions
|- core/
|  |- playback/
|  |  `- playback-clock.test.ts        # monotonic anchor-backed progress contract
|  `- sync/
|     |- lyric-timeline.test.ts        # active/next line boundary contract
|     |- lyric-sync-engine.test.ts     # drift policy and stale sample contract
|     `- lyric-motion-window.test.ts   # hold/transition/complete settle contract
|- app/
|  `- live-sync-runtime.test.ts        # animation frame, diagnostics, and drift propagation contract
`- .planning/phases/20-viewport-regression-and-timing-safety-closure/
   |- 20-RESEARCH.md
   |- 20-VALIDATION.md                # create in implementation plan
   `- 20-VERIFICATION.md              # create during verification if GSD verifier runs
```

### Pattern 1: Closure Through Cross-Contract Test Sets

**What:** Treat viewport correctness and timing safety as one regression gate, but keep assertions in their owning files.
**When to use:** Every Phase 20 task and phase gate.
**Example:**
```bash
rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts
rtk npm run build
```

### Pattern 2: Independent Viewport Assertions, Not Helper Echoes

**What:** Boundary tests should assert observable row bounds, active state, and scroll/live-lock state. Avoid tests where expected behavior is only "whatever `getBoundaryLockedScrollTop(...)` returns."
**When to use:** Track start/end/transition and Back to Live hardening.
**Example:**
```typescript
const activeBounds = lyricRows[activeIndex]?.getBoundingClientRect();
expect(activeBounds?.top ?? -1).toBeGreaterThanOrEqual(0);
expect(activeBounds?.bottom ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(viewportHeight);
expect(screen.queryByTestId("fullscreen-return-live")).toBeNull();
```

### Pattern 3: Preserve Timing Authority

**What:** Fullscreen should consume `estimatedProgressMs`, early cueing, and `getLineIndicesAt(...)`; it should not compute active lines from DOM positions or scroll state.
**When to use:** Any test or source cleanup touching `src/web/fullscreen-lyrics-page.tsx`.
**Example:**
```typescript
const lineIndices =
  syncedTimeline.lines.length > 0
    ? getLineIndicesAt(syncedTimeline, cueAdjustedProgressMs)
    : { activeIndex: null, nextIndex: null };
```

### Pattern 4: Treat Manual Verification as a Versioned Artifact

**What:** Convert Phase 18/19 ad hoc validation and user approval into a Phase 20 runbook with prerequisites, exact commands, real-browser scenarios, expected observations, and sign-off fields.
**When to use:** `20-VALIDATION.md`.
**Example structure:**
```text
1. Run automated safety suite.
2. Build production bundle.
3. Start app and open /fullscreen.
4. Verify track start, transition, final lyric, final handoff, manual browse-away, Back to Live.
5. Record browser, viewport size, track/lyrics used, and outcome.
```

### Anti-Patterns to Avoid

- **Changing timing internals to make viewport tests easier:** Phase 20 proves safety; it should not rewrite `playback-clock`, `lyric-sync-engine`, or `lyric-timeline`.
- **Source assertions as the only proof:** They are useful for guarding deprecated paths, but Phase 20 must also assert behavior.
- **Self-fulfilling geometry tests:** If a test stubs row bounds using the same helper under test as the expected result, add at least one independent bound/state assertion.
- **Manual runbook without exact expected outcomes:** "Looks good" is not reproducible closure evidence.
- **Ignoring React async warnings:** Passing tests with `act(...)` warnings are weaker than clean tests for interaction-heavy recovery behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Playback clock safety | New timer/progress simulation layer | `src/core/playback/playback-clock.test.ts` and `src/app/live-sync-runtime.test.ts` | Existing tests already prove monotonic elapsed progress, pause freeze, drift diagnostics, and RAF propagation. |
| Drift reconciliation | New drift thresholds or smoothing policy | `src/core/sync/lyric-sync-engine.test.ts` | Policy is already explicit: hard snap over 1200ms and bounded 100ms soft correction. |
| Active-line selection | DOM-position or scroll-based active line resolver | `createLyricTimeline(...)` + `getLineIndicesAt(...)` | Timeline owns pre-first, exact-boundary, dense, and after-last semantics. |
| Settle semantics | Renderer-local offset math | `getTransitionPhase(...)`, `getTargetScrollOffset(...)`, and motion-window tests | Core helpers already encode hold/transition/complete and exact landing. |
| Browser automation stack | Playwright/Cypress for one closure phase | Manual runbook plus jsdom regressions | Adds maintenance/setup cost without clear need for v1.5 closure. |

**Key insight:** Phase 20 should strengthen proof around the existing architecture. Any new production code should be limited to fixing a concrete regression uncovered by tests, not broadening the viewport or timing model.

## Common Pitfalls

### Pitfall 1: Treating Phase 19 Green Tests as Sufficient Closure

**What goes wrong:** Boundary cases pass, but timing and motion safety remain unpublished.
**Why it happens:** Phase 19 was scoped to viewport visibility and recovery, not milestone-level safety closure.
**How to avoid:** Run and document the combined viewport/timing/motion suite plus build as the Phase 20 gate.
**Warning signs:** Phase plan only touches `fullscreen-lyrics-page.test.tsx` and never mentions `playback-clock`, `lyric-sync-engine`, `lyric-timeline`, `lyric-motion-window`, or `live-sync-runtime`.

### Pitfall 2: Helper-Coupled Boundary Tests

**What goes wrong:** Tests validate the same helper output they use to construct the geometry, so a bad helper can still pass.
**Why it happens:** jsdom has no real layout, so tests must stub geometry manually.
**How to avoid:** Add at least one assertion per scenario that verifies visible row bounds, active class/line identity, button state, and scroll state from outside the helper's return value.
**Warning signs:** Expected scroll target is computed only via `getBoundaryLockedScrollTop(...)` and no independent condition would fail if helper logic regressed.

### Pitfall 3: Reopening Timing Policy Under a QA Requirement

**What goes wrong:** A verification phase accidentally changes drift thresholds, cue lead, or active-line semantics.
**Why it happens:** `SAFE-01` sounds broad, but the requirement is proof of no regression.
**How to avoid:** Keep timing source files read-only unless an existing test fails or a new regression test exposes a real bug.
**Warning signs:** Changes to `HARD_DRIFT_SNAP_MS`, `MAX_SOFT_CORRECTION_MS`, `DEFAULT_CUE_LEAD_MS`, `getLineIndicesAt(...)`, or `getTransitionPhase(...)` without a failing safety test.

### Pitfall 4: Noisy React Interaction Tests

**What goes wrong:** The suite passes but prints `act(...)` warnings, making it harder to trust Back to Live and programmatic recentering assertions.
**Why it happens:** Timers, animation frames, and state updates run after interaction assertions.
**How to avoid:** Wrap interaction/timer advancement in Testing Library/React-supported async patterns and wait for post-interaction UI state before ending tests.
**Warning signs:** Warnings specifically in `keeps live lock enabled during programmatic recentering...` or `Back to Live restores...`.

### Pitfall 5: Manual Verification That Cannot Be Repeated

**What goes wrong:** User approval exists but future maintainers cannot reproduce it.
**Why it happens:** Browser, viewport, track, exact observation windows, and expected results are not recorded.
**How to avoid:** Include a runbook table with scenario, setup, exact action, expected result, evidence captured, and pass/fail.
**Warning signs:** Validation doc says "test fullscreen manually" without track start/end/transition/Back to Live steps.

## Code Examples

Verified patterns from current project sources:

### Boundary Visibility Assertion

```typescript
// Source: src/web/fullscreen-lyrics-page.test.tsx
const activeBounds = lyricRows[2]?.getBoundingClientRect();
expect(activeBounds?.top ?? -1).toBeGreaterThanOrEqual(0);
expect(activeBounds?.bottom ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(300);
```

### Back to Live Recovery Contract

```typescript
// Source: src/web/fullscreen-lyrics-page.tsx
onClick={() => {
  userScrollIntentRef.current = false;
  setIsLiveLocked(true);
  scrollToLiveAnchor("smooth");
}}
```

### Timing Safety Contract

```typescript
// Source: src/core/sync/lyric-sync-engine.ts
export const HARD_DRIFT_SNAP_MS = 1_200;
const MAX_SOFT_CORRECTION_MS = 100;
```

### Active-Line Boundary Contract

```typescript
// Source: src/core/sync/lyric-timeline.test.ts
expect(getLineIndicesAt(timeline, 999)).toEqual({ activeIndex: null, nextIndex: 0 });
expect(getLineIndicesAt(timeline, 20_000)).toEqual({ activeIndex: 1, nextIndex: null });
```

### Phase 20 Safety Command

```bash
rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts
rtk npm run build
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mixed transform centering and browser-window scroll | Viewport-owned internal surface and centered stage | Phase 18, verified 2026-04-09 | Phase 20 should guard against `window.scrollY`/document-scroll regression. |
| Viewport boundary behavior left for manual observation | Deterministic jsdom geometry tests plus manual browser approval | Phase 19, approved 2026-04-14 | Phase 20 should consolidate proof and make the manual steps reproducible. |
| Continuous line drift during playback | Hold/transition/settle motion model with exact complete landing | Phases 15-16 | Phase 20 must keep settle tests in the safety gate. |
| Raw poll progress as only timing source | Local playback anchor plus RAF estimated progress and drift reconciliation | Phases 12-14 | Phase 20 must prove this still runs unchanged. |

**Deprecated/outdated:**
- `window.scrollY`-based live anchoring in fullscreen.
- Auto-relocking based only on scroll position.
- Treating scroll position as timing or active-line authority.
- Timing-policy changes hidden inside viewport QA work.

## Open Questions

1. **Should Phase 20 fix the current React `act(...)` warnings or only document them?**
   - What we know: Targeted safety tests pass, but two fullscreen interaction tests emit warnings.
   - What's unclear: Whether the warnings indicate a real async assertion gap or only leftover programmatic timer cleanup.
   - Recommendation: Plan a small test-harness cleanup task before final validation. Closure evidence should be warning-clean if practical.

2. **Should Phase 20 add new production code?**
   - What we know: Current targeted tests and build pass. Phase 20 is framed as regression/verification closure.
   - What's unclear: Independent hardening tests might expose a helper or geometry weakness.
   - Recommendation: Default to tests/docs only; allow production changes only behind a failing regression.

3. **What manual tracks should be used for the runbook?**
   - What we know: Phase 19 user approval confirms real browser retesting happened, but the artifact does not identify tracks.
   - What's unclear: Which synced Spotify tracks are stable enough for future repeatability.
   - Recommendation: Runbook should support "known synced track with first/last timestamps" plus record exact track title/artist/Spotify ID during verification.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + @testing-library/react 16.3.2 + jsdom 26.1.0 |
| Config file | `vite.config.ts` |
| Quick run command | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` |
| Safety run command | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts` |
| Full suite command | `rtk npm run test && rtk npm run build` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| SAFE-01 | Playback clock estimates elapsed progress, freezes when paused, and clamps negative elapsed deltas | unit | `rtk npm run test -- src/core/playback/playback-clock.test.ts` | yes |
| SAFE-01 | Drift policy hard-resets large drift, bounds soft correction, bypasses soft correction on transitions, ignores stale snapshots | unit | `rtk npm run test -- src/core/sync/lyric-sync-engine.test.ts` | yes |
| SAFE-01 | Active-line selection preserves pre-first null active, exact boundary activation, dense boundaries, and last-line persistence | unit | `rtk npm run test -- src/core/sync/lyric-timeline.test.ts` | yes |
| SAFE-01 | Motion settle semantics preserve hold, transition, complete, no overshoot, null-next stability, and exact offset continuity | unit | `rtk npm run test -- src/core/sync/lyric-motion-window.test.ts` | yes |
| SAFE-01 | Runtime estimated progress, diagnostics drift, hard-reset diagnostics, and RAF lifecycle remain stable | integration | `rtk npm run test -- src/app/live-sync-runtime.test.ts` | yes |
| SAFE-01 | Fullscreen cueing, pre-first highlight, transform motion, hold/transition/complete rendering still match core contracts | fullscreen integration | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes |
| QA-01 | Track start and track transition keep first synced lyric inside viewport | fullscreen integration | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes |
| QA-01 | Track end and final handoff keep last synced lyric inside viewport | fullscreen integration | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes |
| QA-01 | Manual browse-away disables live lock only after explicit user intent | fullscreen interaction | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes |
| QA-01 | Back to Live restores live lock and the boundary-aware anchor | fullscreen interaction | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes |
| QA-01 | Reproducible browser runbook exists for viewport-lock and song-boundary checks | docs/manual | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx && rtk npm run build` plus manual checklist | no - Wave 0 |

### Sampling Rate

- **Per task commit:** `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` for fullscreen tasks; targeted core file command for timing/motion-only test edits.
- **Per wave merge:** `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts`
- **Phase gate:** `rtk npm run test && rtk npm run build`, followed by the manual fullscreen runbook.

### Wave 0 Gaps

- [ ] `.planning/phases/20-viewport-regression-and-timing-safety-closure/20-VALIDATION.md` - maps `SAFE-01` and `QA-01` to exact commands and manual checks.
- [ ] `src/web/fullscreen-lyrics-page.test.tsx` - eliminate or explicitly resolve React `act(...)` warnings in programmatic recentering and Back to Live tests.
- [ ] `src/web/fullscreen-lyrics-page.test.tsx` - add any missing independent assertions so boundary/recovery tests do not only mirror `getBoundaryLockedScrollTop(...)` expected output.

## Sources

### Primary (HIGH confidence)

- `.planning/STATE.md` - current phase, decisions, and accumulated timing/viewport history.
- `.planning/ROADMAP.md` - Phase 20 goal, dependencies, requirements, and success criteria.
- `.planning/REQUIREMENTS.md` - `SAFE-01` and `QA-01` definitions plus out-of-scope timing redesign.
- `.planning/PROJECT.md` - milestone context, active/deferred constraints, and key decisions.
- `.planning/phases/18-viewport-anchor-ownership-and-scroll-surface/18-CONTEXT.md` - viewport ownership decisions and deferred Phase 20 validation scope.
- `.planning/phases/18-viewport-anchor-ownership-and-scroll-surface/18-01-PLAN.md`, `18-02-PLAN.md`, `18-VALIDATION.md`, `18-VERIFICATION.md` - viewport-owned scroll model and automated proof.
- `.planning/phases/19-song-boundary-visibility-and-live-lock-recovery/19-RESEARCH.md`, `19-01-PLAN.md`, `19-02-PLAN.md`, `19-VALIDATION.md`, `19-VERIFICATION.md` - boundary visibility, live-lock recovery, and manual approval.
- `.planning/phases/16-smooth-transition-execution-and-settling/16-02-SUMMARY.md`, `16-03-PLAN.md` - settle semantics and deferred quality-gate context.
- `src/web/fullscreen-lyrics-page.tsx` and `src/web/fullscreen-lyrics-page.test.tsx` - current viewport implementation and 36 fullscreen tests.
- `src/core/playback/playback-clock.test.ts`, `src/core/sync/lyric-timeline.test.ts`, `src/core/sync/lyric-sync-engine.test.ts`, `src/core/sync/lyric-motion-window.test.ts`, `src/app/live-sync-runtime.test.ts` - timing and motion safety contracts.
- `package-lock.json`, `package.json`, `vite.config.ts` - local stack versions and jsdom test environment.

### Secondary (MEDIUM confidence)

- Vitest official CLI docs: https://vitest.dev/guide/cli.html - confirms file filters and `vitest run` behavior.
- Testing Library official event guidance: https://testing-library.com/docs/guide-events/ - confirms `fireEvent` is close enough for many cases but not a full real-user interaction substitute.
- React official `act` docs: https://react.dev/reference/react/act - relevant to current async warning cleanup.

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - exact versions verified from `package-lock.json`, `vite.config.ts`, and successful local build output.
- Architecture: HIGH - based on current implementation, Phase 18/19 plans, summaries, validation, and verification artifacts.
- Pitfalls: HIGH - derived from direct source/test inspection plus current targeted test output.
- Manual verification shape: MEDIUM - Phase 19 manual approval exists, but repeatable track/browser details still need to be captured in Phase 20.

**Current baseline checked:** 2026-04-15
- `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts` - passed, 6 files / 79 tests.
- `rtk npm run build` - passed with existing chunk-size warning.

**Research date:** 2026-04-15
**Valid until:** 2026-05-15
