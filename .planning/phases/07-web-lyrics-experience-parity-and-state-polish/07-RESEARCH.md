# Phase 07 Research: Web Lyrics Experience Parity and State Polish

**Date:** 2026-03-20
**Status:** Complete
**Scope:** WEB-03, UI-04

## Inputs Reviewed

- `.planning/phases/07-web-lyrics-experience-parity-and-state-polish/07-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/06-responsive-layout-and-visual-system/06-01-SUMMARY.md`
- `.planning/phases/06-responsive-layout-and-visual-system/06-02-SUMMARY.md`
- `.planning/phases/06-responsive-layout-and-visual-system/06-03-SUMMARY.md`
- `src/app/live-lyrics-presenter.ts`
- `src/ui/lyrics/live-lyrics-panel.tsx`
- `src/ui/lyrics/lyrics-viewport.tsx`
- `src/state/playback/live-sync-store.ts`
- `src/web/app-shell.tsx`
- `src/web/app-shell.test.tsx`

## Discovery Level

**Level 0 (skip deep external discovery)**

Reasoning:
- Work reuses existing React + shadcn + Tailwind stack and existing lyrics/playback contracts.
- No new external API/service integration or dependency selection.
- Scope is parity and state-presentation polish on top of established models.

## Recommended Implementation Approach

### 1) Preserve presenter and builder boundaries while enriching web state projection

- Keep `LiveSyncStore` and `buildLiveLyricsViewModel` as source contracts for lyrics states.
- Add parity-focused fields in presenter/panel models for now-playing metadata and inline state rail content instead of introducing new global store shape.
- Continue using `createLiveLyricsPanelBuilder` as the single builder that resolves effective track transitions and returns render-ready panel data.

### 2) Render state rail and pane states in shell without blank-screen takeovers

- Replace static lyrics placeholder in `src/web/app-shell.tsx` with state-driven lyrics panel composition.
- For reconnecting/loading transitions, keep last visible lyric content mounted and layer a subtle inline status message rail.
- Keep one stable status message position in the lyrics pane so transitions do not shift user scanning targets.

### 3) Wire now-playing metadata and parity states into shell contract tests

- Expand `src/web/app-shell.test.tsx` to assert now-playing title/artist metadata, explicit loading/empty/not-found states, and consistent status rail placement.
- Add deterministic unit tests around presenter/panel model transitions so shell tests consume already-validated models.
- Validate that paused/syncing/reconnecting/not-found transitions preserve expected visibility behavior (lyrics retained for transient states, no hard swap to blank).

### 4) Keep visual language aligned with Phase 6 contracts

- Preserve Phase 6 responsive structure (`lg:grid-cols-5`, `lg:col-span-3` lyrics emphasis) and card/ring styling conventions.
- Reuse token classes and shadcn primitives for rail badges and state messaging.
- Favor quick, soft transitions (short duration, non-blocking) and avoid heavy animation or layout shifts.

## Do Not Hand-Roll

- Do not create a new global playback UI store for web-only state.
- Do not bypass presenter/panel model boundaries by embedding raw state branching directly in JSX.
- Do not introduce a new animation framework; use existing CSS utility transitions.

## Common Pitfalls

- **State flash regressions:** clearing lyrics content on reconnect/loading instead of preserving prior lines.
- **Contract drift:** adding ad hoc shell-only state enums that diverge from `LiveSyncUiState` and presenter outputs.
- **Message scatter:** rendering status copy in multiple places, causing inconsistent scan path.
- **Test blind spots:** relying on visual inspection instead of explicit transition and state assertions.

## Validation Architecture

Validation for this phase should combine focused model tests with shell contract tests:

1. **Build validity**
   - `npm run build` succeeds.

2. **Model and state contract tests**
   - `npm test -- src/app/live-lyrics-presenter.test.ts` passes.
   - `npm test -- src/ui/lyrics/live-lyrics-panel.test.ts` passes.
   - Tests assert:
     - now-playing metadata fields are present in panel model output,
     - reconnecting/syncing transient states preserve visibility expectations,
     - not-found/retry states remain explicit and deterministic.

3. **Shell parity tests**
   - `npm test -- src/web/app-shell.test.tsx` passes.
   - Tests assert:
     - lyrics pane renders state-driven metadata and status rail,
     - loading/empty/not-found states each have distinct, explicit copy,
     - status rail location remains stable across state transitions,
     - desktop/mobile class contracts from Phase 6 remain intact.

4. **Requirement traceability checks**
   - WEB-03: now-playing metadata + lyrics pane parity is rendered in shell and covered by tests.
   - UI-04: loading, empty, and not-found state treatment is distinct, cohesive, and test-asserted.

## Plan Implications

- Use 3 execute plans: contracts/tests first, shell integration second, verification artifact last.
- Keep file ownership mostly isolated per plan to preserve parallel-safe sequencing where possible.
- Include one dedicated visual checkpoint doc for manual transition smoothness verification across themes.
