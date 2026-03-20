# Phase 5: Web Runtime and Theme Foundation - Research

**Researched:** 2026-03-20
**Domain:** Browser runtime foundation, shadcn/ui bootstrap, and persistent light/dark theming
**Confidence:** HIGH

<user_constraints>
## Constraints and Locked Decisions

### From roadmap, requirements, and Phase 5 context
- Deliver a browser-based shell with no desktop-only runtime assumptions.
- Install shadcn/ui immediately after web scaffold and Tailwind base setup.
- Phase 5 must include shadcn Button, Card, Switch, and Dropdown primitives in rendered shell surfaces.
- Theme toggle must be available both before Spotify connection (header control) and when connected (account menu placement).
- Theme preference must persist across reloads.
- Split-first shell behavior is required: connection/status pane and lyrics pane visible together on large screens, stacked on small screens.

### Claude's Discretion
- Exact icon library and animation duration for theme transitions.
- Exact breakpoint token for side-by-side to stacked transition.
- Exact placeholder copy while preserving explicit status communication.

### Deferred / Out of Scope
- Major visual token tuning and brand polish (Phase 6).
- Additional theme variants beyond light/dark.
- New provider integrations or core sync algorithm changes.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WEB-01 | User can open app in browser and load primary shell without desktop runtime dependencies | Add Vite + React web entry, browser-safe bootstrap, and shell smoke tests |
| THEM-01 | User can switch between light and dark themes from in-app control | Add shared theme store/provider and visible toggles in header/account surfaces |
| THEM-02 | User-selected theme persists across reloads | Persist selected mode in localStorage with startup hydration and fallback |
| UI-02 | User-visible milestone UI uses shadcn/ui components | Install shadcn at kickoff and verify primitives are rendered in shell checkpoint |
</phase_requirements>

## Summary

Phase 5 should create a thin web composition layer around existing domain modules instead of rewriting core playback/lyrics/auth logic. The safest path is to establish a Vite React entrypoint, wire Tailwind + CSS-variable theme tokens, install shadcn/ui immediately, and then compose the split shell with explicit placeholder states from existing presenter models.

To satisfy UI-02 reliably, treat shadcn initialization as an artifact checkpoint: include setup files (`components.json`, Tailwind content paths, utility helper) and a rendered primitive check surface before milestone composition continues.

**Primary recommendation:** Execute in three plans: (1) web runtime scaffold + theme CSS baseline, (2) shadcn initialization + primitive checkpoint, (3) persistent theme state + shell composition with always-visible toggle controls.

## Standard Stack

### Core
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| React + Vite | Browser runtime entry and shell rendering | Minimal migration path for current TS modules |
| Tailwind CSS | Utility styling and shadcn prerequisites | Required by shadcn/ui defaults |
| shadcn/ui | Required milestone component system | Explicit project requirement |
| Vitest + jsdom | Browser component/model test coverage | Existing test stack in repository |

### Supporting
| Module | Purpose | When to Use |
|--------|---------|-------------|
| `src/ui/connection/*` | Existing connection/account model builders | Compose shell panes without changing core auth logic |
| `src/ui/lyrics/live-lyrics-panel.tsx` | Existing lyrics panel model boundary | Reuse in web shell with shadcn container wrappers |
| `src/app/live-lyrics-presenter.ts` | Explicit playback/lyrics status mapping | Preserve deterministic status messaging in placeholders |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vite React scaffold | Next.js app router | Adds routing/runtime complexity not required for Phase 5 goal |
| localStorage persistence | Cookie or server persistence | Adds unnecessary backend coupling for a single preference |
| class-based dark mode | media-query-only dark mode | Removes explicit user-controlled persistence required by THEM-02 |

## Architecture Patterns

### Pattern 1: Browser Bootstrap Boundary
**What:** New `src/main.tsx` and shell entry compose existing domain/view-model builders without importing desktop-specific APIs.
**Why:** Satisfies WEB-01 while preserving validated core behavior.

### Pattern 2: Theme State at App Root
**What:** Root-level theme store/provider hydrates from localStorage and toggles `document.documentElement` class.
**Why:** Guarantees immediate theme application and persisted preference across reloads.

### Pattern 3: shadcn Initialization Checkpoint
**What:** Configure shadcn baseline files and render required primitives in shell checkpoint view before feature composition.
**Why:** Prevents mixed component patterns and ensures UI-02 is verifiable.

### Pattern 4: Split-First Responsive Shell
**What:** Header plus two-pane main layout on large screens and stacked panes on smaller screens, with explicit placeholder content in inactive states.
**Why:** Honors locked UX decision for first-load clarity and state transparency.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme toggles | Custom ad hoc switch widget | shadcn `Switch`/`DropdownMenu` controls | Keeps UI-02 consistent and reusable |
| Component tokens | Manual hardcoded color classes only | Tailwind tokens + CSS variables used by shadcn | Enables consistent light/dark behavior |
| Connection status copy | New duplicate state machine | Existing presenter/model state mapping | Avoids drift from validated lifecycle messaging |

## Common Pitfalls

### Pitfall 1: Delayed shadcn setup
**What goes wrong:** Initial UI built with non-shadcn elements then refactored later.
**How to avoid:** Require primitive checkpoint artifact before shell composition tasks.

### Pitfall 2: Theme flash on load
**What goes wrong:** App renders light then flips to dark after hydration.
**How to avoid:** Apply persisted theme class during startup before rendering shell.

### Pitfall 3: Hidden inactive pane states
**What goes wrong:** Users lose context when disconnected/waiting states hide one pane.
**How to avoid:** Always render both panes with explicit placeholder/status content.

## Validation Architecture

- **Runtime layer:** Smoke tests prove browser shell renders without desktop-only assumptions.
- **Theme layer:** Unit/component tests verify toggle behavior, root class mutation, and localStorage persistence.
- **UI system layer:** Checkpoint tests verify required shadcn primitives render in shell surfaces.
- **Phase quick check:** One targeted `npm test -- ...` command over Phase 5 test files under ~45 seconds.

## Sources

### Primary
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/05-web-runtime-and-theme-foundation/05-CONTEXT.md`
- `src/ui/connection/connect-spotify-card.tsx`
- `src/ui/connection/account-menu.tsx`
- `src/ui/lyrics/live-lyrics-panel.tsx`
- `src/app/live-lyrics-presenter.ts`

### Secondary
- `.planning/research/STACK.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`

## Metadata

**Confidence breakdown:**
- Browser runtime scaffold path: HIGH
- shadcn setup/checkpoint strategy: HIGH
- Theme persistence implementation details: HIGH
- Final shell visual details and exact copy: MEDIUM
