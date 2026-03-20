# Phase 08 Research: Simplified Chinese Lyrics Normalization

**Date:** 2026-03-20
**Status:** Complete
**Scope:** CHN-01, CHN-02

## Inputs Reviewed

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/03-lyrics-resolution-and-rendered-experience/03-04-SUMMARY.md`
- `.planning/phases/07-web-lyrics-experience-parity-and-state-polish/07-02-SUMMARY.md`
- `src/core/lyrics/unicode-normalization.ts`
- `src/core/lyrics/unicode-normalization.test.ts`
- `src/core/lyrics/lrc-parser.ts`
- `src/core/lyrics/plain-lyrics-timing.ts`
- `src/core/lyrics/lyrics-resolver.ts`
- `src/core/lyrics/lyrics-resolver.test.ts`
- `src/ui/lyrics/lyrics-viewport.tsx`
- `src/ui/lyrics/lyrics-viewport.test.tsx`
- `src/web/app-shell.tsx`
- `src/web/app-shell.test.tsx`

## Discovery Level

**Level 0 (no external discovery required)**

Reasoning:
- Scope is internal normalization and rendering behavior on existing lyrics contracts.
- No new external API, SDK, or architecture choice is required.
- Existing code already has Chinese normalization helpers; this phase is consistency hardening across the full render path.

## Current Behavior Snapshot

1. `normalizeChineseForDisplay` exists but uses a very small Traditional-to-Simplified map (`愛`, `還`, `說`).
2. `lyrics-viewport` always normalizes line display text (`line.displayText ?? line.text`) before rendering.
3. `app-shell` currently renders active/next text from resolver output (`displayText ?? text`) without a fallback normalization step.
4. Resolver line builders (`parseLrc`, `buildPlainLyricsLines`) currently only set `text`; they do not guarantee `displayText` is populated.

## Risk Assessment

- **Coverage risk:** Existing map is too small for real-world Traditional lyric lines; users may still see Traditional glyphs.
- **Pipeline inconsistency risk:** Viewport path normalizes, but shell path relies on incoming `displayText`, which is not guaranteed.
- **Regression risk:** If normalization is applied destructively to `text`, matching/debug contracts could drift from provider-source text.

## Recommended Implementation Approach

### 1) Harden deterministic conversion contract

- Expand deterministic Traditional-to-Simplified mappings in `unicode-normalization.ts` for common lyric characters and phrase-level coverage used in tests.
- Keep conversion character-mapped and deterministic (no external transliteration services).
- Preserve all non-Chinese characters (Latin, numbers, punctuation, emoji, RTL scripts).

### 2) Normalize once in resolver line outputs

- Populate `displayText` during line construction for both synced (`parseLrc`) and plain (`buildPlainLyricsLines`) outputs.
- Keep `text` as normalized provider-source text (NFC), and use `displayText` for Simplified rendering.
- Ensure resolver output contract yields Simplified display text regardless of downstream consumer (`AppShell` or `LyricsViewport`).

### 3) Lock rendering-level behavior and publish a phase QA checklist

- Add shell tests proving active/next rendered lyric text is Simplified when source lyrics are Traditional.
- Add tests proving mixed-language lines preserve non-Chinese segments unchanged.
- Publish phase-local verification artifact with automated commands and manual real-track checks for CHN-01/CHN-02.

## Do Not Hand-Roll

- Do not add network-based transliteration libraries or AI conversion services.
- Do not mutate matcher contracts (`normalizeForMatch`) for this phase; matching remains separate from display normalization.
- Do not duplicate normalization logic in multiple UI components when line contracts can carry `displayText`.

## Common Pitfalls

- Applying conversion only in one renderer (viewport) and missing shell/alternate consumers.
- Overwriting `text` instead of providing `displayText`, making debugging/provider traceability harder.
- Adding broad regex-based script transforms that unintentionally alter Japanese/Korean text.

## Validation Architecture

Validation must prove deterministic conversion and end-to-end rendering consistency:

1. **Normalization contract unit tests**
   - `npm test -- src/core/lyrics/unicode-normalization.test.ts`
   - Assert deterministic Traditional-to-Simplified conversions and non-Chinese preservation.

2. **Resolver output contract tests**
   - `npm test -- src/core/lyrics/lyrics-resolver.test.ts`
   - Assert synced/plain resolver lines include Simplified-ready `displayText` while preserving source `text`.

3. **Web shell rendering behavior tests**
   - `npm test -- src/web/app-shell.test.tsx`
   - Assert rendered active/next lines display Simplified Chinese for Traditional source fixtures.

4. **Build validity**
   - `npm run build`

5. **Requirement traceability checks**
   - CHN-01: synced + plain render paths surface Simplified Chinese output.
   - CHN-02: mixed-language lines keep non-Chinese content intact while Chinese script is normalized.

## Plan Implications

- Keep three execute plans aligned to updated roadmap intent:
  1. conversion contract hardening,
  2. resolver-flow normalization wiring,
  3. shell-level verification + QA artifact.
- Sequence plans because they share core files and must build contract first, then wiring, then verification artifact.
