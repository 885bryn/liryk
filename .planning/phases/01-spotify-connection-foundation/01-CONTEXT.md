# Phase 1: Spotify Connection Foundation - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver secure Spotify account connection and durable authenticated session behavior across app restarts, with clear user-visible connection states and environment-based credential handling. This phase does not add playback features or lyrics rendering capabilities.

</domain>

<decisions>
## Implementation Decisions

### Connect flow
- First-launch entry uses a prominent `Connect Spotify` primary button.
- After successful authorization, show a brief success confirmation before entering normal connected state.
- If connected but no track is currently playing, show explicit waiting state text (`Connected - play a track on Spotify`) instead of blank UI.
- Include a one-line onboarding explainer before first connect to set expectation for live lyric sync behavior.

### Permission messaging
- Show a short plain-language permission summary before redirecting to Spotify authorization.
- Explicitly reassure users that the app reads playback state and does not control playback.
- Place trust/privacy/security copy inline near the connect action (not hidden in settings-only flows).
- Use simple, reassuring tone rather than formal/legal-heavy wording.

### Failure recovery
- Failed authorization states use a persistent retry card with clear next action.
- Error copy is human-readable and reason-specific (for example cancel, timeout, network).
- Temporary failures/rate limits use auto-retry with visible status messaging.
- Repeated failures surface a guided troubleshooting path (not just generic retry).

### Session behavior
- On app reopen with valid auth state, reconnect automatically without prompting.
- Show connected account identity (Spotify account name) in UI once connected.
- Keep logout/disconnect easily accessible in v1.
- Account switch behavior resets current session state and runs a clean reconnect flow.

### Claude's Discretion
- Exact microcopy wording and typography choices for connect, permission, and recovery messages.
- Visual style of success and retry states, as long as behavior decisions above are preserved.
- Placement details for account indicator and logout action within existing app layout.

</decisions>

<specifics>
## Specific Ideas

- Keep first-run flow low-friction but explicit: one primary action, one-line context, then immediate success confirmation.
- Prefer explicit status communication over silent/blank states at every step of auth/session lifecycle.
- Trust messaging should be visible at connect time, emphasizing read-only playback access.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 01-spotify-connection-foundation*
*Context gathered: 2026-03-19*
