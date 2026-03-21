## Prerequisites

- Install dependencies with `npm install`.
- Run commands from repository root.
- For browser checks, run `npm run dev` in a separate terminal.

## Automated Verification

Run the following commands exactly:

```bash
npm test -- src/web/app-shell.test.tsx src/web/fullscreen-lyrics-page.test.tsx src/main.test.tsx
npm test -- src/web/fullscreen-lyrics-page.test.tsx
npm run build
```

Expected results:
- All tests pass with zero failures.
- Build completes successfully.

## Manual Browser Verification

1. Open `http://localhost:5173/`.
2. Confirm a visible `Open Fullscreen Lyrics` control appears in the shell header.
3. Activate `Open Fullscreen Lyrics` and confirm the app navigates to `/fullscreen` without rendering `shell-layout` content.
4. Confirm a visible `Exit Fullscreen Lyrics` control appears at the top of fullscreen content.
5. Activate `Exit Fullscreen Lyrics` and confirm navigation returns to `/` with shell content visible.
6. Start Spotify playback, return to `/fullscreen`, and observe at least 20 seconds.
7. Confirm the active lyric line remains near vertical center while progression updates smoothly.
8. Confirm no jumpy transitions: line state changes remain readable with smooth transform/opacity/color motion.
9. Confirm metadata/progress overlays stay visually secondary (small subdued text) versus lyric tiers.

## Requirement Traceability

| Requirement | Automated Evidence | Manual Evidence | Files |
|-------------|--------------------|-----------------|-------|
| FULL-03 | `npm test -- src/web/app-shell.test.tsx src/web/fullscreen-lyrics-page.test.tsx src/main.test.tsx` | Shell displays `Open Fullscreen Lyrics` and navigates to `/fullscreen` | `src/web/app-shell.tsx`, `src/web/app-shell.test.tsx`, `src/main.test.tsx` |
| FULL-04 | `npm test -- src/web/app-shell.test.tsx src/web/fullscreen-lyrics-page.test.tsx src/main.test.tsx` | Fullscreen displays `Exit Fullscreen Lyrics` and navigates back to `/` | `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx`, `src/main.test.tsx` |
| MOT-01 | `npm test -- src/web/fullscreen-lyrics-page.test.tsx` | Active lyric remains near centered reading position during playback progression | `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx` |
| MOT-02 | `npm test -- src/web/fullscreen-lyrics-page.test.tsx` | Tier transitions remain smooth and readable via transform/opacity/color changes | `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx` |
| MOT-03 | `npm test -- src/web/fullscreen-lyrics-page.test.tsx`; `npm run build` | 20-second playback observation confirms no jumpy motion artifacts | `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx`, `.planning/phases/11-karaoke-motion-and-minimal-overlay-polish/11-KARAOKE-VERIFICATION.md` |
| META-01 | `npm test -- src/web/fullscreen-lyrics-page.test.tsx` | Metadata/progress overlays remain subtle and visually secondary to lyric content | `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx` |
