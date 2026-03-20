# Requirements: Spotify Live Lyrics Web App

**Defined:** 2026-03-20
**Core Value:** When a Spotify track is playing, the app shows the right lyric line at the right moment with smooth auto-scrolling.
**Current Milestone:** v1.1 Web App Foundation and Theming

## v1.1 Requirements

Requirements for this milestone. Each maps to exactly one roadmap phase.

### Web Foundation

- [x] **WEB-01**: User can open Liryk in a browser and load the primary app shell without desktop runtime dependencies.
- [x] **WEB-02**: User can access the app through a responsive layout that remains usable on both mobile and desktop viewport sizes.
- [ ] **WEB-03**: User can continue to see now-playing metadata and lyrics panel states from the existing core flow in the web shell.

### Theming

- [x] **THEM-01**: User can switch between light and dark themes from an in-app control.
- [x] **THEM-02**: User's selected theme persists across page reloads.
- [x] **THEM-03**: User sees readable contrast and consistent color tokens across both themes for primary lyric and navigation surfaces.

### UI System and Visual Quality

- [x] **UI-02**: User sees milestone UI built with shadcn/ui components in the web app.
- [x] **UI-03**: User sees intentionally polished typography, spacing, and hierarchy rather than scaffold-default styling.
- [ ] **UI-04**: User sees distinct interaction states (loading, empty, and lyrics-not-found) presented with cohesive visual treatment.

## v1.2+ Candidate Requirements

Deferred to future milestones.

### Enhancements

- **DESK-02**: User can access mini-player style compact mode optimized for multitasking.
- **THEM-04**: User can customize accent palette beyond base light/dark themes.
- **SOC-01**: User can share the currently highlighted lyric line with generated artwork.

## Out of Scope

Explicitly excluded for v1.1.

| Feature | Reason |
|---------|--------|
| Native desktop packaging changes | Milestone focus is browser delivery and UI theming |
| Non-Spotify provider support | Migration scope should avoid expanding integration surface |
| Word-level karaoke animation | Not required for initial web migration success |

## Implementation Notes

- shadcn/ui is required for v1.1 UI implementation.
- Install shadcn/ui at the start of implementation, immediately after web scaffold creation and Tailwind base setup in Phase 5.
- Installation checkpoint should run before building milestone-specific UI components.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WEB-01 | Phase 5 | Complete |
| WEB-02 | Phase 6 | Complete |
| WEB-03 | Phase 7 | Pending |
| THEM-01 | Phase 5 | Complete |
| THEM-02 | Phase 5 | Complete |
| THEM-03 | Phase 6 | Complete |
| UI-02 | Phase 5 | Complete |
| UI-03 | Phase 6 | Complete |
| UI-04 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after milestone v1.1 requirements gate*
