# Pitfalls Research

**Domain:** Desktop app for Spotify playback detection + synchronized web lyrics
**Researched:** 2026-03-19
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: PKCE desktop auth works in dev, fails in real desktop sessions

**What goes wrong:**
OAuth succeeds during happy-path testing but fails intermittently in desktop builds (redirect mismatch, missing `state` validation, lost `code_verifier`, token refresh gaps), causing playback polling to stop.

**Why it happens:**
Desktop apps often treat PKCE like a browser-only flow and do not harden loopback redirect handling, exact redirect URI matching, or secure persistence of auth state. Teams also over-request scopes and trigger avoidable consent failures.

**How to avoid:**
- Use loopback redirect URIs with strict exact-match registration and verification (`127.0.0.1` callback).
- Persist `code_verifier` and refresh token in OS credential storage, not plaintext files.
- Always generate and validate `state`.
- Request only required scopes (`user-read-currently-playing`, optionally `user-read-playback-state` if needed).
- Add token-refresh and re-auth recovery paths before building lyric UI.

**Warning signs:**
- Frequent 401s after ~1 hour runtime.
- OAuth callback succeeds in browser but app session stays unauthenticated.
- Auth fails only in packaged app, not local dev.
- Users report repeated consent prompts.

**Phase to address:**
Phase 1 - Auth and Spotify connectivity foundation.

---

### Pitfall 2: Playback timing drift causes lyric highlight lag/lead

**What goes wrong:**
Lyric highlighting gradually drifts from audio, especially after pause/resume, seeking, device switching, or network jitter.

**Why it happens:**
Teams treat `progress_ms` as a perfect real-time clock. In practice, polling latency and state-change timing create drift unless corrected with `timestamp` anchoring and periodic resync.

**How to avoid:**
- Build a local monotonic playback clock: `estimatedProgress = progress_ms + (now - timestamp)` while `is_playing`.
- Resync on each poll, seek, track change, and pause/resume transition.
- Add drift correction thresholds (soft correction for small drift, snap for large drift).
- Separate render frame cadence from network poll cadence.

**Warning signs:**
- Drift increases over time even without track changes.
- Large jumps after scrubbing/seek.
- Different sync quality across devices on the same account.
- QA reports "starts fine, off by chorus two".

**Phase to address:**
Phase 2 - Playback clock and synchronization engine.

---

### Pitfall 3: Wrong lyric file selected for the playing track version

**What goes wrong:**
App displays valid lyrics for the wrong cut (live/remaster/clean/translated/cover), producing near-correct text with bad line timing.

**Why it happens:**
Matching logic relies on title+artist only, ignoring Spotify track identity nuances, market relinking, duration tolerances, and version metadata.

**How to avoid:**
- Match by Spotify track ID first, but account for relinking (`linked_from` / market behavior).
- Use weighted matching: normalized title/artist/album + duration tolerance + ISRC when available.
- Rank synchronized lyrics above plain text; keep confidence score per match.
- Require low-confidence fallback UX ("possible mismatch") instead of silent auto-accept.

**Warning signs:**
- Repeated user reports for live/remaster songs.
- Correct first lines but later verses diverge.
- High mismatch rate concentrated in non-US markets.
- Same query returns different lyric IDs across retries.

**Phase to address:**
Phase 3 - Lyrics retrieval, identity matching, and confidence scoring.

---

### Pitfall 4: International text renders but is semantically broken

**What goes wrong:**
CJK, Arabic, Hebrew, and mixed-script lines appear with broken order, incorrect punctuation placement, wrong truncation, or failed matching due to Unicode equivalence differences.

**Why it happens:**
Teams assume UTF-8 storage is sufficient and skip bidirectional isolation, locale-aware shaping/line-breaking, and Unicode normalization before matching/cache keying.

**How to avoid:**
- Normalize comparison inputs to NFC before matching and cache-key derivation.
- Isolate mixed-direction inline runs (`dir`/`bdi` patterns) in UI rendering.
- Use font fallback stacks tested on CJK + RTL scripts.
- Test with real multilingual fixtures (Arabic + Latin numerals, Japanese full/half-width variants, combining marks).

**Warning signs:**
- Lyrics look correct for Latin scripts but break for Arabic/Hebrew.
- Cache misses for visually identical strings.
- Search/match fails on accented or composed/decomposed variants.
- Screenshot diffs differ by OS locale.

**Phase to address:**
Phase 4 - Internationalization hardening and rendering QA.

---

### Pitfall 5: Cache keyed too narrowly causes stale or poisoned lyric sync

**What goes wrong:**
Cache returns outdated, wrong-language, or wrong-version lyrics for a track; fixes upstream never appear because stale records are reused.

**Why it happens:**
Greenfield teams key only by track ID and omit source/version metadata, TTL policy, confidence, and invalidation triggers (market, relink target, language preference, provider update time).

**How to avoid:**
- Use composite cache metadata: track ID, relink origin/target context, language, provider, lyric type (synced/plain), confidence, fetch timestamp.
- Add TTL + stale-while-revalidate; force refresh on low-confidence matches and explicit user retry.
- Store negative-cache entries with short TTL to avoid retry storms.
- Version cache schema from day one and migrate explicitly.

**Warning signs:**
- "Lyrics not found" persists for songs later known to have lyrics.
- Users see wrong language after changing preference.
- Cache hit rate high but user-reported accuracy low.
- Manual DB delete mysteriously "fixes" sync issues.

**Phase to address:**
Phase 5 - Cache strategy, resilience, and data lifecycle.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Poll Spotify every 250ms globally | Fast prototype sync | Rate-limit risk, battery/CPU waste, noisy drift | MVP demo only, single tester |
| Title+artist-only lyric matching | Simple implementation | Systematic mismatches for versions/remasters/covers | Never for production |
| Cache only by `track_id` forever | Easy storage model | Wrong locale/version reuse, no upgrade path | Never |
| Ignore RTL/mixed-script test cases | Faster UI delivery | Broken i18n in real markets | Never |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Spotify OAuth PKCE | Missing state validation and exact redirect match | Enforce strict redirect URI, validate `state`, secure token persistence |
| Spotify Player APIs | Treat `progress_ms` as real-time source of truth | Use `timestamp`-anchored local clock + periodic resync |
| Spotify catalog identity | Ignoring track relinking behavior by market | Handle relinked tracks and store original/linked identity context |
| Lyrics provider APIs | Accepting first search hit as correct | Score candidates with duration/version metadata and confidence thresholds |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Over-polling playback state | 429s, jitter, battery drain | Adaptive poll intervals + backoff with `Retry-After` handling | 10+ active users in dev mode; sooner on poor networks |
| Recomputing lyric alignment every frame | UI stutter on long songs | Pre-index timestamps and binary-search active line | Long tracks + lower-end laptops |
| No negative-cache for misses | Request storms on "not found" songs | Short-TTL negative caching + debounced retries | Popular missing tracks or provider outage |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing refresh tokens in plaintext app config | Token theft, account abuse | Store in OS keychain/credential vault |
| Over-broad scopes for read-only lyric app | Higher consent friction and larger blast radius | Request least-privilege scopes only |
| Logging raw OAuth callback URLs | Leaks auth code/state in logs | Redact query params in logs and telemetry |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent mismatch (wrong lyrics, no warning) | Users lose trust quickly | Show confidence state and manual "find another match" action |
| Hard failure on unsynced lyrics | Empty experience for many tracks | Fallback to plain lyrics with estimated progression label |
| Aggressive auto-scroll during manual read | Frustrating interaction | Temporarily pause auto-scroll on user scroll, resume with explicit control |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **PKCE auth:** Works after token expiry and app restart, not only first login.
- [ ] **Sync engine:** Handles seek/pause/resume/device-switch without cumulative drift.
- [ ] **Lyric matching:** Correct for remaster/live/clean variants, not just exact title matches.
- [ ] **i18n rendering:** Verified on CJK + RTL + combining-mark fixtures.
- [ ] **Cache:** Supports invalidation, TTL, negative caching, and schema migration.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| PKCE flow instability | MEDIUM | Rotate auth session, clear stale verifier/state, re-run auth with diagnostics, patch redirect/state handling |
| Timing drift in production | MEDIUM | Ship server-flagged drift thresholds, collect clock telemetry, hotfix clock anchoring and seek resync |
| Persistent lyric mismatches | HIGH | Re-score historical matches, invalidate low-confidence cache entries, add stricter version-aware matching |
| i18n rendering defects | MEDIUM | Patch bidi wrapping/normalization, refresh fonts, re-run multilingual snapshot test suite |
| Cache poisoning/staleness | HIGH | Bump cache schema version, selective purge by provider/language/track cohorts, rebuild with SWR strategy |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| PKCE desktop auth failures | Phase 1 | 24h auth soak test with forced token expiry and app restart |
| Playback timing drift | Phase 2 | Drift benchmark: median absolute sync error within defined ms budget over full track |
| Lyrics source mismatches | Phase 3 | Gold-set validation on remaster/live/cover cases across markets |
| Internationalization breakage | Phase 4 | Multilingual visual + semantic test pack passes on Windows/macOS |
| Cache staleness/poisoning | Phase 5 | Cache hit-quality KPI and invalidation integration tests pass |

## Sources

- Spotify Web API: Authorization Code with PKCE Flow (official docs) - HIGH confidence: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
- Spotify Web API: Get Currently Playing Track (official reference; `timestamp`, `progress_ms`, scopes) - HIGH confidence: https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track
- Spotify Web API: Rate Limits (official docs; 429 + `Retry-After`) - HIGH confidence: https://developer.spotify.com/documentation/web-api/concepts/rate-limits
- Spotify Web API: Scopes (official docs; least-privilege scope selection) - HIGH confidence: https://developer.spotify.com/documentation/web-api/concepts/scopes
- Spotify Web API: Track Relinking (official docs; market-linked identity caveats) - HIGH confidence: https://developer.spotify.com/documentation/web-api/concepts/track-relinking
- Spotify Web API: February 2026 Dev Mode Changes (official migration guide; dev-mode constraints) - MEDIUM confidence (new policy context): https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
- Unicode UAX #15: Normalization Forms (normative Unicode guidance) - HIGH confidence: https://www.unicode.org/reports/tr15/
- W3C Internationalization: Inline bidi markup guidance - HIGH confidence: https://www.w3.org/International/articles/inline-bidi-markup/
- LRCLIB open-source repository README (service context; API specifics not fully documented in fetched source) - LOW confidence for implementation specifics: https://github.com/tranxuanthang/lrclib

---
*Pitfalls research for: Spotify playback-synced desktop lyrics app*
*Researched: 2026-03-19*
