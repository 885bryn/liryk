# Deferred Items

## 2026-03-20 - Plan 07.1-03 build blocker (out of scope)

- `npm run build` fails in `src/infra/spotify/spotify-auth-client.ts` because `randomBytes` is imported from `node:crypto`, which is externalized in browser build and not exported by `__vite-browser-external`.
- This failure is pre-existing and outside files modified for Plan 07.1-03.
- Deferred for follow-up in infra/auth runtime compatibility work.
