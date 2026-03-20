# Phase 4: Cache Freshness and Repeat-Load Performance - Research

**Researched:** 2026-03-20
**Domain:** Local lyrics cache, freshness policy, and repeat-load runtime behavior
**Confidence:** HIGH

<user_constraints>
## Constraints and Locked Decisions

### From roadmap, project docs, and prior phases
- Cache lyrics locally by Spotify track ID to reduce redundant lookups.
- Keep Phase 4 isolated as the final reliability/performance boundary; do not reopen auth, playback, or UI-library choices.
- Preserve the Phase 3 canonical `ResolvedLyrics` contract and explicit source states instead of inventing a second result shape.
- Keep async track-session guards so stale refresh work cannot overwrite newer playback sessions.
- Stay within the existing TypeScript + Vitest + in-repo module patterns already established in `src/core`, `src/app`, and `src/infra`.

### Claude's Discretion
- Exact TTL values as long as fresh repeat loads are immediate and stale data is revalidated predictably.
- Whether cache persistence uses a lightweight versioned JSON file or another no-new-dependency local storage adapter compatible with the current repo.
- Exact status-line copy for background refresh as long as it stays subtle and does not hide current lyrics.

### Deferred / Out of Scope
- New external database dependencies or packaging work for native modules.
- Manual cache-management UI, settings panels, language preferences, or provider switching.
- Broad architecture rewrites outside the lyrics resolution path.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CACH-01 | User gets faster repeat lyric loads through local cache keyed by Spotify track ID | Add a local persistence adapter keyed by `trackId`; return fresh cached `ResolvedLyrics` immediately before any provider work |
| CACH-02 | User gets fresh lyric updates when cache entries become stale or invalid | Add entry versioning, TTL-based freshness checks, stale-while-revalidate for safe reuse, and forced refresh / invalid-entry eviction |
</phase_requirements>

## Summary

Phase 4 should add a cache layer without disturbing the Phase 3 resolver contract. The safest fit for this repository is a versioned local cache adapter plus a pure freshness-policy module. That keeps storage concerns in `src/infra`, freshness rules in `src/core`, and orchestration in `src/app`.

The recommended behavior is `fresh -> return immediately`, `stale -> return cached result immediately and refresh in the background`, `expired/invalid -> bypass cache and fetch fresh`, with shorter TTLs for `not-found` entries so misses do not stick for long. This directly serves both requirements: repeat plays feel fast, and stale or poisoned data does not linger indefinitely.

**Primary recommendation:** Build the phase in two slices: first define cache contracts + freshness policy + local persistence adapter, then wire cache-aware lookup and revalidation into the lyrics-resolution runtime.

## Standard Stack

### Core
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| Existing TypeScript domain modules | Cache policy, entry validation, and result shaping | Matches current `src/core` testable-logic pattern |
| Existing Vitest setup | Fast unit/integration coverage for policy and runtime behavior | Already installed and used across all completed phases |
| Node local file APIs (`node:fs/promises`, `node:path`) | Persist cache data without adding a new runtime dependency | Fits the current repo better than introducing native SQLite during the last phase |

### Supporting
| Module | Purpose | When to Use |
|--------|---------|-------------|
| `src/core/lyrics/types.ts` | Existing canonical lyric result contract | Reuse as the cache payload instead of creating an alternate cached DTO |
| `src/app/lyrics-resolution-runtime.ts` | Existing track-session orchestration | Extend to consult cache before provider resolution |
| `src/core/lyrics/lyrics-resolver.ts` | Existing provider-backed resolver | Keep as the source of fresh truth for cache writes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Versioned file-backed cache | `better-sqlite3` cache database | Stronger long-term querying, but adds new native dependency not present in the repo and increases execution risk for the final phase |
| Stale-while-revalidate | Cache bust on every stale read | Simpler mental model, but loses the repeat-load speed benefit for stale-yet-usable entries |
| Short-lived negative cache for not found | No negative caching | Avoids persistence of misses, but can create repeated request storms for tracks that truly have no lyrics |

## Architecture Patterns

### Pattern 1: Versioned Cache Entry Contract
**What:** Store `ResolvedLyrics` plus metadata such as `trackId`, `fetchedAtMs`, `staleAtMs`, `expiresAtMs`, and `schemaVersion`.
**Why:** Lets Phase 4 detect invalid, stale, and expired entries deterministically.

### Pattern 2: Pure Freshness Evaluator
**What:** A `evaluateLyricsCacheEntry(entry, now)` style function returns `fresh`, `stale`, `expired`, or `invalid`.
**Why:** TTL rules stay testable without file IO or runtime wiring.

### Pattern 3: Stale-While-Revalidate Runtime
**What:** Track-session runtime reads cache first; stale entries render immediately while a guarded background refresh fetches provider truth and replaces the entry if still current.
**Why:** Meets both speed and freshness goals without blanking the panel on repeat plays.

### Pattern 4: Forced Refresh on Retry / Invalid Entry
**What:** Manual retry or invalid entry detection bypasses cached data and rewrites storage from fresh resolver output.
**Why:** Keeps explicit recovery behavior consistent with Phase 3 retry semantics.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Freshness logic | Inline TTL checks scattered through runtime code | One pure cache-policy module | Prevents drift between read paths |
| Cache payloads | Separate cached lyric model | Store canonical `ResolvedLyrics` plus metadata | Avoids shape drift from Phase 3 |
| Stale protection | Unguarded background refresh promises | Existing session token / latest-track guard pattern | Prevents old refreshes from overwriting current state |

## Common Pitfalls

### Pitfall 1: Cache hit is fast but permanently wrong
**What goes wrong:** Old low-quality or outdated results keep rendering forever.
**How to avoid:** Add TTL windows, schema version validation, and explicit eviction of invalid entries.

### Pitfall 2: Stale refresh reintroduces Phase 3 race conditions
**What goes wrong:** A background refresh for an older track overwrites the new track's state.
**How to avoid:** Reuse the runtime's session guard for both initial resolve and stale revalidation.

### Pitfall 3: Negative cache lasts too long
**What goes wrong:** `Lyrics not found` sticks after upstream lyrics become available.
**How to avoid:** Give negative entries a shorter stale/expiry policy than synced/plain positive results.

## Validation Architecture

- **Policy layer:** Unit tests for fresh, stale, expired, invalid, and not-found TTL classification.
- **Storage layer:** Adapter tests for read/write/delete behavior, schema version handling, and track-id keyed persistence.
- **Runtime layer:** Integration tests for fresh-hit short-circuit, stale-hit background refresh, expired-entry bypass, retry-forced refresh, and invalid-entry eviction.
- **Phase quick check:** One targeted `npm test -- ...` command covering policy, storage, and runtime files in under 30 seconds.

## Sources

### Primary
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/03-lyrics-resolution-and-rendered-experience/03-03-SUMMARY.md`
- `.planning/phases/03-lyrics-resolution-and-rendered-experience/03-04-SUMMARY.md`
- `src/app/lyrics-resolution-runtime.ts`
- `src/core/lyrics/lyrics-resolver.ts`
- `src/core/lyrics/types.ts`

### Secondary
- `.planning/research/STACK.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`

## Metadata

**Confidence breakdown:**
- Cache contract and freshness policy: HIGH
- File-backed local persistence in this repo: HIGH
- Stale-while-revalidate runtime wiring: HIGH
- Exact TTL values: MEDIUM
