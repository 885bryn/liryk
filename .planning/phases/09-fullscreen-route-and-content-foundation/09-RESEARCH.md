# Phase 09 Research: Fullscreen Route and Content Foundation

**Date:** 2026-03-20
**Status:** Complete
**Scope:** FULL-01, FULL-02, CHN-03, CHN-04

## Inputs Reviewed

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/07-web-lyrics-experience-parity-and-state-polish/07-02-SUMMARY.md`
- `.planning/phases/07-web-lyrics-experience-parity-and-state-polish/07-03-SUMMARY.md`
- `.planning/phases/08-live-playback-and-lyrics-data-flow-hardening/08-03-SUMMARY.md`
- `src/main.tsx`
- `src/web/app-shell.tsx`
- `src/web/app-shell.test.tsx`
- `src/ui/lyrics/lyrics-viewport.tsx`
- `src/core/lyrics/unicode-normalization.ts`

## Discovery Level

**Level 0 (no external discovery required)**

Reasoning:
- Scope is route/layout composition and existing lyric normalization behavior.
- Existing stack already supports required implementation (React + Vite + Vitest).
- No new external API or service integration is required.

## Current Behavior Snapshot

1. App boot always renders `AppShell` from `src/main.tsx` with no path-based routing.
2. `AppShell` includes utility shell chrome (header, theme toggle, connection panel) that conflicts with fullscreen immersion goals.
3. Current shell layout is split-grid (`lg:grid-cols-5`) and not a single centered lyric column.
4. Chinese display normalization already exists in resolver and shell fallback (`displayText ?? normalizeChineseForDisplay(text)`).

## Recommended Implementation Approach

### 1) Add explicit web route composition for fullscreen entry

- Introduce a small route switch at app entry using `window.location.pathname` with no new router dependency.
- Keep `/` mapped to existing `AppShell` and add `/fullscreen` mapped to new fullscreen page component.
- Add deterministic tests for both route outputs to lock FULL-01 behavior.

### 2) Implement dedicated fullscreen lyrics page with centered text column

- Build a focused fullscreen surface with only lyrics-first content (no connection pane, no utility shell header).
- Use centered container width constraints and left-aligned lyric text with large top/bottom spacing.
- Reuse existing panel/view-model boundaries instead of re-implementing lyrics state primitives.

### 3) Preserve CHN normalization guarantees at fullscreen render boundary

- Route fullscreen lyric line display through existing `displayText` contract with fallback `normalizeChineseForDisplay(text)`.
- Add explicit mixed-content tests to ensure Chinese script normalization and non-Chinese preservation in fullscreen mode.

## Do Not Hand-Roll

- Do not add `react-router` for this phase; route needs are limited and can be handled at entry without new dependency overhead.
- Do not duplicate Chinese conversion logic; use existing `normalizeChineseForDisplay` helper and line `displayText` contract.
- Do not carry utility-shell chrome into fullscreen page.

## Common Pitfalls

- Keeping fullscreen page wrapped by shell cards/grid classes, resulting in non-immersive UI.
- Introducing divergent lyric-line shapes in fullscreen instead of consuming existing contracts.
- Applying Simplified conversion only to active line and leaking Traditional text in adjacent lines.

## Validation Architecture

Validation must prove route-level behavior, fullscreen layout intent, and CHN rendering guarantees:

1. **Route composition tests**
   - `npm test -- src/main.test.tsx`
   - Assert `/` renders shell markers and `/fullscreen` renders fullscreen markers only.

2. **Fullscreen rendering contract tests**
   - `npm test -- src/web/fullscreen-lyrics-page.test.tsx`
   - Assert centered-column classes, left-aligned lyric text classes, and absence of utility-shell chrome markers.

3. **Chinese normalization checks in fullscreen**
   - `npm test -- src/web/fullscreen-lyrics-page.test.tsx`
   - Assert Traditional source renders as Simplified display and mixed-content segments remain unchanged.

4. **Build validity**
   - `npm run build`

5. **Requirement traceability checks**
   - FULL-01: Dedicated fullscreen route renders immersive-only content.
   - FULL-02: Fullscreen layout enforces centered column with left-aligned lyric text and vertical breathing room.
   - CHN-03: Fullscreen renders Simplified Chinese display text.
   - CHN-04: Fullscreen preserves non-Chinese content while normalizing Chinese script.

## Plan Implications

- Split into three execute plans to preserve contract-first flow and keep each plan under 50% context:
  1. route contract + entry wiring,
  2. fullscreen page layout implementation,
  3. fullscreen CHN verification + phase runbook.
