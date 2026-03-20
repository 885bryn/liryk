# Roadmap: Spotify Live Lyrics Web App

## Overview

This roadmap starts after completed Phase 4 work and initializes milestone v1.1 for web migration and visual quality. It preserves validated lyrics-sync behavior while introducing browser delivery, theme architecture, and polished shadcn/ui-driven UX in dependency order.

## Milestone

- **Milestone:** v1.1 Web App Foundation and Theming
- **Requirements mapped:** 9 of 9
- **First phase number:** 5 (continuing from completed Phase 4)

## Phases

- [x] **Phase 5: Web Runtime and Theme Foundation** - Establish browser app shell, install shadcn/ui at kickoff, and enable persistent light/dark theming.
- [x] **Phase 6: Responsive Layout and Visual System** - Build aesthetically pleasing, responsive composition with robust theme token usage. (completed 2026-03-20)
- [x] **Phase 7: Web Lyrics Experience Parity and State Polish** - Finish user-facing web states and lyrics-panel behavior parity in the new design. (completed 2026-03-20)
- [ ] **Phase 8: Live Playback and Lyrics Data Flow Hardening** - Ensure connected users consistently see active now-playing metadata and resolved live lyrics in the web shell.

## Phase Details

### Phase 5: Web Runtime and Theme Foundation
**Goal**: Users can access a browser-based shell with shadcn/ui initialized and theme switching available from day one.
**Depends on**: Completed Phase 4
**Requirements**: WEB-01, THEM-01, THEM-02, UI-02
**Success Criteria**:
1. User can open the app in browser with the primary shell rendering without desktop-only runtime assumptions.
2. User can toggle between light and dark mode from visible in-app controls.
3. User returns to the previously selected theme after page reload.
4. User-visible UI primitives are built from shadcn/ui components after explicit install checkpoint.

Implementation notes:
- Install shadcn/ui immediately after web scaffold and Tailwind setup, before milestone UI composition.
- Confirm baseline shadcn tokens and component registry before proceeding to Phase 6.

**Plans:** 3 plans

Plans:
- [x] 05-01-PLAN.md - Scaffold browser runtime entry and baseline split-first shell with Tailwind foundation.
- [x] 05-02-PLAN.md - Initialize shadcn/ui and verify required primitive checkpoint artifacts.
- [x] 05-03-PLAN.md - Implement persistent light/dark theming and integrate toggles into shell/account surfaces.

### Phase 6: Responsive Layout and Visual System
**Goal**: Users get an aesthetically pleasing, intentional interface that works across desktop and mobile.
**Depends on**: Phase 5
**Requirements**: WEB-02, THEM-03, UI-03
**Success Criteria**:
1. User can use the app comfortably on mobile and desktop with stable responsive layout behavior.
2. User sees cohesive typography and spacing hierarchy that goes beyond default scaffold styling.
3. User sees consistent color-token usage and readable contrast in both light and dark themes.

**Plans:** 3/3 plans complete

Plans:
- [x] 06-01-PLAN.md - Refine global theme tokens and typography baseline for readable light/dark surfaces.
- [x] 06-02-PLAN.md - Implement responsive shell rhythm (lyrics-first mobile, 40/60 desktop) with hierarchy-focused tests.
- [x] 06-03-PLAN.md - Finalize card surface consistency and add explicit visual verification checkpoint artifacts.

### Phase 7: Web Lyrics Experience Parity and State Polish
**Goal**: Users get polished web-state handling and lyrics-pane parity with the existing milestone core behavior.
**Depends on**: Phase 6
**Requirements**: WEB-03, UI-04
**Success Criteria**:
1. User can see now-playing metadata and lyrics panel states in the web shell aligned with existing core behavior.
2. User sees cohesive loading, empty, and lyrics-not-found states that match the milestone visual direction.
3. User can transition between key app states without jarring visual regressions across themes.

**Plans:** 3/3 plans complete

Plans:
- [x] 07-01-PLAN.md - Define parity-ready lyrics panel metadata and state-rail contract with model tests.
- [x] 07-02-PLAN.md - Integrate state-driven lyrics parity rendering into web shell with explicit state coverage tests.
- [x] 07-03-PLAN.md - Add visual regression guards and a reproducible Phase 7 visual checkpoint artifact.

### Phase 8: Live Playback and Lyrics Data Flow Hardening
**Goal**: Connected users reliably see active now-playing track data and lyric lines (or explicit not-found state) while playback is running.
**Depends on**: Phase 07.1
**Requirements**: WEB-04, LYR-WEB-01, LYR-WEB-02
**Success Criteria**:
1. User with active Spotify playback sees now-playing track metadata populate in the lyrics pane instead of persistent idle/no-track state.
2. User sees lyrics resolve from real track metadata, including remaster-title variants, with explicit fallback if lyrics are unavailable.
3. User sees active/next lyric rendering update during playback with stable status messaging.

**Plans:** 3 plans

Plans:
- [ ] 08-01-PLAN.md - Harden now-playing contract parsing and shell metadata visibility checks.
- [ ] 08-02-PLAN.md - Wire resilient lyrics-resolution metadata mapping with remaster-variant fallback coverage.
- [ ] 08-03-PLAN.md - Lock active/next lyric progression behavior and publish phase live playback verification artifact.

## Progress

**Execution Order:**
Phases execute in numeric order: 5 -> 6 -> 7 -> 07.1 -> 8

| Phase | Requirements | Status |
|-------|--------------|--------|
| 5. Web Runtime and Theme Foundation | WEB-01, THEM-01, THEM-02, UI-02 | Complete |
| 6. Responsive Layout and Visual System | 3/3 | Complete |
| 7. Web Lyrics Experience Parity and State Polish | WEB-03, UI-04 | Complete |
| 8. Live Playback and Lyrics Data Flow Hardening | WEB-04, LYR-WEB-01, LYR-WEB-02 | Not started |

### Phase 07.1: Wire end-to-end web auth flow (connect redirect callback token restore), verify localhost env/redirect alignment, and add a real connection-to-now-playing verification path (INSERTED)

**Goal:** Users can complete Spotify connect/callback/session-restore fully in the web shell and reliably verify localhost auth setup from connect through now-playing readiness.
**Requirements**: AUTH-WEB-01, AUTH-WEB-02, AUTH-WEB-03
**Depends on:** Phase 7
**Plans:** 3/3 plans complete

Plans:
- [x] 07.1-01-PLAN.md - Define callback and localhost env-alignment contracts with replay-safe URL cleanup tests.
- [x] 07.1-02-PLAN.md - Wire runtime auth flow into the shell with explicit checking, authorizing, reconnect, and connected states.
- [x] 07.1-03-PLAN.md - Add local verification-path integration checks and a reproducible auth verification runbook.
