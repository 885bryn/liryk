---
phase: 03
slug: lyrics-resolution-and-rendered-experience
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | package.json |
| **Quick run command** | `npm test -- src/core/lyrics/lrc-parser.test.ts src/core/lyrics/plain-lyrics-timing.test.ts src/core/lyrics/lyrics-matcher.test.ts src/infra/providers/lrclib-client.test.ts src/app/lyrics-resolution-runtime.test.ts src/app/live-lyrics-presenter.test.ts src/ui/lyrics/live-lyrics-panel.test.tsx src/ui/lyrics/lyrics-viewport.test.tsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- <targeted phase file list>`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | LYR-03, I18N-01 | unit | `npm test -- src/core/lyrics/lrc-parser.test.ts src/core/lyrics/plain-lyrics-timing.test.ts` | ✅ | ⬜ pending |
| 03-01-02 | 01 | 1 | I18N-01 | unit | `npm test -- src/core/lyrics/unicode-normalization.test.ts` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | LYR-01 | unit | `npm test -- src/infra/providers/lrclib-client.test.ts` | ✅ | ⬜ pending |
| 03-02-02 | 02 | 2 | LYR-02 | unit | `npm test -- src/core/lyrics/lyrics-matcher.test.ts` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 3 | LYR-04 | unit | `npm test -- src/state/playback/live-sync-store.test.ts` | ✅ | ⬜ pending |
| 03-03-02 | 03 | 3 | LYR-01, LYR-03, LYR-04 | integration | `npm test -- src/app/lyrics-resolution-runtime.test.ts src/app/live-sync-runtime.test.ts` | ✅ | ⬜ pending |
| 03-04-01 | 04 | 4 | LYR-04, UI-01 | unit | `npm test -- src/app/live-lyrics-presenter.test.ts src/ui/lyrics/live-lyrics-panel.test.tsx` | ✅ | ⬜ pending |
| 03-04-02 | 04 | 4 | I18N-01, UI-01 | unit | `npm test -- src/ui/lyrics/lyrics-viewport.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mixed-script visual readability in the final desktop surface | I18N-01, UI-01 | Unit tests can verify direction metadata, but final typography and wrapping need renderer confirmation | Open the Phase 3 surface with Arabic, Korean, and CJK fixtures; confirm no horizontal scroll, no garbled glyphs, and plain fallback shows no active highlight |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
