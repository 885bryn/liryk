---
phase: 01-spotify-connection-foundation
plan: "04"
subsystem: auth-runtime
tags: [spotify, runtime-wiring, oauth, bootstrap, session]

requires:
  - phase: 01-spotify-connection-foundation
    provides: Auth service, UI state models, and bootstrap primitives from plans 01-01 through 01-03
provides:
  - Production auth runtime that wires OAuth connect/callback lifecycle into AuthStore state transitions
  - Concrete Spotify auth client adapter for authorization code exchange and refresh token flows
  - Startup bootstrap integration that rehydrates or refreshes secure persisted sessions before reconnect fallback
affects: [phase-01-verification, phase-02-playback-sync, startup-auth, connect-flow]

tech-stack:
  added: []
  patterns: [runtime orchestrator boundary, secure token-store bootstrap, connect action helper wiring]

key-files:
  created:
    - src/infra/spotify/spotify-auth-client.ts
    - src/app/auth-runtime.ts
    - src/app/auth-runtime.test.ts
  modified:
    - src/ui/connection/connect-spotify-card.tsx
    - src/ui/connection/connect-flow.test.tsx
    - src/app/bootstrap-auth.ts

key-decisions:
  - "Capture token exchange results inside runtime wiring so persistence can remain outside renderer-facing service state."
  - "Run startup session recovery through bootstrapAuth using secure token storage and bounded refresh fallback behavior."

patterns-established:
  - "Connect flow pattern: UI action helpers call runtime connect/callback APIs and emit authorization URL through callback hooks."
  - "Runtime startup pattern: initialize() delegates to bootstrapAuth and only exposes UI-safe/session-safe runtime state."

requirements-completed: [AUTH-01, AUTH-02, SECU-01]

duration: 8 min
completed: 2026-03-20
---

# Phase 1 Plan 4: Spotify runtime wiring for connect and startup bootstrap Summary

**Phase 1 gaps are closed by turning previously isolated auth/session modules into a production runtime path for connect callback handling and restart recovery.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-20T22:24:30Z
- **Completed:** 2026-03-20T22:27:10Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added a concrete Spotify runtime client adapter that builds PKCE authorization URLs and performs code exchange/refresh calls against Spotify token endpoints.
- Added `createAuthRuntime` to assemble `SpotifyAuthService`, `AuthStore`, and secure token persistence into connect/callback/startup orchestration APIs.
- Added runtime tests proving auth-start behavior from runtime APIs plus startup rehydrate/refresh/reconnect fallback scenarios.
- Added connect-flow action helpers and tests that verify UI-level connect/callback transitions now route through runtime wiring instead of isolated model-only logic.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add concrete Spotify auth client adapter and runtime service assembly** - `d4a7b14` (feat)
2. **Task 2: Wire connect action and callback completion through UI-model action helpers** - `cb28b8b` (feat)
3. **Task 3: Invoke startup bootstrap from runtime initialization and secure token store path** - `a7f3a20` (feat)

## Files Created/Modified
- `src/infra/spotify/spotify-auth-client.ts` - Concrete Spotify auth client adapter for authorization start, code exchange, and refresh paths.
- `src/app/auth-runtime.ts` - Runtime coordinator that maps auth lifecycle transitions into store state and persists callback sessions.
- `src/app/auth-runtime.test.ts` - Runtime integration tests for connect-start plus startup bootstrap outcomes.
- `src/ui/connection/connect-spotify-card.tsx` - Connect/callback action helpers that invoke runtime APIs.
- `src/ui/connection/connect-flow.test.tsx` - Runtime-wired connect flow assertions covering authorizing to connected waiting transitions.
- `src/app/bootstrap-auth.ts` - Extended bootstrap dependency passthrough for deterministic runtime startup integration.

## Decisions Made
- Preserved SECU-01 by keeping token persistence operations inside runtime + secure token-store boundaries while exposing only UI-safe lifecycle status to renderer state.
- Kept callback/action integration in a helper near connect-card model builders so existing UI model testing patterns remain consistent.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 1 now has an executable runtime auth connect + restart lifecycle, unblocking Phase 1 goal verification.
- No blockers identified for transition to Phase 2 work.

---
*Phase: 01-spotify-connection-foundation*
*Completed: 2026-03-20*

## Self-Check: PASSED
