---
phase: 01-spotify-connection-foundation
plan: "02"
subsystem: ui
tags: [spotify, auth-ui, connection-states, retry-flow, vitest]

requires:
  - phase: 01-spotify-connection-foundation
    provides: PKCE auth lifecycle service and validated env boundary from Plan 01
provides:
  - Deterministic UI auth-state contract for connect, success, waiting, and recoverable errors
  - First-run connect/trust messaging with explicit permission summary copy
  - Persistent retry/troubleshooting experience with store-driven actions
affects: [phase-01-plan-03, renderer-auth-ui, playback-readiness]

tech-stack:
  added: []
  patterns: [state-to-view mapping, explicit waiting-state UX, store-dispatched retry actions]

key-files:
  created:
    - src/state/auth/auth-store.ts
    - src/state/auth/auth-store.test.ts
    - src/ui/connection/connect-spotify-card.tsx
    - src/ui/connection/permission-summary.tsx
    - src/ui/connection/connected-status.tsx
    - src/ui/connection/retry-card.tsx
    - src/ui/connection/connect-flow.test.tsx
  modified:
    - src/ui/connection/connect-flow.test.tsx

key-decisions:
  - "Use a single UI auth store contract that includes user-facing reason, retry eligibility, and account identity fields for deterministic rendering."
  - "Represent connection UI as pure view-model builders so message/state behavior stays testable without renderer coupling."

patterns-established:
  - "Connection copy pattern: always show onboarding/trust context before redirect and explicit waiting copy after connect."
  - "Failure recovery pattern: retry card triggers store actions only and escalates to troubleshooting after repeated failures."

requirements-completed: [AUTH-01]

duration: 3 min
completed: 2026-03-20
---

# Phase 1 Plan 2: Connection UX states, trust messaging, and retry/troubleshooting flow Summary

**Spotify connection UX now has explicit first-run guidance, trust/permission copy, success-to-waiting status messaging, and persistent retry/troubleshooting states backed by a deterministic auth UI store contract.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T04:56:30Z
- **Completed:** 2026-03-20T04:59:50Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Built `AuthStore` UI contract with required states: `disconnected`, `authorizing`, `success`, `connected_waiting_playback`, and `recoverable_error`.
- Added first-run connect card copy and plain-language permission summary reassuring read-only Spotify access.
- Added connected success micro-state and exact waiting text: `Connected - play a track on Spotify`.
- Implemented persistent retry card with reason-specific copy, temporary auto-retry status, and repeated-failure troubleshooting path.
- Added automated tests for auth-state contract and end-to-end connection messaging behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build auth UI state store contract** - `985fa77` (feat)
2. **Task 2: Implement first-run connect and trust messaging components** - `880962e` (feat)
3. **Task 3: Implement persistent retry and troubleshooting card** - `c737461` (feat)

## Files Created/Modified
- `src/state/auth/auth-store.ts` - Typed UI auth-store contract, selectors, actions, and service lifecycle mapping.
- `src/state/auth/auth-store.test.ts` - Tests for state contract completeness, exact waiting copy, and error escalation behavior.
- `src/ui/connection/connect-spotify-card.tsx` - First-run connect entry model with onboarding and trust copy.
- `src/ui/connection/permission-summary.tsx` - Plain-language permission and privacy messaging.
- `src/ui/connection/connected-status.tsx` - Success micro-state and connected waiting-state messaging.
- `src/ui/connection/retry-card.tsx` - Persistent retry/troubleshooting card model wired to store callbacks.
- `src/ui/connection/connect-flow.test.tsx` - Connection flow tests including permissions, waiting state, auto-retry, and troubleshooting.

## Decisions Made
- Kept a dedicated UI auth-store contract separate from token/session internals so renderer states remain deterministic and safe.
- Modeled connection UI as pure state-derived models to keep behavior and copy fully testable with lightweight unit tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `gsd-tools` state automation could not parse current STATE template**
- **Found during:** Post-task state update
- **Issue:** `state advance-plan`, `state update-progress`, and `state record-session` returned parse errors because this repository's STATE headings do not match expected parser fields.
- **Fix:** Updated `.planning/STATE.md` manually to reflect Plan 2 completion, progress, metrics rollup, and session continuity.
- **Files modified:** `.planning/STATE.md`
- **Verification:** Reviewed updated state values and persisted changes in metadata commit.
- **Committed in:** `9478549`

**2. [Rule 3 - Blocking] `gsd-tools commit` wrapper misparsed commit message arguments**
- **Found during:** Final metadata commit step
- **Issue:** Wrapper attempted to treat commit message words as pathspecs, preventing required docs commit.
- **Fix:** Performed equivalent manual git metadata commit with the required planning files.
- **Files modified:** `.planning/phases/01-spotify-connection-foundation/01-02-SUMMARY.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`
- **Verification:** Commit `9478549` created successfully with expected files.
- **Committed in:** `9478549`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Execution artifacts were completed successfully; deviations were limited to planning-tooling wrappers and did not affect implemented product behavior.

## Issues Encountered
- `gsd-tools` state and commit helpers were partially incompatible with this repository's current planning-file format; manual updates/commit were used to complete required metadata steps.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 01-03 can now consume deterministic connection UI states and account display fields for startup rehydrate/disconnect flows.
- No blockers identified.

---
*Phase: 01-spotify-connection-foundation*
*Completed: 2026-03-20*

## Self-Check: PASSED
