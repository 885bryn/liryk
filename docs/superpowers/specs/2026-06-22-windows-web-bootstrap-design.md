# Windows Web Bootstrap Design

## Goal

Make Liryk easy for a single developer to clone from GitHub onto any Windows machine and start locally with `npm run dev`, while minimizing manual setup steps and keeping credentials private.

## Scope

This design covers:

- a Windows-first developer bootstrap flow for the existing web app
- repository changes that make required setup obvious, repeatable, and self-checking
- environment templating for the current Spotify auth configuration
- friendly startup validation so missing prerequisites fail clearly
- documentation for first-run and daily-run workflows

This design does not cover:

- Android or Capacitor setup on fresh machines
- a non-developer installer or packaged desktop app
- cross-platform shell support beyond Windows
- replacing Spotify auth with another provider
- secret syncing or automatic credential download

## Desired Behavior

1. On a fresh Windows machine, the developer installs Git and Node.js.
2. After cloning the repo, there is one obvious setup path to initialize local config.
3. The repo creates or guides creation of `.env.local` without requiring guesswork about variable names or formats.
4. Running `npm run dev` either starts the app successfully or fails with a short, actionable explanation of what is missing.
5. Routine daily use stays simple: open the repo, run `npm install` when dependencies change, then `npm run dev`.
6. Android-specific setup remains clearly deferred for a later phase instead of leaking into this bootstrap.

## Recommended Approach

Use a repo-driven bootstrap flow with a small amount of explicit machine setup outside the repo.

Why this is the recommended path:

- it keeps the external prerequisite list small: Git plus Node.js
- it avoids turning the project into a fragile Windows installer
- it lets the repository explain and validate its own requirements
- it matches the user goal of reducing repeat manual steps across personal machines

Alternative approaches were considered:

- a documentation-only flow would be faster to create but would still leave too much manual interpretation and error-prone setup
- an installer-style flow using `winget` or deeper machine automation would reduce some setup effort but would add maintenance, platform-policy risk, and more moving parts than this project needs

## Architecture

The repository should become the source of truth for local development requirements. Instead of assuming prior knowledge, the repo should expose:

- the expected Node.js version
- the required environment variables
- the default local development URL expectations
- the exact bootstrap command sequence

The bootstrap architecture has four pieces:

- **Documentation layer:** a top-level `README.md` with a fresh-machine path and a short daily-use section
- **Environment template layer:** a checked-in `.env.example` describing required auth variables with safe placeholder values
- **Setup script layer:** a Windows PowerShell bootstrap script that creates `.env.local` from the template when needed and explains any required edits
- **Preflight validation layer:** a small startup check that validates environment presence and gives human-readable failure messages before the app runtime becomes confusing

These pieces should complement the existing runtime validation in `src/infra/config/env.ts`, not duplicate business logic in multiple places.

## Components

### README

Add a root `README.md` that answers three questions quickly:

1. what this project is
2. how to set it up on a fresh Windows machine
3. how to run it day to day

The setup section should be optimized for scanning, not prose. It should document:

- install Git
- install Node.js using the pinned version noted by the repo
- clone the repo
- run the Windows setup script
- update `.env.local` with the developer's Spotify values
- run `npm install`
- run `npm run dev`

It should also include a short troubleshooting section for auth URL mismatches and missing environment variables.

### Node Version Pinning

The repository should declare the expected Node.js version in a machine-readable way so a fresh machine does not silently drift onto an incompatible runtime.

Preferred shape:

- add `.nvmrc` with the chosen Node version
- add `engines.node` in `package.json`

This gives both human guidance and tool-level hints without forcing use of a specific version manager.

### Environment Template

Add `.env.example` documenting the required variables already enforced by `src/infra/config/env.ts`:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_REDIRECT_URI`
- `APP_BASE_URL`
- `SPOTIFY_AUTH_SCOPES`

The template should use sensible local-development placeholders, include the expected callback route, and avoid embedding live secrets.

Because this repo already validates env alignment at runtime, the template should be written to align with the documented local URL, reducing common mismatch errors.

### Windows Setup Script

Add a PowerShell script such as `scripts/setup-windows.ps1` that:

- checks whether `.env.local` exists
- copies `.env.example` to `.env.local` when it does not exist
- leaves an existing `.env.local` untouched
- prints concise next steps telling the developer exactly which values to update

The script should be idempotent. Running it again should be safe and should not overwrite local secrets.

This script should not attempt to install Node.js, modify system-wide settings, or fetch secrets from elsewhere. Its job is repo-local setup only.

### Startup Preflight

Add a lightweight preflight step wired into development startup so failures are understandable before the browser opens into a broken auth state.

The preflight should verify:

- the required env variables are present
- URLs are structurally valid
- the local URL assumptions are clearly communicated when they do not match

The existing `loadAuthEnv` and env-alignment logic already covers much of the validation behavior. The new work should prefer reusing that logic, or wrapping it, rather than introducing a second independent validation system.

One good shape is a small script invoked before `vite` starts, which exits with a readable checklist of missing or invalid values.

## Data Flow

1. The developer clones the repo onto a Windows machine.
2. The developer runs the documented setup command or script.
3. The setup script creates `.env.local` from `.env.example` if it is missing.
4. The developer fills in the real Spotify values in `.env.local`.
5. The developer runs `npm install`.
6. The developer runs `npm run dev`.
7. The startup preflight validates the environment before or at startup.
8. If validation passes, Vite starts and the web app loads normally.
9. If validation fails, the terminal explains exactly what must be corrected.

## Error Handling

The bootstrap flow should fail early, locally, and clearly.

Required failure behavior:

- if Node.js is the wrong version, the docs and package metadata should make the mismatch obvious
- if `.env.local` is missing, the setup script should create it or explain how
- if required variables are missing, the developer should see a short checklist naming the missing keys
- if `APP_BASE_URL` or `SPOTIFY_REDIRECT_URI` is malformed, the error should preserve the current descriptive validation style
- if the configured local origin does not match the active dev origin, the docs should explain the mismatch and the runtime should continue to surface alignment diagnostics

The design should prefer actionable terminal output over silent fallbacks.

## Testing And Verification

Verification should focus on reproducibility of the bootstrap rather than broad product behavior.

Required verification:

- tests for any new setup or preflight logic
- the existing env validation tests continue to pass
- the app still starts with a valid `.env.local`
- the setup script behaves correctly when `.env.local` is missing
- the setup script behaves safely when `.env.local` already exists
- a fresh-machine simulation can be followed from the README without hidden steps

Because this phase is Windows-only, verification can be scoped to PowerShell behavior instead of cross-shell portability.

## Risks And Mitigations

- **Bootstrap logic drifts from runtime reality**
  - Reuse the existing env validation module and keep the list of required variables in one place.

- **The repo still assumes local tribal knowledge**
  - Put the complete fresh-machine path in `README.md` and keep the setup script focused on first-run friction.

- **Secrets get committed accidentally**
  - Use `.env.example` for placeholders only and keep `.env.local` untracked.

- **Over-automation creates brittle machine state**
  - Limit automation to repo-local file creation and validation. Leave system-wide installation to documented prerequisites.

- **Android requirements muddy the simpler web path**
  - Explicitly defer fresh-machine Android parity as the next phase after the web bootstrap lands.

## Deferred Next Phase

The next phase after this design should be **Web + Android dev parity on fresh Windows machines**.

That later phase should cover:

- Android Studio and SDK prerequisites
- Capacitor Android sync and run workflow setup
- callback and emulator or device verification steps
- documentation that cleanly layers Android setup on top of the stable web bootstrap

Keeping that work separate avoids complicating the current setup with native-tooling concerns.

## Success Criteria

- A fresh Windows machine can be prepared for web development with only Git, Node.js, and the repository instructions.
- The repo contains a clear `README.md`, `.env.example`, and a Windows setup script.
- `.env.local` setup no longer depends on memory or hunting through source files.
- `npm run dev` fails clearly when configuration is incomplete and succeeds cleanly when configuration is valid.
- Android setup is recorded as a later phase rather than entangled with the web bootstrap flow.
