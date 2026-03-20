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

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 01-03 can now consume deterministic connection UI states and account display fields for startup rehydrate/disconnect flows.
- No blockers identified.

---
*Phase: 01-spotify-connection-foundation*
*Completed: 2026-03-20*

## Self-Check: PASSED
