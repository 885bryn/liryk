---
phase: 21-panel-container-toggle-and-ux-shell
plan: "02"
subsystem: web-ui
tags: [dev-panel, toggle, auth-events, integration, testing]
dependency_graph:
  requires: [21-01]
  provides: [fullscreen-dev-panel-integration, auth-event-logging, panel-toggle-ui]
  affects: [src/web/fullscreen-lyrics-page.tsx, src/web/fullscreen-lyrics-page.test.tsx]
tech_stack:
  added: []
  patterns:
    - Prev-ref sentinel pattern for change detection without initial fire
    - scrollIntoView stub in beforeEach for jsdom test environments
    - getAttribute() for aria attribute assertions (vitest, no jest-dom)
key_files:
  created: []
  modified:
    - src/web/fullscreen-lyrics-page.tsx
    - src/web/fullscreen-lyrics-page.test.tsx
decisions:
  - Use sentinel value (undefined) for prevTokenRef/prevStatusRef to skip spurious log entry on mount
  - Place dev panel section before <main> in JSX (sibling, not child) to satisfy DEV-02 DOM placement
  - Stub Element.prototype.scrollIntoView in test beforeEach — jsdom lacks this API
  - Use getAttribute() instead of toHaveAttribute() — @testing-library/jest-dom not installed
metrics:
  duration: "~3 minutes"
  completed_date: "2026-04-18"
  tasks_completed: 2
  files_modified: 2
---

# Phase 21 Plan 02: Panel Integration and Auth Event Wiring Summary

DevActivityPanel and its toggle wired into FullscreenLyricsPage with auth event observation via two change-detecting useEffects, plus 6 new integration tests verifying DOM placement and toggle behavior.

## What Was Built

### Task 1: FullscreenLyricsPage integration
Modified `src/web/fullscreen-lyrics-page.tsx`:
- Added imports: `Terminal` (lucide-react), `DevActivityPanel`, `useDevActivityLog`
- Added `showDevPanel` state (default false) and `useDevActivityLog()` hook
- Added `prevTokenRef` and `prevStatusRef` useRefs initialized to `undefined` sentinel
- Added two auth event useEffects:
  - Token change detector: fires `[AUTH] Token refreshed` on non-null token changes
  - Status change detector: fires `[AUTH] Connected`, `[AUTH] Disconnected`, or `[AUTH] Waiting for playback`
- Added Terminal icon toggle button: `data-testid="fullscreen-dev-panel-toggle"` at `fixed left-4 top-16 z-20 sm:left-6 sm:top-20`
- Added dev panel section: `data-testid="fullscreen-dev-panel"` at `fixed bottom-4 left-4 z-20 w-[240px] h-[30vh]` as sibling of `<main>` (not inside viewportSurfaceRef)

### Task 2: Integration tests
Modified `src/web/fullscreen-lyrics-page.test.tsx`:
- Added `describe("dev panel integration")` block with 6 tests
- Stubbed `Element.prototype.scrollIntoView` in `beforeEach` (jsdom missing implementation)
- Tests cover: initial hidden state, toggle opens panel, aria-expanded reflects state, panel not descendant of viewport surface, panel not descendant of lyrics column, auth Connected event logged on status transition

## Verification Results

- `rtk tsc`: 0 errors in `fullscreen-lyrics-page.tsx` (94 pre-existing errors in other files unchanged)
- `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx`: 45 PASS / 0 FAIL (39 original + 6 new)
- Full suite: 254 PASS / 3 FAIL (3 pre-existing failures in `parseLrc` and `buildPlainLyricsLines`, unchanged from baseline)

## Commits

- `f5e3c95` feat(21-02): wire DevActivityPanel and auth events into FullscreenLyricsPage
- `fa51383` test(21-02): add dev panel integration tests to fullscreen-lyrics-page

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] scrollIntoView not implemented in jsdom**
- **Found during:** Task 2 test run
- **Issue:** `DevActivityPanel` calls `bottomRef.current.scrollIntoView(...)` in its auto-scroll useEffect; jsdom does not implement `scrollIntoView`, causing all panel-open tests to throw `TypeError: bottomRef.current.scrollIntoView is not a function`
- **Fix:** Added `Element.prototype.scrollIntoView = vi.fn()` in a `beforeEach` inside the new describe block
- **Files modified:** `src/web/fullscreen-lyrics-page.test.tsx`
- **Commit:** fa51383

**2. [Rule 1 - Bug] `toHaveAttribute` not available in vitest without jest-dom**
- **Found during:** Task 2 test run (aria-expanded test)
- **Issue:** `toHaveAttribute` is a jest-dom matcher; the test file uses vitest without jest-dom extended matchers, causing `Invalid Chai property: toHaveAttribute`
- **Fix:** Replaced `expect(toggle).toHaveAttribute("aria-expanded", "false")` with `expect(toggle.getAttribute("aria-expanded")).toBe("false")`
- **Files modified:** `src/web/fullscreen-lyrics-page.test.tsx`
- **Commit:** fa51383

## Self-Check: PASSED

- FOUND: src/web/fullscreen-lyrics-page.tsx
- FOUND: src/web/fullscreen-lyrics-page.test.tsx
- FOUND commit: f5e3c95 (Task 1)
- FOUND commit: fa51383 (Task 2)
