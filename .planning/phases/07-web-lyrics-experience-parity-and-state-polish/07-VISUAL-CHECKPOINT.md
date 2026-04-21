## Automated Commands

Run from repository root:

```bash
npm test -- src/app/live-lyrics-presenter.test.ts src/ui/lyrics/live-lyrics-panel.test.tsx
npm test -- src/web/app-shell.test.tsx
npm test -- src/web/visual-system.test.tsx
npm run build
```

Expected:
- All test commands pass with zero failures.
- Build completes successfully.

## Manual Visual Checks

Start dev server with `npm run dev`, then validate both light and dark themes.

1. Idle baseline
   - Ensure lyrics pane shows now-playing fallback (`No active track`, `Spotify`).
   - Confirm one inline `lyrics-status-rail` location below metadata.
   - Confirm empty-state copy appears without shifting pane/card layout.

2. Reconnecting transition
   - Trigger reconnecting state from an active or recent playback session.
   - Confirm status rail updates to reconnecting copy while remaining in same position.
   - Confirm lyrics pane card hierarchy and spacing do not jump.

3. Paused transition
   - Pause Spotify playback while lyrics pane is visible.
   - Confirm paused state message appears in the same rail location.
   - Confirm now-playing metadata remains visible and stable.

4. Not-found transition
   - Trigger not-found state (or test fixture path) for current track.
   - Confirm warning rail styling and not-found container render together.
   - Confirm retry control (when available) appears inside not-found container.

5. Theme consistency
   - Repeat checks 1-4 in both themes.
   - Confirm rail/empty/not-found text remains readable and card layout remains stable.

## Requirement Traceability

| Requirement | Evidence Files | Automated Proof | Manual Proof |
|-------------|----------------|-----------------|--------------|
| WEB-03 | `src/ui/lyrics/live-lyrics-panel.tsx`, `src/web/app-shell.tsx`, `src/web/app-shell.test.tsx` | `npm test -- src/app/live-lyrics-presenter.test.ts src/ui/lyrics/live-lyrics-panel.test.tsx`, `npm test -- src/web/app-shell.test.tsx` | Idle + paused checks confirm now-playing metadata and panel state parity in shell |
| UI-04 | `src/web/app-shell.tsx`, `src/web/app-shell.test.tsx`, `src/web/visual-system.test.tsx` | `npm test -- src/web/app-shell.test.tsx`, `npm test -- src/web/visual-system.test.tsx`, `npm run build` | Reconnecting + not-found checks confirm cohesive state treatment and stable status-rail placement |
