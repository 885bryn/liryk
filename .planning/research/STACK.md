# Stack Research

**Domain:** Toggleable developer activity panel overlay — browser-based Spotify lyrics app (v1.6)
**Researched:** 2026-04-17
**Confidence:** HIGH

## Context

This is an additive milestone on an existing React 18 + TypeScript + Vite + Tailwind CSS stack. The project already uses:

- `react@^18.3.1`, `react-dom@^18.3.1`
- `@base-ui/react@^1.3.0` (headless components — Dialog, Popover)
- `tailwindcss@^3.4.17` + `tailwind-merge@^3.1.x`, `clsx@^2.1.1`
- `lucide-react@^0.577.0` (icons)
- `vitest@^2.1.9` (test runner)

The codebase already has a module-level pub/sub pattern in `shared-playback-runtime.ts` (a hand-rolled `Map<subscriberId, { listener }>` dispatch). The goal is to decide: extend that pattern, add `mitt`, or build something purpose-fit for the dev panel.

---

## Recommended Stack

### Core Technologies (no new installs required)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React `useState` + `useReducer` | 18.3.x (existing) | Dev panel open/close state + bounded event log buffer | No new deps; suits a bounded circular log with a reducer action |
| Tailwind CSS | 3.4.x (existing) | Panel overlay styling | Matches existing visual system; `fixed inset-0 pointer-events-none` + child `pointer-events-auto` pattern is idiomatic |
| `@base-ui/react` Dialog or Popover | 1.3.x+ (existing) | Optional: accessible toggle container with focus management | Already installed; Dialog handles Escape-key dismiss and focus trap; use only if a11y trap is needed |
| lucide-react | 0.577.x (existing) | Toggle button icon (e.g., `Activity`, `Terminal`) | Already installed |
| `clsx` + `tailwind-merge` | existing | Conditional class composition for panel visible/hidden states | Already installed |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `mitt` | 3.0.1 | Typed global event bus for emitting dev-log events from any module (outside React tree) | Use if events originate in non-React modules (e.g., `shared-playback-runtime`, `lyrics-resolver`). Zero deps, 200 bytes gzipped, ships its own TypeScript types |

### Development Tools (no changes)

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | Unit tests for event bus and panel state reducer | Existing; no new test infra needed |

---

## Installation

```bash
# Only needed if using mitt:
npm install mitt
```

No other new dependencies are needed for this milestone.

---

## Architecture Recommendation: Zero-Dep vs mitt

**Decision: Add `mitt` as the event bus.**

Rationale:

The existing hand-rolled pub/sub in `shared-playback-runtime.ts` is subscriber-ID keyed and designed for playback consumers. Reusing it for the dev panel would couple unrelated concerns. `mitt` provides:

- A typed `Emitter<Events>` singleton that any module can import and `.emit()` on
- A `"*"` wildcard listener so the panel can capture all events in one subscription
- 200 bytes added to the bundle — effectively free

The alternative (hand-roll a second pub/sub) produces the same surface with more code and no tests. `mitt` is the clear choice.

**React state for the log buffer:**

Use `useReducer` in the panel component with an action `{ type: "append", entry: DevLogEntry }` that keeps the last N entries (e.g., 200). This is a circular buffer approximation — slice the newest tail on append. No external state library needed.

**Panel overlay:**

Use a `fixed` + `pointer-events-none` wrapper at the root level of `fullscreen-lyrics-page.tsx`. The panel itself gets `pointer-events-auto`. This avoids interference with lyric touch/scroll events when the panel is closed.

Do NOT use `@base-ui/react` Dialog for this panel. Dialog adds a focus trap and backdrop — inappropriate for a non-modal debug overlay that should coexist with the lyrics page. A plain `div` with `aria-hidden` (when closed) is correct.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `mitt` singleton | Hand-rolled module-level pub/sub | Same result, more code, not battle-tested |
| `mitt` singleton | `EventTarget` / `CustomEvent` | Works but no TypeScript generics for event payload types; harder to test |
| `useReducer` circular buffer | External state (Zustand, Jotai) | Massive overkill; panel log is local UI state only |
| Plain `div` overlay | `@base-ui/react` Dialog | Dialog is modal with focus trap — wrong semantics for a non-blocking debug panel |
| Plain `div` overlay | Radix UI / react-aria | Not in the project; no reason to add |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `redux` / Zustand / Jotai | Panel state is strictly local; global state management is not needed | `useReducer` inside panel component |
| `react-window` / virtualization | Log list stays bounded at 200 items — no virtualization needed at this scale | Bounded `Array.slice(-200)` in reducer |
| `loglevel` / `debug` npm packages | They route to `console.*`, not to an in-app UI component | `mitt` + custom `DevLogEntry` type |
| `@base-ui/react` Dialog | Modal semantics (focus trap, backdrop) are wrong for non-blocking overlay | Plain `div` with conditional rendering |
| Heavy animation library (Framer Motion, GSAP) | Panel open/close is a simple opacity/transform toggle | Tailwind `transition-opacity` + `transition-transform` CSS utilities |

---

## Stack Patterns

**If events originate inside React components (e.g., hook callbacks):**
- Call `emitter.emit(...)` directly inside effect or event handler
- Because React component lifecycle is synchronous at call sites

**If events originate outside the React tree (e.g., `shared-playback-runtime.ts`, `lyrics-resolver.ts`):**
- Import the `mitt` emitter singleton and call `.emit()` from the module function
- Because `mitt` is framework-agnostic and safe to import in plain TS modules

**If the panel grows beyond ~300 lines or needs cross-page visibility:**
- Extract to a dedicated `DevPanel` component in `src/ui/dev/`
- Move emitter singleton to `src/lib/dev-emitter.ts`
- Because the emitter must be importable by both core modules and UI components without circular deps

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `mitt@3.0.1` | React 18, TypeScript 5.x, Vite 5.x | Zero runtime deps; ships CJS + ESM; tree-shakes cleanly in Vite |
| `@base-ui/react@1.4.0` | React 18 | Current published version is 1.4.0; project uses ^1.3.0 which resolves there |

---

## Sources

- [mitt GitHub — developit/mitt](https://github.com/developit/mitt) — version 3.0.1 confirmed, 200b gzipped, full TypeScript generics (HIGH confidence)
- `npm show mitt version` — confirmed 3.0.1 (HIGH confidence)
- `npm show @base-ui/react version` — confirmed 1.4.0 published (HIGH confidence)
- [Base UI Dialog docs](https://base-ui.com/react/components/dialog) — portal, focus management, Escape dismiss confirmed (HIGH confidence)
- [Tailwind CSS z-index docs](https://tailwindcss.com/docs/z-index) — `fixed`, `z-50`, `pointer-events-none` patterns (HIGH confidence)
- Project `package.json` — existing dependency versions verified directly (HIGH confidence)

---
*Stack research for: toggleable dev-panel overlay — liryk v1.6*
*Researched: 2026-04-17*
