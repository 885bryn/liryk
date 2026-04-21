# Deferred Items

## 2026-03-20 - Plan 07.1-03 build blocker (resolved)

- Previous browser build failure in `src/infra/spotify/spotify-auth-client.ts` was resolved by removing `node:crypto` usage from client-bundled auth code.
- `npm run build` now passes with web-compatible PKCE generation.
