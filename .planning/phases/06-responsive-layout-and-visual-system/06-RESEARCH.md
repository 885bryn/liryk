# Phase 06 Research: Responsive Layout and Visual System

**Date:** 2026-03-20
**Status:** Complete
**Scope:** WEB-02, THEM-03, UI-03

## Inputs Reviewed

- `.planning/phases/06-responsive-layout-and-visual-system/06-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/05-web-runtime-and-theme-foundation/05-01-SUMMARY.md`
- `.planning/phases/05-web-runtime-and-theme-foundation/05-02-SUMMARY.md`
- `.planning/phases/05-web-runtime-and-theme-foundation/05-03-SUMMARY.md`
- `src/web/app-shell.tsx`
- `src/web/app-shell.test.tsx`
- `src/styles/globals.css`
- `tailwind.config.ts`

## Discovery Level

**Level 0 (skip deep external discovery)**

Reasoning:
- Work extends existing React + Tailwind + shadcn stack already in repository.
- No new external service integration.
- No new dependency selection decision required.

## Recommended Implementation Approach

### 1) Responsive composition first in shell

- Keep shell as thin composition layer (`src/web/app-shell.tsx`) and avoid changes to auth/playback/lyrics domain logic.
- Implement locked layout decisions directly in shell classes:
  - Mobile-first stacked flow with lyrics pane rendered before connection pane.
  - Early tablet stacking (single-column until desktop breakpoint).
  - Desktop split emphasizing lyrics with a 40/60 relationship.
- Preserve always-visible header theme control and connected account menu placement from Phase 05.

### 2) Visual token tuning in global CSS and Tailwind mappings

- Keep class-based dark mode and CSS variable token architecture from Phase 05.
- Refine token pairs for better contrast on primary lyric and navigation surfaces in both themes.
- Ensure token names remain stable (`--background`, `--foreground`, `--card`, `--muted`, `--accent`, etc.) so existing utility classes remain valid.

### 3) Typography + spacing hierarchy with single family

- Keep `IBM Plex Sans` as required by Phase 06 locked decision.
- Introduce moderate hierarchy via explicit title/body classes (no aggressive jump in scale).
- Apply lyric-emphasis by stronger title/line styling and roomier desktop spacing.
- Step spacing down one tier on mobile (`gap`, `padding`, section rhythm).

### 4) Verification-first styling changes

- Expand `src/web/app-shell.test.tsx` to assert concrete responsive and hierarchy classes.
- Add explicit assertions for pane order on mobile markup and desktop split class presence.
- Keep existing tests for shell visibility and theme control behavior.

## Do Not Hand-Roll

- Do not introduce a new CSS framework or design system.
- Do not replace shadcn primitives with custom control primitives.
- Do not add runtime logic to solve visual concerns that belong to CSS/tokens/layout classes.

## Common Pitfalls

- **Breakpoint drift:** using ad hoc breakpoints in many files; keep responsive logic centralized in shell classes.
- **Token bypass:** hardcoded hex colors in component files; use theme tokens to preserve light/dark coherence.
- **Scope creep:** pulling in full lyrics state parity (belongs to Phase 07), instead of visual/system refinement.
- **Over-styling:** violating context direction (moderate hierarchy, calm/readable surfaces).

## Validation Architecture

Validation for this phase should combine static checks and focused unit tests:

1. **Build validity**
   - `npm run build` succeeds.

2. **Shell contract tests**
   - `npm test -- src/web/app-shell.test.tsx` passes.
   - Tests assert:
     - stacked/mobile baseline classes present,
     - desktop split-emphasis classes present,
     - lyrics pane appears before connection pane in stacked flow,
     - typography/spacing class markers are present on heading and pane containers.

3. **Token contract checks**
   - `src/styles/globals.css` contains complete light and dark variable sets.
   - `tailwind.config.ts` still maps utilities to token variables used by shell surfaces.

4. **Requirement traceability checks**
   - WEB-02: responsive layout class markers + tests.
   - THEM-03: token consistency and readable contrast pairs in both themes.
   - UI-03: explicit typography/spacing hierarchy markers in shell/pane composition.

## Plan Implications

- Prefer 2-3 executable plans with no file overlap where possible.
- Sequence token foundation before shell composition if shell classes depend on new semantic utilities.
- Keep verification commands under 60 seconds where practical (`vitest` target file, then full build).
