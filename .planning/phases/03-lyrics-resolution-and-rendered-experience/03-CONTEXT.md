# Phase 3: Lyrics Resolution and Rendered Experience - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver correct lyric retrieval and readable rendering for the active Spotify track by resolving the best available lyric candidate, prioritizing timestamped lyrics, falling back to plain lyrics when needed, and showing explicit not-found outcomes. This phase also enforces multilingual rendering behavior and uses the existing shadcn/ui stack for milestone UI delivery.

</domain>

<decisions>
## Implementation Decisions

### Lyrics candidate match strictness
- Use strict title + artist alignment as the baseline for top-match selection, allowing only minor variant suffix differences.
- When candidates are close, prefer timestamped lyrics first, then metadata quality as a secondary tie-break.
- Expose low-confidence outcomes with a subtle warning state instead of hiding lyrics.
- Keep synced-first behavior even when a plain candidate has slightly better metadata, unless the synced candidate is clearly wrong.

### Not-found recovery behavior
- Use direct, plain wording for no-result outcomes (explicit "Lyrics not found" style copy).
- Provide a single primary retry action in-panel.
- Reset not-found state immediately on track change and start fresh lookup for the new track.
- During retry in progress, show a small inline transient status line (non-blocking, no full loading takeover).

### Multilingual readability policy
- Apply direction-aware rendering per line, with bidi isolation by default for mixed/RTL-sensitive content.
- Keep natural wrapping for long CJK/Korean lines (no horizontal scroll, no aggressive truncation).
- Preserve source glyphs and punctuation for display unless content is unusable.
- Prioritize stable baseline/line-height behavior for mixed-script lines.
- For plain multilingual fallback, disable active-line highlight and render as static readable text.
- Treat mojibake/garbled provider payloads as unusable and route through fallback/not-found flow.

### Chinese script handling
- For this milestone, display Chinese lyrics in Simplified Chinese for all Chinese songs.
- Use script-insensitive matching logic for candidate selection, but normalize rendered Chinese output to Simplified in this phase.

### Milestone UI constraints
- Build phase UI using the existing project shadcn/ui component system and current panel/viewport patterns.
- Keep source state explicit in current surfaces (synced, plain fallback, low-confidence, not found) without adding new global settings/navigation.

### Claude's Discretion
- Exact score weights and confidence thresholds, as long as strict-match + synced-first intent is preserved.
- Exact copy wording and badge styling for warning/transient states while keeping meanings explicit.
- Exact presentation details (spacing/typography/composition) within existing shadcn/ui conventions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and scope
- `.planning/ROADMAP.md` - Phase 3 goal, boundary, and success criteria.
- `.planning/REQUIREMENTS.md` - LYR-01/02/03/04, I18N-01, UI-01 requirement definitions.
- `.planning/PROJECT.md` - Active requirements and milestone constraints (shadcn/ui, fallback expectations).

### Prior phase behavior contracts
- `.planning/phases/02-live-playback-sync-engine/02-CONTEXT.md` - Locked sync UX decisions to preserve.
- `.planning/phases/02-live-playback-sync-engine/02-03-SUMMARY.md` - Presenter/viewport behavior delivered in Phase 2.

### Current phase discussion source
- `.planning/phases/03-lyrics-resolution-and-rendered-experience/03-CONTEXT.md` - This file is the canonical implementation decision source for Phase 3.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/live-sync-runtime.ts` - Existing playback-to-sync runtime; Phase 3 should consume its state rather than rewire playback.
- `src/state/playback/live-sync-store.ts` - Canonical store shape for playback state, confidence, and status line.
- `src/app/live-lyrics-presenter.ts` - Existing status/view-model mapping surface for adding fallback/not-found/low-confidence outputs.
- `src/ui/lyrics/live-lyrics-panel.tsx` - Current panel builder where new source-state outputs should be integrated.
- `src/ui/lyrics/lyrics-viewport.tsx` - Existing viewport model path for readable multilingual line rendering behavior.

### Established Patterns
- State-driven UI model builders in `src/app/*presenter*.ts` and `src/ui/*` keep renderer logic deterministic and testable.
- Runtime/store separation from Phase 2 should remain: resolution logic feeds store/presenter, not direct UI mutations.
- Explicit status-line messaging is already a pattern and should carry not-found/retry/transient updates.

### Integration Points
- Lyrics resolution pipeline should feed line content into `buildLiveLyricsViewModel` and panel model outputs.
- Fallback/not-found outcomes should project through `LiveSyncStore` status/confidence-like fields and existing panel status surfaces.
- Multilingual rendering rules should apply at the viewport/presenter boundary where line text is prepared and displayed.

</code_context>

<specifics>
## Specific Ideas

- Keep resolution deterministic: normalize metadata, score candidates, select one canonical result, then project one clear UI state.
- Keep synced and plain lyrics in one unified domain shape so fallback transitions stay simple.
- Include fixtures for remaster/live/clean variants and multilingual scripts (CJK, Arabic, Korean) in plan/test design.

</specifics>

<deferred>
## Deferred Ideas

- Add a user-facing toggle to switch Chinese lyrics between Simplified and Traditional in the next milestone (out of scope for Phase 3).
- Cache freshness/invalidation policy details remain deferred to Phase 4.

</deferred>

---

*Phase: 03-lyrics-resolution-and-rendered-experience*
*Context gathered: 2026-03-20*
