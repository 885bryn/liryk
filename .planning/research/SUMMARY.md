# Project Research Summary

**Project:** Spotify Live Lyrics Desktop App
**Domain:** Desktop Spotify playback companion with live-synced lyrics
**Researched:** 2026-03-19
**Confidence:** MEDIUM-HIGH

## Executive Summary

This project is a reliability-first desktop companion app: detect the currently playing Spotify track, fetch the best-matching lyrics, and keep line highlighting synchronized in real time. The research converges on a standard modern desktop web stack (Electron + React + Vite + TypeScript) with Spotify Web API OAuth PKCE, timestamp-first lyrics resolution, and a deterministic sync engine that predicts progress between API polls.

The strongest recommendation is to optimize for correctness before feature breadth. Build auth + playback polling first, then implement a snapshot-and-prediction sync core, then add version-aware lyric matching and session orchestration to prevent stale async updates. Keep v1 read-only for playback, include explicit fallback modes (`Lyrics not found`, `Estimated sync`), and harden multilingual rendering from the first release.

The key risks are auth fragility in packaged desktop builds, timing drift during long playback or seeks, lyric version mismatches, i18n rendering edge cases, and cache staleness. Mitigation is clear: strict PKCE handling + secure token storage, monotonic clock re-anchoring with drift thresholds, confidence-scored lyric matching, Unicode/RTL test fixtures, and cache metadata with TTL + invalidation.

## Key Findings

### Recommended Stack

Research strongly supports Electron-based desktop delivery with typed domain logic and explicit network-boundary validation. The stack is selected to maximize iteration speed while reducing sync/state bugs in the core milestone.

**Core technologies:**
- **Electron 41.0.3:** Desktop shell + secure IPC boundary — mature, well-documented patterns for secure desktop OAuth and packaging.
- **React 19.2.4:** Renderer UI for lyrics timeline + controls — best fit with existing shadcn/ui constraint.
- **Vite 8.0.1:** Fast renderer build/dev loop — ideal for frequent sync-engine tuning and instrumentation.
- **TypeScript 5.9.3:** Type-safe playback/lyrics/sync flows — reduces race-condition and timing logic defects.
- **Node.js 24.x LTS:** Runtime baseline — satisfies modern toolchain requirements and long-lived support.

**Critical version/usage requirements:**
- Use Spotify Authorization Code with PKCE (not Implicit Grant) and least-privilege scopes.
- Keep `better-sqlite3` in Electron main process; pair with `@electron/rebuild` for ABI compatibility.
- Validate all API/provider payloads at boundaries (`zod`) before state updates.

### Expected Features

Feature research is explicit: v1 succeeds or fails on sync trustworthiness, not flashy controls. Table stakes are mostly P1 and tightly coupled by dependencies (auth -> polling -> sync engine -> highlight/scroll).

**Must have (table stakes):**
- Spotify OAuth PKCE with token lifecycle recovery.
- Reliable now-playing + `progress_ms` detection including `204/401/429` handling.
- Version-aware lyrics matching (track identity + metadata + duration tolerance).
- Real-time line highlight + auto-scroll with pause/seek/skip resilience.
- Missing-lyrics + plain-lyrics fallback modes with clear labels.
- Local cache keyed by Spotify track identity context.
- Multilingual rendering baseline (UTF-8 + RTL-safe behavior).

**Should have (competitive):**
- Sync quality badge (`Synced` / `Estimated` / `Static`).
- Per-track timing offset correction for imperfect community timestamps.
- Desktop power-user affordances (keyboard jump, always-on-top mini mode).

**Defer (v2+):**
- Word-level karaoke highlighting.
- Community lyric editing/crowdsourcing workflows.
- Cross-provider playback support beyond Spotify.

### Architecture Approach

The recommended architecture is an event-driven orchestrator over four core domains: playback polling, lyrics resolution, sync engine, and state store. Use Spotify poll snapshots as anchors, predict playback progression with a monotonic local clock between polls, and atomically reset per-track sessions on track/seek changes to prevent stale async writes.

**Major components:**
1. **Playback Poller** — normalizes Spotify playback snapshots and handles adaptive cadence/backoff.
2. **Lyrics Resolver** — cache-first provider chain with timestamp preference and confidence scoring.
3. **Sync Engine** — maps estimated progress to active line with re-anchor + drift correction.
4. **Track Session Orchestrator** — coordinates lifecycle, cancellation, and state transitions.
5. **State Store + Renderer** — deterministic UI state (`idle/loading/ready/not-found/error`) and multilingual line rendering.

### Critical Pitfalls

1. **PKCE works in dev but fails in packaged app** — enforce exact loopback redirect + `state` validation + secure token storage + refresh/recovery soak tests.
2. **Timing drift accumulates** — use timestamp-anchored monotonic playback estimation, periodic re-anchor, and snap-on-large-delta seek handling.
3. **Wrong lyric version selected** — score candidates with track identity + duration/version metadata; never silently accept low-confidence matches.
4. **International text appears but is semantically broken** — normalize Unicode (NFC), apply per-line direction handling, and test CJK/RTL fixtures cross-platform.
5. **Cache staleness/poisoning** — include provider/language/confidence/fetch metadata, add TTL + stale-while-revalidate + negative-cache entries.

## Implications for Roadmap

Based on dependencies and risk concentration, suggested phase structure:

### Phase 1: Auth + Playback Baseline
**Rationale:** Every other capability depends on stable authenticated playback snapshots.
**Delivers:** PKCE desktop auth, token refresh/recovery, normalized now-playing polling with `204/401/429` handling.
**Addresses:** OAuth PKCE, now-playing/progress detection (P1 table stakes).
**Avoids:** Pitfall 1 (desktop PKCE instability), over-polling/rate-limit traps.

### Phase 2: Deterministic Sync Core
**Rationale:** Reliable line timing must exist before advanced UI polish or provider expansion.
**Delivers:** Snapshot + prediction sync engine, seek/pause/skip/device-switch handling, drift instrumentation.
**Uses:** TypeScript domain core, `performance.now`-based interpolation, React state selectors.
**Implements:** `core/sync` + orchestrator re-anchor logic.
**Avoids:** Pitfall 2 (drift), anti-pattern of binding UI directly to last poll value.

### Phase 3: Lyrics Resolution + Match Confidence
**Rationale:** Correctness of lyric source is as important as timing correctness.
**Delivers:** Metadata-normalized matching, provider chain, confidence scoring, clear mismatch/fallback states.
**Addresses:** Version-aware matching, fallback UX, timestamp-first retrieval.
**Avoids:** Pitfall 3 (wrong version), silent mismatch UX failures.

### Phase 4: Session Orchestration + Cache Lifecycle
**Rationale:** Real usage introduces rapid track transitions, stale async responses, and cache quality decay.
**Delivers:** Per-track session IDs/cancellation, cache schema + TTL/SWR/negative cache, invalidation paths.
**Uses:** `better-sqlite3` (main process) and optional `drizzle-orm` migrations.
**Implements:** Orchestrator + cache metadata model.
**Avoids:** Pitfall 5 (cache poisoning/staleness), fire-and-forget fetch race conditions.

### Phase 5: Multilingual Hardening + Desktop Differentiators
**Rationale:** i18n correctness and usability polish should ship once core reliability is proven.
**Delivers:** RTL/CJK rendering QA pack, typography fallback tuning, sync quality badge, optional mini mode/shortcuts.
**Addresses:** Multilingual baseline + selected P2 differentiators.
**Avoids:** Pitfall 4 (semantic rendering breakage), aggressive auto-scroll UX frustration.

### Phase Ordering Rationale

- Dependency chain is strict: auth/polling -> sync engine -> lyric resolution -> orchestration/cache -> i18n/polish.
- Grouping follows architectural boundaries (`core/playback`, `core/sync`, `core/lyrics`, `core/orchestrator`, `ui`).
- Ordering intentionally burns down highest-risk failure modes first (auth breakage, drift, mismatch), reducing rework.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Provider quality variance and scoring thresholds need corpus-driven validation.
- **Phase 4:** Cache-key design under relinking/language contexts needs explicit schema and migration planning.
- **Phase 5:** Cross-platform multilingual rendering behavior requires fixture-based QA strategy refinement.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Spotify PKCE + current playback polling are well-documented in official docs.
- **Phase 2:** Snapshot/prediction timing model is a standard architecture pattern with clear implementation guidance.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Strongly grounded in official Electron/Spotify/Vite/Node documentation and current version checks. |
| Features | MEDIUM-HIGH | Table stakes are clear; differentiator prioritization includes some market inference. |
| Architecture | MEDIUM | Patterns are solid, but provider-specific behavior and exact scaling thresholds need implementation validation. |
| Pitfalls | MEDIUM | High-confidence Spotify/Unicode risks; some provider-specific mitigations rely on lower-confidence ecosystem docs. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Lyrics provider reliability/contracts:** define fallback provider strategy, error taxonomy, and confidence thresholds with real track corpus before locking acceptance criteria.
- **Cache schema details:** finalize key dimensions (relink context, language, provider, confidence), TTL policy, and migration rules in roadmap planning.
- **Dev Mode/policy constraints (2026 Spotify changes):** validate app registration/testing workflow early to avoid environment surprises.
- **Cross-OS font/render parity:** establish required font fallback bundle and golden screenshots for Windows/macOS prior to release criteria.

## Sources

### Primary (HIGH confidence)
- Spotify Web API docs (PKCE, scopes, currently playing, playback state, rate limits, track relinking) — auth, polling, limits, identity rules.
- Electron official docs + security checklist — desktop security boundaries and hardened IPC/auth practices.
- Vite, Node.js, TypeScript official docs/release references — toolchain compatibility requirements.
- MDN docs (`performance.now`, `requestAnimationFrame`, `Intl.Segmenter`, `dir` guidance) — timing and international text handling.
- Unicode UAX #15 and W3C i18n bidi guidance — normalization and directionality correctness.

### Secondary (MEDIUM confidence)
- Spotify Support/Newsroom references — user expectation baseline for lyric behavior and availability messaging.
- Musixmatch customer-story materials — competitive framing for synchronized lyric expectations.
- LRCLIB API/example and project README — source payload shape and ecosystem behavior signal.

### Tertiary (LOW confidence)
- LRCLIB implementation specifics beyond public examples — requires direct integration testing in this app context.

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*
