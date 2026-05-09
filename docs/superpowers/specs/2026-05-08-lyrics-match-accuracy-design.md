# Lyrics Match Accuracy Design

## Goal

Improve lyric selection accuracy without sacrificing best-effort fallback behavior.

Today the app can accept the wrong lyric variant when provider metadata is close enough on title and artist. The most visible failures are:

- selecting the wrong song version for the current track
- selecting synced lyrics whose timing span does not fit the track length
- selecting lyrics in the wrong language or a translated or alternate script variant

The new behavior should still prefer showing usable lyrics over returning `not-found`, but it must become much harder for a risky synced result to outrank a safer plain-lyrics result.

## Scope

This design covers:

- lyric candidate scoring in [src/core/lyrics/lyrics-matcher.ts](C:\Users\bryan\Documents\Opencode\liryk\src\core\lyrics\lyrics-matcher.ts)
- lyric resolution and fallback selection in [src/core/lyrics/lyrics-resolver.ts](C:\Users\bryan\Documents\Opencode\liryk\src\core\lyrics\lyrics-resolver.ts)
- provider candidate metadata already returned by [src/infra/providers/lrclib-client.ts](C:\Users\bryan\Documents\Opencode\liryk\src\infra\providers\lrclib-client.ts)
- low-confidence presentation in the existing lyrics UI and presenter layers
- tests for matching, resolution, and low-confidence presentation

This design does not add a new lyric provider or user-controlled language preference.

## Desired Behavior

When multiple lyric candidates are available:

1. Prefer a high-confidence synced candidate when its metadata and timestamp coverage both look compatible with the current Spotify track.
2. If the best synced candidate looks risky, prefer a safer alternate candidate even if that alternate is plain-only.
3. If every remaining candidate is risky but one is still plausibly correct, return it as `low-confidence` and show a small UI indicator.
4. Return `not-found` only when no candidate clears the minimum plausibility bar.

## Approach

### 1. Enrich candidate scoring

Replace the current mostly binary title and artist acceptance with a layered score made of:

- base metadata compatibility for title and artist
- version-marker compatibility between Spotify metadata and lyric candidate metadata
- album compatibility
- raw duration delta
- synced timestamp coverage quality when synced lyrics are present
- lyric structure quality signals for clearly degraded synced payloads

The matcher should continue to return a single best candidate, but it must also surface enough detail for the resolver to understand why a candidate is risky.

### 2. Add version-marker compatibility

Introduce normalization and token inspection for markers that often indicate the wrong version of the song, such as:

- `live`
- `remix`
- `mix`
- `edit`
- `acoustic`
- `instrumental`
- `karaoke`
- `clean`
- `explicit`
- `remaster`
- `sped up`
- `slowed`
- `version`

Rules:

- If the candidate includes a version marker that the Spotify track metadata does not include, apply a substantial penalty.
- If both sides include the same marker, keep or slightly reward the match.
- Benign release-noise markers such as remaster year tags should remain softer than content-changing markers like `live`, `remix`, or `instrumental`.

This is intended to keep “Song Name - Live” from beating the studio version unless the playing track also clearly indicates that version.

### 3. Add synced duration-span validation

For candidates with `syncedLyrics`, parse the LRC and inspect timestamp coverage:

- first timestamp
- last timestamp
- estimated lyric span
- timestamp density relative to track duration

Use those signals to penalize synced candidates whose timeline is implausible for the track, including:

- total lyric span far shorter than the song
- total lyric span far longer than the song
- only a handful of timestamped lines for a full-length track
- timestamps clustered in one section while most of the song duration is uncovered

This does not need to reject every imperfect LRC. It should separate “mostly plausible” from “very likely the wrong song or wrong edit.”

### 4. Add language and alternate-text heuristics

Use lyric text itself as a weak compatibility signal rather than a hard gate.

Examples of suspicious cases:

- candidate title and artist match, but lyric text is entirely in a different script than the likely canonical version
- one candidate is a romanized or translated variant while another candidate looks closer to the original-language track

Rules:

- Do not reject solely because the script differs.
- Apply a penalty when the candidate appears to be a translation or alternate-text rendering and a safer same-metadata alternative exists.
- Keep this weaker than title, artist, and timeline plausibility to avoid harming legitimate multilingual tracks.

This heuristic should be implemented conservatively because the app does not yet collect an explicit user language preference.

### 5. Select safer fallback candidates

Resolver behavior should change from “top accepted candidate wins” to “top safest usable candidate wins.”

Decision flow:

1. Score all usable candidates.
2. Separate them into confidence bands such as `high-confidence`, `acceptable-low-risk`, `low-confidence`, and `reject`.
3. Prefer high-confidence synced candidates first.
4. If the best synced candidate is low-confidence, compare it against safer plain candidates before returning it.
5. If a safer plain candidate exists, return that candidate and mark the result as `low-confidence`.
6. If only risky candidates remain, return the best plausible candidate as `low-confidence`.
7. If no plausible candidate remains, return `not-found`.

This preserves best-effort behavior while making the fallback path intentional instead of accidental.

### 6. Surface confidence in UI

Keep the existing `low-confidence` source state and expose it more clearly in the lyrics UI with a subtle icon-level treatment.

Requirements:

- low-confidence lyrics remain visible
- the indicator is small and non-blocking
- the current warning badge or rail copy can continue to explain the state
- synced, plain, and low-confidence states remain distinct in telemetry and presentation logic

The indicator should communicate “best guess” rather than “error.”

## Data Flow

1. Provider returns merged lyric candidates.
2. Matcher computes metadata score, version penalties, duration penalties, and synced plausibility signals.
3. Matcher returns scored candidates with confidence metadata.
4. Resolver chooses the safest usable candidate according to the fallback rules.
5. Resolver returns:
   - `synced` for strong synced matches
   - `plain` for strong plain-only matches
   - `low-confidence` for risky but plausible best-effort results
   - `not-found` when nothing plausible remains
6. Presenter and UI show lyrics plus a subtle low-confidence indicator when applicable.

## Testing

Add or update tests to cover:

- wrong-version penalties for `live`, `remix`, `acoustic`, and similar markers
- soft handling of benign remaster-style suffixes
- synced candidates with implausibly short or long timestamp span relative to track duration
- fallback from risky synced candidate to safer plain candidate
- low-confidence state when only risky candidates are available
- conservative handling of script or translation-like lyric variants
- UI rendering of the low-confidence indicator without hiding lyrics

## Risks And Mitigations

- Over-penalizing legitimate alternate versions
  - Keep penalties weighted rather than absolute, except for clearly impossible cases.
- Rejecting good multilingual results
  - Treat language or script analysis as advisory, not decisive.
- Preferring plain lyrics too often
  - Only demote synced results when their risk signals materially outweigh the synced bonus.
- Overfitting to lrclib quirks
  - Keep heuristics based on generic metadata and parsed timestamp quality so the logic remains provider-agnostic.

## Implementation Notes

- Keep the matcher focused on scoring and candidate diagnostics.
- Keep the resolver focused on selection policy and fallback behavior.
- Avoid bundling unrelated UI cleanup into this work.
- Preserve existing source-state semantics so downstream presenter logic stays stable.

## Success Criteria

- The app stops preferring clearly wrong synced versions when a safer plain candidate exists.
- Timing-based mismatches are demoted before they can create unsynced fullscreen behavior.
- Wrong-language or translated variants are less likely to win when a closer candidate exists.
- Users still get lyrics in borderline cases, but the UI clearly marks them as low confidence.
