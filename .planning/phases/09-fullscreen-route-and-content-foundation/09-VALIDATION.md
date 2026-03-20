---
phase: 09
slug: fullscreen-route-and-content-foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 09 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- src/main.test.tsx src/web/fullscreen-lyrics-page.test.tsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/main.test.tsx src/web/fullscreen-lyrics-page.test.tsx`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | FULL-01 | unit | `npm test -- src/main.test.tsx` | ✅ | ⬜ pending |
| 09-01-02 | 01 | 1 | FULL-01 | unit | `npm test -- src/main.test.tsx` | ✅ | ⬜ pending |
| 09-02-01 | 02 | 2 | FULL-02 | unit | `npm test -- src/web/fullscreen-lyrics-page.test.tsx` | ✅ | ⬜ pending |
| 09-02-02 | 02 | 2 | FULL-02 | unit | `npm test -- src/web/fullscreen-lyrics-page.test.tsx` | ✅ | ⬜ pending |
| 09-03-01 | 03 | 3 | CHN-03 | unit | `npm test -- src/web/fullscreen-lyrics-page.test.tsx` | ✅ | ⬜ pending |
| 09-03-02 | 03 | 3 | CHN-04 | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending - ✅ green - ❌ red - ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fullscreen visual breathing room appears correct on real viewport sizes | FULL-02 | Pixel-perfect spacing confidence still benefits from browser review | Run `npm run dev`, open `/fullscreen`, verify centered column, left-aligned lines, and generous top/bottom spacing on desktop and mobile widths |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
