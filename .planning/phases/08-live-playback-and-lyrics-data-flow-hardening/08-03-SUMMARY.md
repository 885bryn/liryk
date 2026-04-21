---
phase: 08-live-playback-and-lyrics-data-flow-hardening
plan: "03"
subsystem: web-ui
tags: [app-shell, chinese-normalization, verification, vitest, vite]
requires:
  - phase: 08-live-playback-and-lyrics-data-flow-hardening
    provides: Resolver-level displayText population from 08-02
provides:
  - App shell fallback normalization when resolver lines omit displayText
  - Shell rendering tests guarding against Traditional glyph regressions in active/next line output
  - Phase-local CHN verification checklist covering automated and manual evidence
affects: [lyrics-rendering, qa-runbooks, requirement-traceability]
tech-stack:
  added: []
  patterns: [shell-level fallback normalization, requirement-to-evidence verification artifacts]
key-files:
  created: [.planning/phases/08-live-playback-and-lyrics-data-flow-hardening/08-SIMPLIFIED-CHINESE-VERIFICATION.md]
  modified: [src/web/app-shell.test.tsx, src/web/app-shell.tsx]
key-decisions:
  - Keep shell fallback normalization at line mapping (`displayText ?? normalizeChineseForDisplay(text)`) to protect user-visible output.
patterns-established:
  - "Defense in depth: resolver normalization first, shell fallback second."
requirements-completed: [CHN-01, CHN-02]
duration: 7min
completed: 2026-03-20
---

# Phase 08 Plan 03: Shell Fallback Summary

**Web shell now enforces Simplified Chinese rendering at the final display surface and ships a repeatable CHN verification gate.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-20T23:08:08Z
- **Completed:** 2026-03-20T23:15:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added failing-to-passing app-shell tests that assert Simplified active/next lines and mixed-content preservation.
- Added shell fallback conversion using `line.displayText ?? normalizeChineseForDisplay(line.text)`.
- Published `08-SIMPLIFIED-CHINESE-VERIFICATION.md` with exact automated commands and CHN traceability.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add shell tests that fail when Traditional glyphs are rendered** - `676d2e6` (test)
2. **Task 2: Add app-shell fallback normalization and publish Chinese QA checklist** - `8849be8` (feat)

## Files Created/Modified

- `src/web/app-shell.test.tsx` - Adds regression coverage for Simplified rendering plus marker stability assertions.
- `src/web/app-shell.tsx` - Uses `normalizeChineseForDisplay` fallback in shell lyric text mapping.
- `.planning/phases/08-live-playback-and-lyrics-data-flow-hardening/08-SIMPLIFIED-CHINESE-VERIFICATION.md` - Provides automated/manual CHN validation runbook.

## Decisions Made

- Kept shell fallback normalization in addition to resolver normalization so missing upstream `displayText` cannot leak Traditional glyphs to users.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CHN-01 and CHN-02 are now covered from core normalization through final shell rendering.
- Phase 08 has automated and manual verification evidence ready for milestone verification.

## Self-Check: PASSED

- Verified summary file exists.
- Verified task commits `676d2e6` and `8849be8` exist in git history.

---
*Phase: 08-live-playback-and-lyrics-data-flow-hardening*
*Completed: 2026-03-20*
