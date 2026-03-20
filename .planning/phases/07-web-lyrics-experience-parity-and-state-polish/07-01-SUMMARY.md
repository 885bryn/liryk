---
phase: 07-web-lyrics-experience-parity-and-state-polish
plan: "01"
subsystem: ui
tags: [react, vitest, lyrics, state-model]
requires:
  - phase: 06-responsive-layout-and-visual-system
    provides: Responsive shell structure and theme token baseline for parity integration.
provides:
  - Parity-ready live lyrics panel model fields for now-playing metadata.
  - Deterministic state rail message and variant mapping across playback/lyrics states.
  - Locked tests for metadata and not-found retry semantics.
affects: [07-02-PLAN, web-shell-lyrics-pane, state-rail-rendering]
tech-stack:
  added: []
  patterns:
    - Presenter statusLine reused as single state rail message source.
    - Panel builder computes rail variant from sourceState/status contract.
key-files:
  created:
    - .planning/phases/07-web-lyrics-experience-parity-and-state-polish/07-01-SUMMARY.md
  modified:
    - src/app/live-lyrics-presenter.test.ts
    - src/ui/lyrics/live-lyrics-panel.test.tsx
    - src/ui/lyrics/live-lyrics-panel.tsx
key-decisions:
  - "Kept state rail message sourced directly from presenter statusLine to avoid duplicate wording logic."
  - "Mapped rail variants in panel builder using warning/not-found/unsupported, idle/idle+no-track, and info fallback rules."
patterns-established:
  - "Live lyrics panel contract exposes explicit now-playing metadata fields separate from legacy trackLabel."
  - "Not-found retry affordance remains presenter-owned and explicitly tested for retry-in-flight suppression."
requirements-completed: [WEB-03, UI-04]
duration: 2min
completed: 2026-03-20
---

# Phase 7 Plan 01: Parity Contract Summary

**Live lyrics panel now emits explicit now-playing metadata and deterministic state-rail semantics backed by RED->GREEN contract tests.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T20:28:30Z
- **Completed:** 2026-03-20T20:29:39Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added failing tests that define new panel parity contract keys (`nowPlayingTitle`, `nowPlayingArtist`, `isNowPlayingKnown`, `stateRailMessage`, `stateRailVariant`).
- Preserved explicit not-found retry semantics with coverage for retry-in-flight suppression.
- Implemented panel builder metadata/variant outputs while keeping existing presenter-driven status behavior intact.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing tests for now-playing metadata and unified status-rail contract** - `1362312` (test)
2. **Task 2: Implement panel metadata and state-rail contract in presenter and builder** - `ace5930` (feat)

## Files Created/Modified
- `src/app/live-lyrics-presenter.test.ts` - Added explicit not-found retry-in-flight suppression assertion.
- `src/ui/lyrics/live-lyrics-panel.test.tsx` - Added contract expectations for metadata fields and rail variant/message mapping.
- `src/ui/lyrics/live-lyrics-panel.tsx` - Extended panel model/builder to emit metadata and state rail fields.

## Decisions Made
- Reused presenter `statusLine` as `stateRailMessage` to ensure one canonical user-facing state string contract.
- Computed `stateRailVariant` in the builder from `sourceState`/`status` so shell rendering can stay declarative.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `07-02-PLAN.md` can consume stable panel metadata and rail contract fields for web-shell integration.
- No blockers identified.

---
*Phase: 07-web-lyrics-experience-parity-and-state-polish*
*Completed: 2026-03-20*

## Self-Check: PASSED

- FOUND: `.planning/phases/07-web-lyrics-experience-parity-and-state-polish/07-01-SUMMARY.md`
- FOUND: `1362312`
- FOUND: `ace5930`
