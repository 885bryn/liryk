# Phase 3: Lyrics Resolution and Rendered Experience - Research

**Researched:** 2026-03-20
**Domain:** Lyrics provider resolution, metadata matching, fallback rendering, and multilingual lyric presentation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use strict title + artist alignment as the baseline for top-match selection, allowing only minor variant suffix differences.
- When candidates are close, prefer timestamped lyrics first, then metadata quality as a secondary tie-break.
- Expose low-confidence outcomes with a subtle warning state instead of hiding lyrics.
- Keep synced-first behavior even when a plain candidate has slightly better metadata, unless the synced candidate is clearly wrong.
- Use direct, plain wording for no-result outcomes with explicit "Lyrics not found" style copy.
- Provide a single primary retry action in-panel.
- Reset not-found state immediately on track change and start fresh lookup for the new track.
- During retry in progress, show a small inline transient status line, not a full loading takeover.
- Apply direction-aware rendering per line, with bidi isolation by default for mixed/RTL-sensitive content.
- Keep natural wrapping for long CJK/Korean lines with no horizontal scroll and no aggressive truncation.
- Preserve source glyphs and punctuation for display unless content is unusable.
- Prioritize stable baseline/line-height behavior for mixed-script lines.
- For plain multilingual fallback, disable active-line highlight and render as static readable text.
- Treat mojibake or garbled provider payloads as unusable and route through fallback or not-found flow.
- Display Chinese lyrics in Simplified Chinese for all Chinese songs in this milestone.
- Use script-insensitive matching logic for candidate selection, but normalize rendered Chinese output to Simplified in this phase.
- Build phase UI using the existing project shadcn/ui component system and current panel/viewport patterns.
- Keep source state explicit in current surfaces (`synced`, `plain fallback`, `low confidence`, `not found`) without adding new global settings or navigation.

### Claude's Discretion
- Exact score weights and confidence thresholds if strict-match + synced-first intent stays intact.
- Exact copy wording and badge styling for warning/transient states while keeping meanings explicit.
- Exact presentation details within existing shadcn/ui conventions.

### Deferred Ideas (OUT OF SCOPE)
- User-facing toggle between Simplified and Traditional Chinese.
- Cache freshness and invalidation policy details beyond the minimum retry-safe runtime behavior needed for this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LYR-01 | User gets lyrics fetched from internet sources for the active Spotify track | Resolve lyrics once per track session through a dedicated provider adapter (`LRCLIB`) instead of per-poll fetching |
| LYR-02 | User gets the best-matching lyric version using track metadata | Score candidates with strict normalized title + artist baseline, duration tolerance, minor suffix handling, and synced-first tie-breaks |
| LYR-03 | User gets timestamped lyrics when available, with plain-lyrics fallback when timestamps are unavailable | Parse `syncedLyrics` LRC when available, otherwise derive plain static or estimated timeline output from `plainLyrics` |
| LYR-04 | User sees "Lyrics not found" when no usable lyrics are available | Represent not-found as an explicit runtime/UI state with retry and immediate reset on track change |
| I18N-01 | User can read lyrics in UTF-8 languages including CJK, Arabic, and Korean | Normalize text to NFC for matching, preserve source glyphs for display, assign `dir` per line, isolate mixed-direction text, and reject garbled payloads |
| UI-01 | User sees milestone UI implemented with existing shadcn/ui components | Keep panel/viewport patterns and model output aligned to Card/Badge/Button/ScrollArea-style rendering rather than introducing a new UI system |
</phase_requirements>

## Summary

Phase 3 should add one deterministic lyrics-resolution pipeline on top of the Phase 2 playback foundation: normalize Spotify track metadata, fetch provider candidates once for each track session, score them with strict match rules, select one canonical result, then project one explicit UI state (`synced`, `plain`, `low-confidence`, `not-found`). The main risks are quiet mismatches for live/remaster variants and multilingual payloads that are technically UTF-8 but visually or semantically broken.

The safest implementation is to keep provider IO, matching, and rendering concerns separate. Provider adapters should only fetch and normalize raw candidates; pure domain modules should parse LRC, normalize strings, score candidates, and mark unusable text; runtime wiring should own track-session cancellation, retry, and store projection; presenter/view-model files should remain the only place that turns runtime state into user-facing copy and UI affordances.

**Primary recommendation:** Build the phase in four slices: lyric text normalization/parsing primitives, provider + matching pipeline, runtime/store integration for track-session resolution, then presenter/viewport rendering for fallback and multilingual states.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Built-in `fetch` + TypeScript | current repo/runtime | LRCLIB HTTP calls and typed normalization | No extra dependency is required for a single-provider GET workflow |
| Existing Vitest setup | current repo | Fast parser, matcher, runtime, and presenter tests | Repository already uses Vitest and pure-function-heavy modules |
| Existing Phase 2 sync engine (`src/core/sync`) | current repo | Reuse synced lyric timeline behavior | Prevents duplicate timing logic and keeps playback math in one place |
| Unicode platform APIs (`String.prototype.normalize`, `Intl`, regex) | platform | NFC normalization, mixed-script handling, and simple script checks | Good fit for deterministic domain logic without extra libraries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| LRCLIB HTTP API | public API | Provider for `syncedLyrics` and `plainLyrics` | Use as Phase 3 provider source of truth |
| Existing presenter/panel/viewport files | current repo | Deterministic UI model updates | Extend instead of adding a new rendering path |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Small in-repo LRC parser | Third-party LRC parsing package | Faster start, but unnecessary dependency risk for a narrow line-level format |
| Strict metadata scoring with explicit low-confidence state | First-hit provider result | Simpler, but likely wrong for remaster/live/clean variants |
| Per-line direction metadata + bidi isolation | Single container `dir` | Easier, but mixed-script Arabic/CJK lines break more often |

## Architecture Patterns

### Pattern 1: Track-Session Lyrics Resolver
**What:** Resolve lyrics once when Spotify track identity changes, attach a session ID, and ignore stale async results for older sessions.
**When to use:** Every new track or explicit retry.

### Pattern 2: Candidate Quality Scoring with Synced-First Tie-Break
**What:** Normalize metadata, compare title/artist strictly, allow minor suffix variants (`live`, `remaster`, `clean`, `explicit`, bracketed versions), then prefer synced lyrics over plain lyrics when metadata quality is close.
**When to use:** After provider returns one or more candidates.

### Pattern 3: Render-Mode Split (`synced` vs `plain-static`)
**What:** Represent synced lyrics as timeline-driven lines and plain fallback as static readable lines with no active-line highlight.
**When to use:** When projecting resolved lyrics into presenter and viewport state.

### Pattern 4: Unicode-Safe Normalization and Direction Projection
**What:** Normalize comparison strings to NFC, detect unusable/mojibake payloads before display, derive per-line direction metadata, and keep original display text unless Chinese normalization is explicitly required.
**When to use:** Candidate scoring, payload validation, and viewport rendering.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lyrics fetch orchestration | Fetch on every playback poll | Per-track session resolver with retry | Prevents redundant IO and stale result races |
| Candidate selection | "First search hit wins" logic | Explicit scoring function with low-confidence result | Silent mismatches destroy trust |
| Plain fallback rendering | Fake active-line highlight for plain text | Static readable mode with explicit fallback badge/status | Avoids pretending unsynced text is truly aligned |
| i18n handling | Assume UTF-8 decoding alone solves rendering | NFC normalization + direction metadata + mojibake rejection | Prevents broken mixed-script and garbled output |

## Common Pitfalls

### Pitfall 1: Accepting a near-match synced result that is actually the wrong version
**What goes wrong:** The app shows plausible lyrics for the wrong cut because synced lyrics were preferred too aggressively.
**How to avoid:** Require strict normalized title + artist alignment first; only let synced-first break ties among already-acceptable candidates.

### Pitfall 2: Treating all plain lyrics as estimated synced lyrics
**What goes wrong:** UI implies timing confidence where no true timestamps exist.
**How to avoid:** Use an explicit `plain-static` mode for readable fallback; only synthesize estimated timing if Phase 3 code needs timeline compatibility and label it clearly.

### Pitfall 3: Mixed-script text passes validation but renders in the wrong visual order
**What goes wrong:** Arabic with Latin punctuation or numbers renders awkwardly despite valid encoding.
**How to avoid:** Compute direction per line, isolate mixed-direction display runs, and keep viewport wrapping natural.

### Pitfall 4: Retry and track-change races leave stale not-found or old-track lyrics visible
**What goes wrong:** A previous request finishes late and overwrites the newest track's state.
**How to avoid:** Session IDs or request sequence guards in the lyrics-resolution runtime, plus immediate state reset on track change.

## Validation Architecture

Validation for this phase should stay fast and mostly automated:

- **Parser and normalization layer:** unit tests for LRC parsing, plain-lyrics splitting, mojibake rejection, NFC normalization, and Simplified Chinese rendering transforms.
- **Matching layer:** unit tests for remaster/live/clean suffix handling, synced-first tie-breaks, duration tolerance, and low-confidence outcomes.
- **Runtime/store layer:** integration tests for track change reset, stale result suppression, retry flow, not-found projection, and synced/plain mode projection.
- **Presenter/viewport layer:** tests for source-state badges, retry action, no-highlight plain mode, direction metadata, and multilingual line rendering contracts.
- **Full phase quick check:** targeted `vitest run` command covering all new phase test files in under 30 seconds.

## Code Examples

### Candidate scoring skeleton
```typescript
type MatchInput = {
  normalizedTitle: string;
  normalizedArtist: string;
  normalizedAlbum?: string;
  durationDeltaMs: number;
  hasSyncedLyrics: boolean;
};

function scoreCandidate(input: MatchInput): number {
  const durationPenalty = Math.min(20, Math.floor(Math.abs(input.durationDeltaMs) / 1000));
  return (input.hasSyncedLyrics ? 10 : 0) - durationPenalty;
}
```

### Simple LRC parsing target
```typescript
export type ParsedLyricLine = { startMs: number; text: string };

export function parseLrc(input: string): ParsedLyricLine[] {
  return input
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/);
      if (!match) return [];
      const [, mm, ss, fraction, text] = match;
      const startMs = Number(mm) * 60_000 + Number(ss) * 1_000 + Number(fraction.padEnd(3, "0"));
      return [{ startMs, text: text.normalize("NFC") }];
    });
}
```

## Sources

### Primary (HIGH confidence)
- Existing phase context and code references in `.planning/phases/03-lyrics-resolution-and-rendered-experience/03-CONTEXT.md`
- Existing Phase 2 presenter/runtime summaries in `.planning/phases/02-live-playback-sync-engine/02-03-SUMMARY.md`
- LRCLIB live API shape observed from `https://lrclib.net/api/get?track_name=Yellow&artist_name=Coldplay&album_name=Parachutes&duration=269`
- LRCLIB search behavior observed from `https://lrclib.net/api/search?track_name=Yellow&artist_name=Coldplay`
- Unicode normalization guidance: https://www.unicode.org/reports/tr15/
- W3C inline bidi guidance: https://www.w3.org/International/articles/inline-bidi-markup/

### Secondary (MEDIUM confidence)
- Project-wide architecture guidance in `.planning/research/ARCHITECTURE.md`
- Project pitfalls guidance in `.planning/research/PITFALLS.md`
- LRCLIB repository overview: https://raw.githubusercontent.com/tranxuanthang/lrclib/main/README.md

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - stays inside repo patterns and built-in platform APIs
- Architecture: HIGH - extends the existing runtime/store/presenter split from Phase 2
- Matching strategy: HIGH - directly aligned to locked decisions and known pitfalls
- Multilingual handling: MEDIUM - direction and normalization are well understood, but final rendering polish still depends on UI implementation details
