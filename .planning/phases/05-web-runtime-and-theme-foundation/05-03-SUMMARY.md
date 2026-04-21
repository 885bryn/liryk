---
phase: 05-web-runtime-and-theme-foundation
plan: "03"
subsystem: ui
tags: [theme, localStorage, shadcn-ui, react]
requires:
  - phase: 05-01
    provides: Browser shell scaffold and split-first layout baseline.
  - phase: 05-02
    provides: shadcn primitives used for theme controls and shell cards.
provides:
  - Persistent light/dark theme store synchronized with root `dark` class.
  - Reusable icon theme toggle in header and connected account menu placement.
  - Finalized split-first shell composition with shadcn cards and explicit placeholders.
affects: [phase-06-responsive-layout-and-visual-system, account-surface-controls]
tech-stack:
  added: []
  patterns: [root-class theme synchronization, dual-surface theme control placement]
key-files:
  created:
    - src/web/theme/theme-store.ts
    - src/web/theme/theme-store.test.ts
    - src/web/theme/theme-toggle.tsx
  modified:
    - src/web/app-shell.tsx
    - src/web/app-shell.test.tsx
    - src/ui/connection/account-menu.tsx
    - src/components/ui/card.tsx
key-decisions:
  - "Hydrate theme state before shell rendering and keep all writes through one store contract tied to localStorage key `liryk-theme`."
  - "Expose theme controls both as always-visible header control and connected account dropdown placement using the same toggle component."
patterns-established:
  - "Theme state source of truth lives in `src/web/theme/theme-store.ts` and updates both storage + `document.documentElement` class."
  - "Connected account menus can extend model fields (like theme placement labels) without changing disconnect contract behavior."
requirements-completed: [THEM-01, THEM-02, WEB-01]
duration: 4min
completed: 2026-03-20
---

# Phase 5 Plan 03: Persistent Theme Controls and Final Shell Composition Summary

**Phase 5 now ships persisted light/dark theme behavior with always-visible and connected-menu toggle access inside a shadcn-composed split-first shell.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-20T09:27:09Z
- **Completed:** 2026-03-20T09:31:57Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Implemented `theme-store` with deterministic default mode, persisted hydration, and root class synchronization.
- Added reusable icon toggle component and wired it into both header (always visible) and connected account dropdown placement.
- Migrated shell panes to shadcn Card composition while preserving explicit connection/lyrics placeholders and split-first layout markers.
- Extended shell tests to cover toggle presence, connected placement, and responsive class markers.

## Task Commits

1. **Task 1 (TDD RED): Implement theme persistence store and root class synchronization** - `ccb738f` (test)
2. **Task 1 (TDD GREEN): Implement theme persistence store and root class synchronization** - `a6df287` (feat)
3. **Task 2 (TDD RED): Wire icon theme toggles into header and account menu, finalize split-first shell composition** - `58811c9` (test)
4. **Task 2 (TDD GREEN): Wire icon theme toggles into header and account menu, finalize split-first shell composition** - `7db3454` (feat)

## Files Created/Modified
- `src/web/theme/theme-store.ts` - persisted `light|dark` store with `liryk-theme` key and root class sync.
- `src/web/theme/theme-store.test.ts` - hydration, toggle, localStorage, and class sync tests.
- `src/web/theme/theme-toggle.tsx` - shared icon + switch theme control.
- `src/web/app-shell.tsx` - integrated theme toggles, account dropdown placement, and shadcn Card shell.
- `src/web/app-shell.test.tsx` - verifies pre-connect and connected toggle placement plus layout markers.
- `src/ui/connection/account-menu.tsx` - added optional theme control label field while preserving disconnect behavior.

## Decisions Made
- Used one shared `ThemeToggle` component across header and dropdown placements to avoid behavior drift.
- Kept shell placeholders explicit and always visible while shifting visual composition to shadcn primitives.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Resolved dropdown label context crash in connected menu render**
- **Found during:** Task 2 implementation verification
- **Issue:** `DropdownMenuLabel` required menu-group context and threw at runtime in tests.
- **Fix:** replaced with plain muted label row in dropdown content to preserve menu semantics without context coupling.
- **Files modified:** `src/web/app-shell.tsx`
- **Verification:** `npm test -- src/web/app-shell.test.tsx src/web/theme/theme-store.test.ts` passed.
- **Committed in:** `7db3454`

**2. [Rule 1 - Bug] Updated card title primitive semantics for heading-based shell assertions**
- **Found during:** Task 2 implementation verification
- **Issue:** `CardTitle` rendered as non-heading element, breaking shell heading role expectations.
- **Fix:** changed `CardTitle` base element to `h3` in shadcn card primitive.
- **Files modified:** `src/components/ui/card.tsx`
- **Verification:** shell tests pass with heading role checks.
- **Committed in:** `7db3454`

---

**Total deviations:** 2 auto-fixed (2 bug)
**Impact on plan:** Both fixes were directly required to deliver stable connected-menu theming and preserve shell accessibility assertions.

## Issues Encountered
- No auth gates or manual checkpoints required; all work remained fully automated.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 6 can build on stable theme persistence, dual-surface toggles, and verified shadcn shell composition.

## Self-Check: PASSED

---
*Phase: 05-web-runtime-and-theme-foundation*
*Completed: 2026-03-20*
