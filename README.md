# Liryk

Liryk is the current web app for live lyrics and Spotify playback experiments.

## Fresh Windows setup

1. Install Git for Windows.
2. Install Node.js `24.13.1`.
3. Clone this repository.
4. Run `.\scripts\setup-windows.ps1`.
5. Update `.env.local` with your local Spotify values.
6. Run `npm install`.
7. Run `npm run dev`.

## Daily use

1. Pull the latest changes.
2. Run `npm install` when `package-lock.json` changes or dependencies were updated.
3. Run `npm run dev`.

## Required local env values

Set these values in `.env.local`:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_REDIRECT_URI`
- `APP_BASE_URL`
- `SPOTIFY_AUTH_SCOPES`

Local development defaults:

- `SPOTIFY_REDIRECT_URI=http://localhost:3000/callback`
- `APP_BASE_URL=http://localhost:3000`
- `SPOTIFY_AUTH_SCOPES=user-read-playback-state,user-read-currently-playing`

## Troubleshooting

### Missing `.env.local`

If `.env.local` is missing, create it from `.env.example` and then fill in your Spotify client ID before running `npm run dev`.

### Invalid URLs

If startup reports invalid URLs, make sure `SPOTIFY_REDIRECT_URI` and `APP_BASE_URL` are full URLs including the protocol, such as `http://localhost:3000`.

### Origin mismatch warnings

If you see an origin mismatch warning, make sure the browser origin you opened matches `APP_BASE_URL` and that your Spotify redirect URI uses the same local origin.
