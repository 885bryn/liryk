# Liryk

Liryk is the current web app for live lyrics and Spotify playback experiments.

## Fresh Windows setup

1. Install Git for Windows.
2. Install Node.js `24.13.1`.
3. Clone this repository.
4. Run `powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1`.
5. Update `.env.local` with your local Spotify values.
6. Run `npm install`.
7. Run `npm run dev`.

## Daily use

1. Pull the latest changes.
2. Run `npm install` when `package-lock.json` changes or dependencies were updated.
3. Run `npm run dev`.

## Required local env values

Set these values in `.env.local`:

- `VITE_SPOTIFY_CLIENT_ID`
- `VITE_SPOTIFY_REDIRECT_URI`
- `VITE_APP_BASE_URL`
- `VITE_SPOTIFY_AUTH_SCOPES`

Local development defaults:

- `VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback`
- `VITE_APP_BASE_URL=http://127.0.0.1:5173`
- `VITE_SPOTIFY_AUTH_SCOPES=user-read-playback-state,user-read-currently-playing`

The local dev server runs at `http://127.0.0.1:5173` with the callback route at `/callback`.

## Troubleshooting

### Missing `.env.local`

If `.env.local` is missing, run `powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1`, then fill in the `VITE_` Spotify values before running `npm run dev`.

### Invalid URLs

If startup reports invalid URLs, make sure `VITE_SPOTIFY_REDIRECT_URI` and `VITE_APP_BASE_URL` are full URLs including the protocol, such as `http://127.0.0.1:5173`.

### Origin mismatch warnings

If you see an origin mismatch warning, make sure the browser origin you opened matches `VITE_APP_BASE_URL` and that `VITE_SPOTIFY_REDIRECT_URI` uses the same `http://127.0.0.1:5173` origin.
