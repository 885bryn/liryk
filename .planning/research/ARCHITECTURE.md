# Architecture Research

**Domain:** Desktop-to-web milestone architecture alignment
**Researched:** 2026-03-20
**Confidence:** MEDIUM-HIGH

## Integration Approach

1. Keep validated lyrics and playback domain modules intact where possible.
2. Introduce a web app shell that composes existing domain outputs.
3. Add theming layer (CSS variables + theme class) at app root.
4. Build UI surfaces with shadcn/ui primitives after install checkpoint.

## New vs Modified Components

| Component | Change Type | Notes |
|-----------|-------------|-------|
| `app` web entrypoint | New | Browser bootstrap and root providers |
| Theme provider/store | New | Handles light/dark toggle and persistence |
| Lyrics panel layout | Modified | Responsive and visual polish adjustments |
| Existing sync domain modules | Reused | Avoid unnecessary logic rewrites |

## Suggested Build Order

1. Web scaffold + Tailwind base verification.
2. Install shadcn/ui (`npx shadcn@latest init`) and baseline tokens.
3. Theme provider + persistent mode toggle.
4. Responsive layout and polished visual composition.
5. Web parity for lyric states and metadata surfaces.

---
*Architecture research for milestone v1.1*
