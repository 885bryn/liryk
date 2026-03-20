# Phase 1: Spotify Connection Foundation - Research

**Researched:** 2026-03-19
**Domain:** Desktop Spotify OAuth PKCE connection and session persistence
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- First-launch entry uses a prominent `Connect Spotify` primary button.
- After successful authorization, show a brief success confirmation before entering normal connected state.
- If connected but no track is currently playing, show explicit waiting state text (`Connected - play a track on Spotify`) instead of blank UI.
- Include a one-line onboarding explainer before first connect to set expectation for live lyric sync behavior.
- Show a short plain-language permission summary before redirecting to Spotify authorization.
- Explicitly reassure users that the app reads playback state and does not control playback.
- Place trust/privacy/security copy inline near the connect action (not hidden in settings-only flows).
- Use simple, reassuring tone rather than formal/legal-heavy wording.
- Failed authorization states use a persistent retry card with clear next action.
- Error copy is human-readable and reason-specific (for example cancel, timeout, network).
- Temporary failures/rate limits use auto-retry with visible status messaging.
- Repeated failures surface a guided troubleshooting path (not just generic retry).
- On app reopen with valid auth state, reconnect automatically without prompting.
- Show connected account identity (Spotify account name) in UI once connected.
- Keep logout/disconnect easily accessible in v1.
- Account switch behavior resets current session state and runs a clean reconnect flow.

### Claude's Discretion
- Exact microcopy wording and typography choices for connect, permission, and recovery messages.
- Visual style of success and retry states, as long as behavior decisions above are preserved.
- Placement details for account indicator and logout action within existing app layout.

### Deferred Ideas (OUT OF SCOPE)
- None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can connect their Spotify account through OAuth PKCE without entering credentials into the app | Use Spotify Authorization Code with PKCE and loopback callback handling in desktop shell |
| AUTH-02 | User stays connected across app restarts through secure token refresh handling | Store refresh/session tokens in OS keychain or secure store and bootstrap auth state at startup |
| SECU-01 | API credentials and tokens are loaded from `.env` and never hardcoded | Centralized environment module with strict runtime validation and startup failure on missing vars |
</phase_requirements>

## Summary

Phase 1 should focus on one stable connection lifecycle: bootstrap configuration from `.env`, drive OAuth PKCE connection, persist session securely, and restore session on restart. This is the minimum foundation needed before playback and lyric features.

For planning quality, the biggest risk is fragmented auth state across renderer/main processes. Keep auth orchestration in one service boundary, expose only minimal session state to UI, and treat tokens as secure infrastructure concerns. UI should communicate explicit connection state at every step (first connect, pending auth, success, waiting-for-track, recoverable failure).

**Primary recommendation:** Build one typed `SpotifyAuthService` with secure token persistence + startup rehydrate, then attach the user-facing connection states and retry/troubleshooting flow on top.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@spotify/web-api-ts-sdk` | 1.2.x | PKCE auth + Spotify API calls | Purpose-built Spotify TS SDK with PKCE support and typed API client |
| `zod` | 4.x | Runtime env/config validation | Prevents silent invalid config and keeps secrets handling explicit |
| existing Electron secure storage utility (or `keytar` if absent) | current project version | Persist tokens across restarts | Required for AUTH-02 without plaintext token files |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dotenv` | latest compatible | Load local `.env` in development | Use for local app start and test environments |
| project HTTP wrapper/logger | existing | Structured API and retry logs | Use for diagnosable auth failures and auto-retry messaging |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Spotify TS SDK PKCE flow | hand-rolled OAuth requests | More control, but higher bug risk in state/verifier/token lifecycle |
| secure OS token store | plaintext JSON session file | Faster to build, but violates security expectations for AUTH-02/SECU-01 |

## Architecture Patterns

### Recommended Project Structure
```
src/
  core/auth/                 # PKCE orchestration, token lifecycle
  infra/spotify/             # Spotify client adapter + callback parsing
  infra/config/              # env loading and zod validation
  state/auth/                # auth state machine and selectors
  ui/connection/             # connect, waiting, success, retry card, account chip
```

### Pattern 1: Auth State Machine
**What:** Explicit auth states (`disconnected`, `authorizing`, `connected_waiting_playback`, `connected_ready`, `recoverable_error`, `fatal_error`).
**When to use:** Entire phase; this is how UI and auth service stay in sync.

### Pattern 2: Startup Rehydrate then Refresh
**What:** On boot, load persisted tokens, validate shape/expiry, refresh if needed, then set connected state.
**When to use:** App startup and restart path for AUTH-02.

### Pattern 3: Retry Budget with Visible Messaging
**What:** Auto-retry temporary failures (rate-limit/network) with bounded attempts + user-visible status.
**When to use:** Callback exchange and token refresh failures that are transient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth PKCE crypto/challenge plumbing | Custom PKCE primitives | Spotify SDK PKCE helpers | Avoid subtle verifier/challenge bugs |
| Secret validation | Ad-hoc `process.env` checks in many files | Single validated config module (`zod`) | Consistent fail-fast behavior |
| Session persistence encryption | Custom crypto-at-rest layer | OS credential store integration | Hard to get secure storage right manually |

## Common Pitfalls

### Pitfall 1: Callback succeeds but app remains disconnected
**What goes wrong:** Browser returns from Spotify but renderer never gets finalized connected state.
**How to avoid:** Single auth orchestrator emits canonical state updates consumed by UI selectors.

### Pitfall 2: Works once, fails after restart
**What goes wrong:** Refresh token not persisted securely or not reloaded at startup.
**How to avoid:** Add startup rehydrate task with explicit automated verification across process restart.

### Pitfall 3: Hardcoded fallback client values
**What goes wrong:** Missing env vars silently fallback to placeholder IDs.
**How to avoid:** Block app startup when required env vars are missing/invalid.

## Code Examples

### Typed env bootstrap
```typescript
const EnvSchema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_REDIRECT_URI: z.string().url(),
});

export const env = EnvSchema.parse(process.env);
```

### Startup auth rehydrate
```typescript
const persisted = await tokenStore.load();
if (persisted) {
  await authService.resumeSession(persisted);
}
```

## Open Questions

1. Which secure storage adapter already exists in this repo for desktop secrets?
   - What we know: Phase requires secure persistence, but implementation file path is not established yet.
   - Recommendation: During execution, detect existing adapter first; if absent, introduce one canonical adapter in `infra`.

## Sources

### Primary (HIGH confidence)
- Spotify Web API PKCE flow docs
- Spotify current playback endpoint/scopes docs
- Existing project research docs: `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md`

### Secondary (MEDIUM confidence)
- Prior project planning artifacts and context constraints in `.planning/phases/01-spotify-connection-foundation/01-CONTEXT.md`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - aligned with project research artifacts
- Architecture: HIGH - direct fit for phase requirements and context constraints
- Pitfalls: HIGH - explicitly mapped to auth/session/environment failures
