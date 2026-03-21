---
phase: 15
slug: hold-and-transition-motion-windowing
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 15 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test -- src/core/sync/lyric-motion-window.test.ts src/web/fullscreen-lyrics-page.test.tsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- src/core/sync/lyric-motion-window.test.ts src/web/fullscreen-lyrics-page.test.tsx`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | TRN-01 | unit | `npm run test -- src/core/sync/lyric-motion-window.test.ts` | ✅ | ⬜ pending |
| 15-02-01 | 02 | 2 | MOT-04, MOT-05 | integration | `npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | ✅ | ⬜ pending |
| 15-03-01 | 03 | 3 | TRN-01 | unit/integration | `npm run test -- src/core/sync/lyric-motion-window.test.ts src/web/fullscreen-lyrics-page.test.tsx && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending - ✅ green - ❌ red - ⚠ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hold period feels visually stable while reading | MOT-04 | Readability quality requires human perception check | Start app, play a synced track in `/fullscreen`, observe at least 3 line intervals; verify no continuous drift before transition window |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
