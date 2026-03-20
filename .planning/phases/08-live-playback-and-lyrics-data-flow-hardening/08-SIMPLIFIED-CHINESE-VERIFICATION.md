## Prerequisites

- Install dependencies with `npm install`.
- Ensure web auth and Spotify environment variables are configured for local runs.
- Run commands from repository root.

## Automated Commands

```bash
npm test -- src/core/lyrics/unicode-normalization.test.ts src/core/lyrics/lyrics-resolver.test.ts src/web/app-shell.test.tsx
npm run build
```

Expected result:
- All tests pass with zero failures.
- Build completes successfully.

## Manual Browser Checks

1. Synced line Simplified rendering
   - Start app with `npm run dev`, connect Spotify, and play a track with Traditional Chinese synced lyrics.
   - Confirm active and next lines display Simplified Chinese glyphs (for example `爱在台北`, not `愛在臺北`).

2. Plain line Simplified rendering
   - Use a track/source path that resolves to plain lyrics.
   - Confirm plain lines still display Simplified Chinese glyphs.

3. Mixed-content preservation
   - Verify a mixed line containing Chinese plus non-Chinese text (for example `ABC 2026!`) keeps non-Chinese content unchanged.
   - Confirm punctuation and emoji remain unchanged while Chinese glyphs are normalized.

## Requirement Traceability

| Requirement | Automated Evidence | Manual Evidence | Notes |
|-------------|--------------------|-----------------|-------|
| CHN-01 | `npm test -- src/core/lyrics/unicode-normalization.test.ts src/core/lyrics/lyrics-resolver.test.ts src/web/app-shell.test.tsx` | Synced and plain checks confirm user-visible Simplified Chinese output | Resolver and shell fallback both covered |
| CHN-02 | `npm test -- src/core/lyrics/unicode-normalization.test.ts src/core/lyrics/lyrics-resolver.test.ts src/web/app-shell.test.tsx` | Mixed-content check confirms non-Chinese content remains unchanged | Includes latin text, numbers, punctuation, emoji preservation |
