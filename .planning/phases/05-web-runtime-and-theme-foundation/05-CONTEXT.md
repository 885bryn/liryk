# Phase 5: Web Runtime and Theme Foundation - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a browser-based app shell for Liryk with shadcn/ui initialized at implementation kickoff and day-one light/dark theme switching that persists across reloads. This phase establishes runtime and UI foundation; broader visual-system polish and responsive design depth remain in later phases.

</domain>

<decisions>
## Implementation Decisions

### Shell first impression
- First-load shell uses a split-first experience so users can see connection/status context and lyrics context in one screen.
- Shell framing is a simple header plus two-pane main body on larger screens.
- In disconnected or waiting states, both panes remain visible and the inactive pane shows explicit placeholder/status content.
- On smaller screens, the same shell sections stack vertically instead of staying side-by-side.

### Theme toggle interaction
- Theme switching uses an icon toggle button.
- Primary placement is in the account menu when connected.
- A standalone header toggle remains visible before Spotify connection so theme switching is always available.
- Theme changes apply immediately with a subtle fade transition.

### Shadcn baseline scope
- Phase 5 adopts shadcn/ui across shell surfaces, auth/connection surfaces, and the base lyrics panel container.
- Mandatory primitives by end of phase: Button, Card, Switch, Dropdown.
- Token work in Phase 5 is baseline light/dark wiring; major visual token refinement is deferred to Phase 6.
- Explicit install checkpoint requires both setup documentation and rendered primitive verification in the app shell before feature composition continues.

### Claude's Discretion
- Exact icon set and micro-interaction timing for theme transitions.
- Exact breakpoint values for two-pane to stacked shell behavior.
- Exact wording for placeholder/status copy while preserving explicit-state communication.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance
- `.planning/ROADMAP.md` - Phase 5 goal, dependency boundary, and success criteria.
- `.planning/REQUIREMENTS.md` - WEB-01, THEM-01, THEM-02, UI-02 requirements and shadcn install timing note.
- `.planning/PROJECT.md` - milestone constraints for web delivery, shadcn/ui requirement, and light/dark theming requirement.

### Prior behavior and UX continuity
- `.planning/phases/01-spotify-connection-foundation/01-CONTEXT.md` - connect flow, trust messaging, explicit waiting/recovery status expectations.
- `.planning/phases/02-live-playback-sync-engine/02-CONTEXT.md` - explicit playback-state communication patterns to preserve in shell messaging.
- `.planning/phases/03-lyrics-resolution-and-rendered-experience/03-CONTEXT.md` - milestone UI constraints and source-state visibility expectations for lyrics surfaces.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/ui/connection/connect-spotify-card.tsx`: existing connect card model and trust/onboarding content can map into shadcn Card/Button composition.
- `src/ui/connection/account-menu.tsx`: existing account menu model provides natural home for connected-state theme control.
- `src/ui/lyrics/live-lyrics-panel.tsx`: existing lyrics panel model can be wrapped in the new web shell pane structure.
- `src/app/live-lyrics-presenter.ts`: existing status/source-state view model contract should remain the canonical lyrics panel input in web shell.

### Established Patterns
- Presenter/builder pattern separates runtime state from UI models (`src/app/*presenter*.ts`, `src/ui/*`), so Phase 5 shell should consume models instead of embedding business logic.
- Explicit state messaging is already established across auth/playback/lyrics flows; shell placeholders should continue this pattern.
- TypeScript model-first UI contracts are already test-driven, enabling phase work to add shell/theming behavior with deterministic unit tests.

### Integration Points
- New web shell should compose connection and lyrics surfaces around existing UI model builders in `src/ui/connection/*` and `src/ui/lyrics/*`.
- Theme toggle state and persisted preference will connect to top-level shell/header composition that currently has no web runtime container.
- shadcn primitives should be introduced where current model outputs map to buttons/cards/menus without changing underlying core/runtime contracts.

</code_context>

<specifics>
## Specific Ideas

- Keep first-load experience explanatory and stable: both key panes are visible immediately, with explicit placeholders instead of hidden regions.
- Theme switching should feel accessible before and after connection, with connected-state convenience in account menu.
- Treat shadcn initialization as a visible checkpoint artifact, not just a dependency install step.

</specifics>

<deferred>
## Deferred Ideas

- Deeper visual token/brand customization beyond baseline theme wiring (belongs to Phase 6 visual system work).

</deferred>

---

*Phase: 05-web-runtime-and-theme-foundation*
*Context gathered: 2026-03-20*
