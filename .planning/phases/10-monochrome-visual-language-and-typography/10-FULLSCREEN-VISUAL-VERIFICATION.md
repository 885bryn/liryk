## Prerequisites

- Install dependencies with `npm install`.
- Run commands from repository root.
- For browser checks, start the app with `npm run dev`.

## Automated Verification

Run the following commands exactly:

```bash
npm test -- src/web/fullscreen-lyrics-page.test.tsx
npm test -- src/main.test.tsx src/web/fullscreen-lyrics-page.test.tsx
npm run build
```

Expected results:
- All tests pass with zero failures.
- Build completes successfully.

## Manual Browser Verification

1. Open `http://localhost:5173/fullscreen`.
2. Confirm the fullscreen canvas is pure black and text baseline is white.
3. Confirm lyrics are the dominant visual element and no shell/card utility chrome is present.
4. Confirm the active lyric line is largest/brightest.
5. Confirm near lines remain readable with lower emphasis than active.
6. Confirm distant lines remain legible but visually subdued versus near lines.

## Requirement Traceability

| Requirement | Automated Evidence | Manual Evidence | Files |
|-------------|--------------------|-----------------|-------|
| VIS-01 | `npm test -- src/web/fullscreen-lyrics-page.test.tsx`; `npm run build` | Verify `/fullscreen` renders a pure black canvas with white text baseline | `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx` |
| VIS-02 | `npm test -- src/web/fullscreen-lyrics-page.test.tsx`; `npm test -- src/main.test.tsx src/web/fullscreen-lyrics-page.test.tsx` | Verify active line prominence with readable near/distant hierarchy tiers | `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx` |
| VIS-03 | `npm test -- src/web/fullscreen-lyrics-page.test.tsx`; `npm run build` | Verify no shell header, connection pane, cards, buttons, or utility controls in fullscreen view | `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx` |
