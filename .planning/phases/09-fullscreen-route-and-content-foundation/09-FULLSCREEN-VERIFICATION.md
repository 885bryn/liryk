## Prerequisites

- Install dependencies with `npm install`.
- Ensure Spotify web auth environment variables are configured for local runs.
- Run commands from repository root.

## Automated Commands

```bash
npm test -- src/main.test.tsx src/web/fullscreen-lyrics-page.test.tsx
npm test -- src/web/app-shell.test.tsx
npm run build
```

Expected result:
- All listed tests pass with zero failures.
- Build completes successfully.

## Manual Browser Checks

1. Fullscreen route and immersive content
   - Start app with `npm run dev` and open `http://localhost:5173/fullscreen`.
   - Confirm no shell header, no connection pane, and no utility card chrome are visible.

2. Centered column layout geometry
   - Confirm lyric content is constrained to a centered column and line text is left-aligned.
   - Verify generous top/bottom breathing room on desktop and mobile widths.

3. Chinese normalization and mixed-content preservation
   - Play a track with Traditional Chinese lyrics.
   - Confirm fullscreen lines display Simplified Chinese text (for example `爱在台北`).
   - Confirm mixed content preserves Latin text, numbers, and punctuation (for example `欢迎光临 ABC 2026!`).

## Requirement Traceability

| Requirement | Automated Evidence | Manual Evidence | Notes |
|-------------|--------------------|-----------------|-------|
| FULL-01 | `npm test -- src/main.test.tsx src/web/fullscreen-lyrics-page.test.tsx` | Verify `/fullscreen` loads immersive-only surface with no shell chrome | Route contracts and fullscreen markers are asserted in tests |
| FULL-02 | `npm test -- src/web/fullscreen-lyrics-page.test.tsx` | Verify centered column, left-aligned lines, and generous vertical spacing | Class-token assertions lock layout wrappers and spacing |
| CHN-03 | `npm test -- src/web/fullscreen-lyrics-page.test.tsx` | Verify Traditional Chinese source displays as Simplified text on fullscreen lines | Fullscreen rendering path asserts `爱在台北` and `欢迎光临 ABC 2026!` |
| CHN-04 | `npm test -- src/web/fullscreen-lyrics-page.test.tsx` | Verify non-Chinese segments remain unchanged in mixed lines | Negative assertions confirm Traditional originals are not shown |
