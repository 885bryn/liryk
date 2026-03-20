---
phase: 8
slug: live-playback-and-lyrics-data-flow-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 8 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- src/core/lyrics/unicode-normalization.test.ts src/core/lyrics/lyrics-resolver.test.ts` |
| **Full suite command** | `npm test -- src/core/lyrics/unicode-normalization.test.ts src/core/lyrics/lyrics-resolver.test.ts src/web/app-shell.test.tsx` |
| **Estimated runtime** | ~50 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/core/lyrics/unicode-normalization.test.ts src/core/lyrics/lyrics-resolver.test.ts`
- **After every plan wave:** Run `npm test -- src/core/lyrics/unicode-normalization.test.ts src/core/lyrics/lyrics-resolver.test.ts src/web/app-shell.test.tsx`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | CHN-02 | unit | `npm test -- src/core/lyrics/unicode-normalization.test.ts` | ✅ | ⬜ pending |
| 08-01-02 | 01 | 1 | CHN-01, CHN-02 | unit | `npm test -- src/core/lyrics/unicode-normalization.test.ts` | ✅ | ⬜ pending |
| 08-02-01 | 02 | 2 | CHN-01 | unit | `npm test -- src/core/lyrics/lyrics-resolver.test.ts` | ✅ | ⬜ pending |
| 08-02-02 | 02 | 2 | CHN-01, CHN-02 | unit | `npm test -- src/core/lyrics/lyrics-resolver.test.ts src/ui/lyrics/lyrics-viewport.test.tsx` | ✅ | ⬜ pending |
| 08-03-01 | 03 | 3 | CHN-01, CHN-02 | integration | `npm test -- src/web/app-shell.test.tsx` | ✅ | ⬜ pending |
| 08-03-02 | 03 | 3 | CHN-01, CHN-02 | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A real Spotify track with Traditional Chinese lyrics renders as Simplified Chinese in the web lyrics pane for both synced and plain modes | CHN-01 | Requires real provider payload shape and live playback progression | Connect Spotify, play known Traditional-lyric track, verify active and next lines show Simplified glyphs; repeat with a plain-lyrics fallback track |
| Mixed-language lyric lines preserve Latin digits and punctuation while Chinese glyphs are normalized | CHN-02 | Requires visual validation of real lyric line composition in browser | During playback, verify sample mixed line keeps non-Chinese segments unchanged while Chinese characters appear in Simplified form |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
