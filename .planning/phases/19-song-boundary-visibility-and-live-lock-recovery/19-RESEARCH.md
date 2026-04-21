# Phase 19: Song-Boundary Visibility and Live-Lock Recovery - Research

**Researched:** 2026-04-09
**Domain:** Fullscreen lyric viewport geometry, internal scroll ownership, and explicit live-lock recovery
**Confidence:** HIGH

## Summary

Phase 18 successfully moved fullscreen live mode off browser-window scroll and onto an internal viewport-owned scroll surface. The remaining Phase 19 work is narrower: make the first active synced line and the final active/final-handoff line stay visibly inside the fullscreen viewport, and make live lock change only on real user browse intent while keeping Back to Live deterministic.

The critical planning insight is that the unresolved bug is primarily a layout/geometry contract issue, not a playback-clock issue. The timing baseline is already stable: `src/core/sync/lyric-timeline.ts`, `src/core/sync/lyric-sync-engine.ts`, and their tests already prove pre-first `activeIndex: null`, deterministic `nextIndex`, and last-line persistence after the final timestamp. Phase 19 should consume those contracts, not reinterpret them.

**Primary recommendation:** Keep Phase 19 inside `src/web/fullscreen-lyrics-page.tsx` plus its tests, introduce one boundary-aware viewport-anchor model for first/last-row visibility, and add explicit user-intent tests for browse-away and Back to Live without changing timeline, drift, or settle contracts.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIEW-01 | User always sees the highlighted synced lyric row inside the visible fullscreen viewport on the first active lyric after a track starts or transitions. | Add boundary-aware viewport anchor math for index `0` / first active line, backed by fullscreen geometry tests and transition-entry coverage. |
| VIEW-02 | User always sees the highlighted synced lyric row inside the visible fullscreen viewport on the last active lyric and final line handoff near song end. | Preserve `nextIndex: null` semantics from timeline/sync engine, but clamp or pad the viewport anchor so the final row remains visible and Back to Live lands on the correct final anchor. |
| LIVE-02 | Live lock disables only after explicit user scroll intent moves the viewport away from live mode. | Keep `viewportSurfaceRef` as the only scroll owner, distinguish programmatic vs user scroll paths, and require tests that manual scroll disables live lock while track changes/programmatic recentering do not. |
| LIVE-03 | Back to Live restores the correct live anchor and re-enables live lock without leaving the active lyric misaligned. | Back to Live must restore both state and geometry: set live lock true, restore the current boundary-aware live anchor, and verify the active lyric is visible after recovery. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | Fullscreen page state/effects/refs | Existing fullscreen page already uses React hooks and local refs for live-lock behavior. |
| TypeScript | 5.9.2 | UI and core sync contracts | Existing timing and viewport contracts are already typed and tested. |
| Vitest | 2.1.9 | Unit/integration regression tests | Current fullscreen, timeline, and sync-engine tests already run here. |
| @testing-library/react | 16.3.0 | DOM-oriented fullscreen behavior tests | Current fullscreen page regressions are already written with it. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vite | 5.4.21 observed in build (`package.json` uses `^5.4.19`) | Build and test config host | Use for final build gate and jsdom-backed test execution. |
| jsdom | 26.1.0 | DOM environment for fullscreen tests | Use for deterministic scroll/geometry intent tests. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing React state/refs in `fullscreen-lyrics-page.tsx` | A new state-machine library | Unnecessary scope; Phase 19 only needs explicit intent/anchor transitions in one page. |
| Existing row-layout helpers in `src/core/sync/lyric-motion-window.ts` | A new scrolling/layout helper library | Adds new abstractions without solving the app-specific boundary math already modeled by row centers. |
| Focused fullscreen Vitest coverage | Browser e2e suite first | Slower and less surgical; Phase 19 needs deterministic geometry and intent regression tests before broader manual verification in Phase 20. |

**Installation:**
```bash
npm install
```

**Version verification:** Versions above were verified from the workspace on 2026-04-09 via `package.json`, installed test/build output, and successful local commands. This research did not rely on npm-registry lookups because the phase is app-specific and current workspace versions are the planning baseline.

## Architecture Patterns

### Recommended Project Structure
```text
src/
|- web/
|  |- fullscreen-lyrics-page.tsx      # live-lock state, viewport surface, boundary-aware anchor application
|  `- fullscreen-lyrics-page.test.tsx # render/scroll/Back to Live regressions
|- core/
|  `- sync/
|     |- lyric-motion-window.ts       # row layout + anchor helpers
|     |- lyric-timeline.ts            # active/next index contract
|     `- lyric-sync-engine.ts         # drift-safe progress estimation
`- app/
   `- live-sync-runtime.ts            # existing timing propagation; preserve as-is
```

### Pattern 1: Preserve Timing Authority, Fix Viewport Geometry
**What:** Consume `activeIndex`/`nextIndex` from the existing timeline/sync engine and only change how fullscreen converts those indices into an on-screen anchor.
**When to use:** All Phase 19 implementation work.
**Example:**
```typescript
// Source: src/core/sync/lyric-timeline.ts
const indices = getLineIndicesAt(timeline, progressMs);
// activeIndex stays null before the first timestamp.
// nextIndex stays deterministic at 0 before start and null after the last line.
```

### Pattern 2: One Scroll Owner, Separate User Intent from Programmatic Correction
**What:** Keep `viewportSurfaceRef` as the only scrollable surface and gate live-lock transitions on explicit manual scroll, not on programmatic recentering.
**When to use:** Browse-away detection and Back to Live recovery.
**Example:**
```typescript
// Source: src/web/fullscreen-lyrics-page.tsx
if (programmaticScrollRef.current || viewportSurface === null) {
  return;
}

if (viewportSurface.scrollTop > 20 && isLiveLocked) {
  setIsLiveLocked(false);
}
```

### Pattern 3: Boundary-Aware Anchor Math Must Share the Same Row Layout Model
**What:** First-line and last-line visibility fixes should derive from `buildRowLayout(...)` and `getFloatingRowAnchorPx(...)`, not from ad hoc DOM scroll math.
**When to use:** Any fix for VIEW-01/VIEW-02 and Back to Live anchor restoration.
**Example:**
```typescript
// Source: src/web/fullscreen-lyrics-page.tsx
const rowLayout = buildRowLayout(measuredRowHeights, BASE_ROW_GAP_PX);
const anchorPx = getFloatingRowAnchorPx(rowLayout, floatingIndex);
```

### Anti-Patterns to Avoid
- **Recomputing active line from DOM position:** Active/next selection is already owned by `getLineIndicesAt(...)`.
- **Reintroducing document scroll or `window.scrollY`:** Phase 18 explicitly removed that contradictory model.
- **Coupling boundary fixes to drift logic:** Phase 19 should not touch `HARD_DRIFT_SNAP_MS`, bounded soft correction, or playback anchor rules.
- **Using Back to Live as a blind `scrollTop = 0` reset without geometry verification:** That restores state but can still leave the active lyric visually wrong.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active-line selection at start/end | A new "visible line" selector in the UI | `createLyricTimeline(...)` + `getLineIndicesAt(...)` | Existing contracts already define pre-first, exact-boundary, and post-last behavior. |
| Playback realignment after drift | New track-boundary timing heuristics | Existing `createLyricSyncEngine(...)` behavior | Timing is already validated and out of scope for this phase. |
| Scroll ownership | Window/document scroll listeners | `viewportSurfaceRef` and internal scroll events only | Phase 18 established this as the correct ownership boundary. |
| Browse-away recovery | A second live-anchor state model | One boundary-aware live anchor used by auto/live recovery and Back to Live | Two anchor models will recreate Phase 18's contradiction in a different form. |

**Key insight:** The right Phase 19 fix is not "more scroll logic." It is one geometry model that can express start-of-song, in-song, and end-of-song anchors while preserving the existing explicit distinction between programmatic and manual scrolling.

## Common Pitfalls

### Pitfall 1: Fixing First/Last Visibility with Ad Hoc DOM Rect Logic
**What goes wrong:** Boundary rows become visible in one scenario but drift or disagree with normal in-song anchoring.
**Why it happens:** The fix bypasses `rowLayout`/floating-anchor math and invents a second positioning basis.
**How to avoid:** Put boundary padding/clamping into the same anchor calculation used for all live positioning.
**Warning signs:** Source starts reading a row's rect to decide which lyric is active or where live mode "should" be.

### Pitfall 2: Breaking Pre-First or Final-Line Contracts
**What goes wrong:** Intro progress highlights the first line too early, or song end drops the last line instead of keeping it active.
**Why it happens:** UI code treats "no active line yet" or `nextIndex === null` as exceptional instead of intentional contracts.
**How to avoid:** Preserve `activeIndex: null, nextIndex: 0` before start and `activeIndex: last, nextIndex: null` after final timestamp.
**Warning signs:** New fallback branches override timeline output near `0ms` or near the final line.

### Pitfall 3: Treating Any Scroll Event as User Intent
**What goes wrong:** Track changes, row-height remeasurement, or Back to Live smooth scrolling disable live lock again.
**Why it happens:** Scroll events are observed without protecting the programmatic path strongly enough.
**How to avoid:** Keep explicit programmatic suppression and test both manual and programmatic scroll paths.
**Warning signs:** `setIsLiveLocked(false)` can run without a real manual `scrollTop` change initiated in the test.

### Pitfall 4: Restoring Live Lock State Without Restoring Live Geometry
**What goes wrong:** Back to Live hides the button and flips `isLiveLocked` true, but the highlighted lyric remains off target.
**Why it happens:** Recovery only changes boolean state and resets scroll, without recomputing or validating the current live anchor.
**How to avoid:** Make Back to Live reuse the same anchor path as automatic live correction and assert the active lyric is visible afterward.
**Warning signs:** Tests only assert button presence/state and never inspect the lyric viewport result.

### Pitfall 5: Regressing Phase 16 Settle Semantics While Fixing Boundaries
**What goes wrong:** Final handoff bounces, overshoots, or fails to settle exactly on the last line.
**Why it happens:** Boundary math is mixed into transition timing instead of into anchor range/padding.
**How to avoid:** Keep transition timing in `lyric-motion-window.ts` untouched unless a helper extraction is strictly needed.
**Warning signs:** Changes touch `getTransitionProgress`, easing functions, or settle-specific tests without a clear requirement.

## Code Examples

Verified project patterns from current sources:

### Deterministic Boundary Indexing
```typescript
// Source: src/core/sync/lyric-timeline.test.ts
expect(getLineIndicesAt(timeline, 10)).toEqual({ activeIndex: null, nextIndex: 0 });
expect(getLineIndicesAt(timeline, 20_000)).toEqual({ activeIndex: 1, nextIndex: null });
```

### Programmatic Scroll Must Not Toggle Live Lock
```typescript
// Source: src/web/fullscreen-lyrics-page.tsx
programmaticScrollRef.current = true;
viewportSurface.scrollTo({ top: 0, behavior });
window.setTimeout(() => {
  programmaticScrollRef.current = false;
}, behavior === "smooth" ? 350 : 80);
```

### Final-Line Persistence Is Already a Core Contract
```typescript
// Source: src/core/sync/lyric-sync-engine.test.ts
expect(engine.estimateFrame()).toMatchObject({
  activeLineIndex: 2,
  nextLineIndex: null,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mixed `translateY` centering with browser document scroll correction | Viewport-owned internal scroll surface plus transform-driven lyric track | Phase 18, verified 2026-04-09 | Phase 19 must extend this model, not replace it. |
| Snap-to-index motion from earlier fullscreen behavior | Hold/transition/settle motion through row-layout anchors | Phases 15-16 | Boundary fixes must preserve settle and easing contracts. |
| Treating track boundary behavior as general scroll drift | Track boundary behavior isolated as remaining viewport geometry bug | v1.5 roadmap/Phase 18 completion | Planning should target geometry + intent, not timing engine changes. |

**Deprecated/outdated:**
- `window.scrollY`-based live anchoring: removed in Phase 18 and must not return.
- Large natural document scroll surface for fullscreen live mode: removed in Phase 18 and must stay removed.

## Open Questions

1. **Should the live anchor remain strict visual center or use a "safe band" near center at boundaries?**
   - What we know: Requirements only say "inside the visible fullscreen viewport," but prior fullscreen behavior aims at a centered active lyric.
   - What's unclear: Whether planners should require exact center restoration for first/last lines or only guaranteed visibility.
   - Recommendation: Plan for the existing intended center anchor first; only introduce boundary clamping if exact center is impossible without breaking current motion semantics.

2. **Should boundary padding/clamping live in `fullscreen-lyrics-page.tsx` or be extracted into `lyric-motion-window.ts`?**
   - What we know: Current reusable helpers own row centers and floating anchors, while viewport height and scroll surface ownership are UI concerns.
   - What's unclear: Whether extraction meaningfully improves reuse in this codebase.
   - Recommendation: Keep viewport-specific boundary math local to the fullscreen page unless the helper becomes pure and obviously reusable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + Testing Library React 16.3.0 |
| Config file | `vite.config.ts` |
| Quick run command | `npm run test -- src/web/fullscreen-lyrics-page.test.tsx` |
| Full suite command | `npm run test && npm run build` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIEW-01 | First active lyric after track start/transition is visible inside fullscreen viewport | fullscreen integration/render | `npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes |
| VIEW-02 | Last active lyric and final handoff remain visible near song end | fullscreen integration/render | `npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes |
| LIVE-02 | Manual browse-away disables live lock, but programmatic recentering does not | fullscreen interaction | `npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes |
| LIVE-03 | Back to Live restores live lock and correct live anchor | fullscreen interaction | `npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes |

### Sampling Rate
- **Per task commit:** `npm run test -- src/web/fullscreen-lyrics-page.test.tsx`
- **Per wave merge:** `npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts`
- **Phase gate:** `npm run test && npm run build`

### Wave 0 Gaps
- None in framework or file structure. The existing test harness is sufficient.
- Planner should still require a small geometry/assertion harness inside `src/web/fullscreen-lyrics-page.test.tsx` because current tests prove transform contracts but do not yet prove on-screen boundary visibility.
- Planner should require explicit manual-scroll simulation (`scrollTop` mutation + `fireEvent.scroll`) for `LIVE-02` and button-driven recovery assertions for `LIVE-03`.

## Sources

### Primary (HIGH confidence)
- Local planning docs: `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/PROJECT.md`
- Phase 18 artifacts: `.planning/phases/18-viewport-anchor-ownership-and-scroll-surface/18-CONTEXT.md`, `.planning/phases/18-viewport-anchor-ownership-and-scroll-surface/18-VERIFICATION.md`, `.planning/phases/18-viewport-anchor-ownership-and-scroll-surface/18-VALIDATION.md`
- Fullscreen implementation: `src/web/fullscreen-lyrics-page.tsx`
- Fullscreen regressions: `src/web/fullscreen-lyrics-page.test.tsx`
- Timing/index contracts: `src/core/sync/lyric-timeline.ts`, `src/core/sync/lyric-timeline.test.ts`, `src/core/sync/lyric-sync-engine.ts`, `src/core/sync/lyric-sync-engine.test.ts`
- Motion/settle context: `src/core/sync/lyric-motion-window.ts`, `.planning/phases/16-smooth-transition-execution-and-settling/16-02-SUMMARY.md`, `.planning/phases/16-smooth-transition-execution-and-settling/16-03-PLAN.md`

### Secondary (MEDIUM confidence)
- Inference from current fullscreen CSS geometry: the absolute centered stage plus track-level `translateY(-rowAnchor)` can leave first/last rows outside the viewport when total track height exceeds viewport height. This is strongly suggested by the current structure but is not yet directly asserted in automated tests.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified from workspace `package.json`, installed dependencies, and successful local test/build commands.
- Architecture: HIGH - driven by current code ownership boundaries and Phase 18 completion artifacts.
- Pitfalls: HIGH - derived from existing contracts plus direct inspection of the fullscreen component and current regression gaps.

**Research date:** 2026-04-09
**Valid until:** 2026-05-09
