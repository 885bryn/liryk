---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
current_plan: 0
status: Defining requirements
stopped_at: Completed 10-01-PLAN.md
last_updated: "2026-03-20T23:58:37.769Z"
last_activity: 2026-03-20
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 6
  completed_plans: 4
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-20)

**Core value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.
**Current focus:** Milestone v1.2 kickoff; defining requirements for immersive fullscreen lyrics mode

## Current Position

Phase: Not started (defining requirements)
Plan: -
Current Plan: 0
Total Plans in Phase: 0
Status: Defining requirements
Last Activity: 2026-03-20

## Accumulated Context

### Decisions

Decisions are logged in `PROJECT.md` Key Decisions table.
Recent decisions affecting current work:

- [Phase 1]: Keep Spotify auth/session and environment-security constraints in the first delivery boundary.
- [Phase 2]: Deliver playback and live sync as one coherent user-visible capability.
- [Phase 3]: Group lyric matching, fallback UX, multilingual rendering, and shadcn/ui milestone UI in one experience phase.
- [Phase 4]: Isolate cache freshness/performance as the final reliability/perf boundary.
- [Phase 01]: Keep auth secrets and token internals in service-private state and expose only lifecycle-safe renderer state.
- [Phase 01]: Use a single env loader with strict required-variable checks to block auth startup on invalid config.
- [Phase 01]: Use a single UI auth store contract that includes user-facing reason, retry eligibility, and account identity fields for deterministic rendering.
- [Phase 01]: Represent connection UI as pure view-model builders so message/state behavior stays testable without renderer coupling.
- [Phase 01-spotify-connection-foundation]: Treat persisted auth tokens as secure-secret-store data only and clear malformed entries eagerly.
- [Phase 01-spotify-connection-foundation]: Use bounded startup refresh retries with visible recoverable status before reconnect fallback.
- [Phase 01-spotify-connection-foundation]: Capture callback token exchange inside runtime wiring so persistence remains outside renderer-facing auth lifecycle state.
- [Phase 03]: Use a canonical resolved lyric line contract across synced and plain-static modes to avoid downstream shape drift.
- [Phase 03]: Score candidates with strict normalized title+artist gates before synced-first tie-break to prevent plausible wrong matches.
- [Phase 03]: Guard lyrics resolution async completions with a session counter so stale requests cannot overwrite new tracks.
- [Phase 03]: Render plain fallback in explicit plain-static mode with no active highlight and per-line direction/display metadata.
- [Phase 04]: Keep freshness policy pure in core and storage logic in infra adapter.
- [Phase 04]: Use shorter TTL windows for not-found cache entries to avoid sticky negative cache results.
- [Phase 04]: Keep cache orchestration in runtime while resolver remains provider source of truth.
- [Phase 04]: Evict invalid cache entries before provider resolve to fail closed on poisoned data.
- [Phase 05]: Use a thin browser composition layer (src/main.tsx + AppShell) without touching existing auth/lyrics model contracts.
- [Phase 05]: Adopt class-based dark mode tokens in global CSS before shadcn work so later primitives inherit stable theme variables.
- [Phase 05]: Keep the generated shadcn component set in-repo and validate with a dedicated checkpoint surface before shell composition.
- [Phase 05]: Bridge shadcn-generated token expectations into existing Tailwind v3 config instead of delaying primitives to a later refactor.
- [Phase 05]: Hydrate theme state before shell rendering and keep all writes through one store contract tied to localStorage key liryk-theme.
- [Phase 05]: Expose theme controls both as always-visible header control and connected account dropdown placement using the same toggle component.
- [Phase 06]: Raise foreground/muted/border contrast in both themes while keeping token names stable for utility compatibility.
- [Phase 06]: Keep one typography family and encode body rhythm defaults in global CSS for consistent shell readability.
- [Phase 06]: Use lg:grid-cols-5 with lyrics col-span-3 and connection col-span-2 to preserve lyrics emphasis on desktop.
- [Phase 06]: Encode shell hierarchy with explicit class markers and test-level assertions for responsive rhythm.
- [Phase 06]: Standardize card ring treatment on ring-border/60 to keep pane boundaries consistent across themes.
- [Phase 06]: Keep a dedicated visual checkpoint document mapping WEB-02, THEM-03, UI-03 to exact files and verification commands.
- [Phase 07]: Kept state rail message sourced from presenter statusLine for one canonical state copy contract.
- [Phase 07]: Mapped panel state rail variants as warning(not-found/unsupported), idle(idle/no-track), and info for all other statuses.
- [Phase 07]: Kept lyrics status rail in one fixed shell location and switched only variant classes for transitions.
- [Phase 07]: Added AppShell lyricsPanelOverride to inject deterministic panel states for shell-level parity tests.
- [Phase 07]: Guarded phase-07 visual parity with marker and token class assertions instead of snapshots.
- [Phase 07]: Published a dedicated 07 visual checkpoint mapping WEB-03 and UI-04 to automated and manual evidence.
- [Phase 07.1]: Treat callback mode as code+state pair or error only to avoid partial-query false positives.
- [Phase 07.1]: Always remove only code/state/error keys after callback completion to preserve unrelated query context.
- [Phase 07.1]: Use a single useWebAuthRuntime hook to own bootstrap and connect navigation side effects outside AppShell rendering.
- [Phase 07.1]: Render connection pane states directly from UiAuthState plus hook phase for explicit checking and authorizing copy.
- [Phase 07.1]: Surface env alignment warning text in the connection pane so localhost misconfiguration is visible during auth verification.
- [Phase 07.1]: Keep a dedicated phase runbook with exact automated commands and manual URL-cleanup checks for reproducible validation.
- [Phase 08]: Kept Chinese display normalization deterministic with explicit per-character mappings and mixed-script preservation.
- [Phase 08]: Normalized Chinese display text at synced/plain line construction boundaries while preserving source text for traceability.
- [Phase 08]: Added shell-level fallback normalization plus a CHN verification runbook to guarantee final user-visible Simplified output.
- [Phase 09]: Kept fullscreen entry as a dedicated router branch while preserving shell fallback for unknown paths.
- [Phase 09]: Locked route exclusivity with marker-based tests so shell and fullscreen never render together.
- [Phase 09]: Reused shared web auth and lyrics runtime boundaries in fullscreen route to avoid state drift from AppShell.
- [Phase 09]: Locked fullscreen geometry and no-shell chrome via explicit wrapper and column class token tests.
- [Phase 09]: Validated Simplified Chinese behavior at fullscreen UI surface with route-level regression tests.
- [Phase 09]: Standardized fullscreen lyric mapping to displayText fallback normalization for active and adjacent lines.
- [Phase 10]: Use explicit bg-black/text-white class tokens on fullscreen root to keep VIS-01 deterministic.
- [Phase 10]: Remove utility label and standalone state rail copy so lyric lines remain dominant in fullscreen mode.

### Roadmap Evolution

- Phase 07.1 inserted after Phase 7: Wire end-to-end web auth flow (connect redirect callback token restore), verify localhost env/redirect alignment, and add a real connection-to-now-playing verification path (URGENT)

### Pending Todos

- None.

### Blockers/Concerns

None currently.

## Session Continuity

Last session: 2026-03-20T23:58:37.767Z
Stopped at: Completed 10-01-PLAN.md
Resume file: None

## Performance Metrics

| Phase | Plan | Duration (s) | Tasks | Files |
|-------|------|--------------|-------|-------|
| 05 | 01 | 475 | 2 | 13 |
| Phase 05 P02 | 328 | 2 tasks | 10 files |
| Phase 05 P03 | 288 | 2 tasks | 8 files |
| Phase 06 P01 | 99 | 2 tasks | 2 files |
| Phase 06 P02 | 187 | 2 tasks | 2 files |
| Phase 06 P03 | 138 | 2 tasks | 4 files |
| Phase 07 P01 | 120 | 2 tasks | 3 files |
| Phase 07 P02 | 120 | 2 tasks | 2 files |
| Phase 07 P03 | 120 | 2 tasks | 2 files |
| Phase 07.1 P01 | 160 | 2 tasks | 4 files |
| Phase 07.1 P02 | 281 | 2 tasks | 4 files |
| Phase 07.1 P03 | 158 | 2 tasks | 4 files |
| Phase 08 P01 | 166 | 2 tasks | 2 files |
| Phase 08 P02 | 123 | 2 tasks | 4 files |
| Phase 08 P03 | 200 | 2 tasks | 3 files |
| Phase 09 P01 | 106 | 2 tasks | 3 files |
| Phase 09 P02 | 118 | 2 tasks | 3 files |
| Phase 09 P03 | 139 | 2 tasks | 3 files |
| Phase 10 P01 | 74 | 2 tasks | 2 files |
