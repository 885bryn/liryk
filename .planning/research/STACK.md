# Stack Research

**Domain:** Desktop Spotify live-lyrics app (Milestone 1: sync reliability)
**Researched:** 2026-03-19
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Electron | 41.0.3 | Desktop shell (Windows/macOS/Linux), secure IPC boundary | Most common production desktop JS stack; mature Spotify OAuth desktop patterns; official security guidance is clear and current (context isolation + sandbox defaults). **Confidence: HIGH** |
| React | 19.2.4 | UI rendering for lyrics timeline and controls | Stable modern React baseline (React 19 line), best ecosystem fit with existing shadcn/ui setup. **Confidence: HIGH** |
| Vite | 8.0.1 | Fast renderer build/dev server | Current standard frontend bundler; fast iteration loop is ideal for sync tuning work. **Confidence: HIGH** |
| TypeScript | 5.9.3 | Type-safe domain logic (playback state, lyric timing, cache schemas) | Reduces timing/state bugs in sync engine and API integration paths. **Confidence: HIGH** |
| Node.js | 24.x LTS | Runtime/tooling baseline | Active LTS line; aligns with modern Vite requirements and current ecosystem support. **Confidence: HIGH** |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @spotify/web-api-ts-sdk | 1.2.0 | Spotify Web API client with PKCE user auth helpers + token refresh | Use for `user-read-currently-playing` polling and OAuth PKCE flow in desktop auth callback flow. **Confidence: HIGH** |
| @tanstack/react-query | 5.91.2 | Polling, stale/cache handling, retry/backoff for playback + lyrics fetch | Use for 1s playback polling and lyric-source fallback orchestration. **Confidence: HIGH** |
| zod | 4.3.6 | Runtime validation of Spotify/lyrics payloads | Use at all network boundaries; fail fast and surface "Lyrics not found" cleanly. **Confidence: HIGH** |
| better-sqlite3 | 12.8.0 | Local lyrics cache keyed by Spotify track ID | Use for deterministic local cache and offline-friendly reads; run in Electron main process only. **Confidence: MEDIUM** |
| drizzle-orm | 0.45.1 | Typed SQLite schema/access layer | Use if you want migration-safe cache schema evolution beyond a single JSON blob table. **Confidence: MEDIUM** |
| lrc-kit | 1.2.1 | LRC parsing utility | Use only if it passes multilingual edge-case tests; otherwise keep a small in-house parser for full control. **Confidence: LOW** |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Electron Forge | 7.11.1 | App scaffolding/build workflow for Electron | Use Forge defaults; add hardening from Electron security checklist early. |
| @electron/rebuild | 4.0.3 | Rebuild native modules for Electron ABI | Required when using `better-sqlite3` in Electron. |
| Vitest | 4.1.0 | Unit tests for lyric timing parser/sync engine | Focus tests on timeline interpolation and fallback timing heuristics. |
| Playwright | 1.58.2 | End-to-end smoke tests for auth/playback/auto-scroll | Use for deterministic sync regression checks on key lyric fixtures. |

## Installation

```bash
# Core
npm install react@19.2.4 react-dom@19.2.4 @spotify/web-api-ts-sdk@1.2.0 @tanstack/react-query@5.91.2 zod@4.3.6 better-sqlite3@12.8.0 drizzle-orm@0.45.1 lrc-kit@1.2.1

# Supporting (keep existing shadcn/ui + radix stack; no alternate UI libs)
npm install lucide-react@0.577.0 @radix-ui/react-scroll-area@1.2.10

# Dev dependencies
npm install -D electron@41.0.3 @electron-forge/cli@7.11.1 @electron/rebuild@4.0.3 vite@8.0.1 typescript@5.9.3 vitest@4.1.0 @playwright/test@1.58.2 tailwindcss@4.2.2 @tailwindcss/vite@4.2.2
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Electron + React + Vite | Tauri v2 | Use Tauri only if binary size is a hard KPI this milestone and team is already comfortable with Rust/IPC/security policy model. |
| better-sqlite3 (+ optional Drizzle) | JSON file cache (`electron-store`) | Use JSON only for throwaway prototypes; SQLite is better for dedupe, indexing, and future cache metadata. |
| @spotify/web-api-ts-sdk | Raw `fetch` + hand-rolled OAuth/token refresh | Use raw fetch only if you need full custom auth plumbing and want to avoid SDK abstraction. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Spotify Web Playback SDK | Requires Spotify Premium for streaming scope; milestone requires detection without Premium. | Spotify Web API (`/me/player/currently-playing`) with PKCE scopes. |
| Spotify Implicit Grant flow | Explicitly deprecated by Spotify docs; weaker modern OAuth posture. | Authorization Code with PKCE. |
| `spotify-web-api-node` in renderer | Designed around client-secret/server use; violates desktop secret handling constraints if misused. | `@spotify/web-api-ts-sdk` PKCE client flow. |
| Replacing shadcn/ui with another component library | Violates project constraint and burns milestone time on UI migration. | Keep existing shadcn/ui + Tailwind stack. |

## Stack Patterns by Variant

**If timestamped lyrics are found (preferred path):**
- Use exact LRC timestamps + interpolation against Spotify `progress_ms`.
- Because Milestone 1 success metric is line-level sync reliability, not broad feature surface.

**If only plain lyrics are found (fallback path):**
- Use deterministic estimated timings (duration-weighted line distribution), visibly mark as "estimated sync".
- Because graceful degradation is required, but users should not confuse heuristic timing with true sync.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| electron@41.0.3 | @electron/rebuild@4.0.3 | Needed for native addons like `better-sqlite3`. |
| vite@8.0.1 | node >=20.19 or >=22.12 | Vite docs specify modern Node requirement; Node 24 LTS satisfies it. |
| react@19.2.4 | shadcn/ui (existing) + Tailwind 4.x | Keep current shadcn stack; do not swap UI framework during Milestone 1. |
| @spotify/web-api-ts-sdk@1.2.0 | Node >=18 / modern browser | SDK docs explicitly state these runtime requirements. |

## Sources

- Spotify Web API PKCE tutorial — https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow (official, HIGH)
- Spotify "Get Currently Playing Track" reference — https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track (official, HIGH)
- Spotify scopes reference — https://developer.spotify.com/documentation/web-api/concepts/scopes (official, HIGH)
- Spotify Web Playback SDK overview (Premium requirement) — https://developer.spotify.com/documentation/web-playback-sdk (official, HIGH)
- Spotify TypeScript SDK README — https://raw.githubusercontent.com/spotify/spotify-web-api-ts-sdk/main/README.md (official repo, HIGH)
- Electron docs + security checklist — https://www.electronjs.org/docs/latest/ and https://www.electronjs.org/docs/latest/tutorial/security (official, HIGH)
- Vite guide (v8 + Node requirements) — https://vite.dev/guide/ (official, HIGH)
- Node release/LTS status — https://nodejs.org/en/about/previous-releases (official, HIGH)
- Tailwind + Vite install docs (v4) — https://tailwindcss.com/docs/installation/using-vite (official, HIGH)
- LRCLIB project README (service context, API ecosystem signal) — https://raw.githubusercontent.com/tranxuanthang/lrclib/main/README.md (official repo, MEDIUM)
- npm registry version checks (2026-03-19): electron, react, vite, typescript, @spotify/web-api-ts-sdk, @tanstack/react-query, zod, better-sqlite3, drizzle-orm, Electron Forge, Vitest, Playwright (registry metadata, HIGH)

---
*Stack research for: Desktop Spotify live-lyrics app*
*Researched: 2026-03-19*
