---
phase: 06
slug: responsive-layout-and-visual-system
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + vite build |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `npm test -- src/web/app-shell.test.tsx` |
| **Full suite command** | `npm test && npm run build` |
| **Estimated runtime** | ~35 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/web/app-shell.test.tsx`
- **After every plan wave:** Run `npm test && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 40 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | THEM-03 | style contract | `npm run build` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | UI-03 | unit+snapshot marker | `npm test -- src/web/app-shell.test.tsx -t "typography"` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 2 | WEB-02 | unit | `npm test -- src/web/app-shell.test.tsx -t "split"` | ✅ | ⬜ pending |
| 06-02-02 | 02 | 2 | UI-03 | unit | `npm test -- src/web/app-shell.test.tsx -t "placeholders"` | ✅ | ⬜ pending |
| 06-03-01 | 03 | 3 | THEM-03 | integration-build | `npm test -- src/web/app-shell.test.tsx && npm run build` | ✅ | ⬜ pending |
| 06-03-02 | 03 | 3 | WEB-02 | docs+contract | `npm test -- src/web/app-shell.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile readability and spacing comfort | WEB-02, UI-03 | Subjective ergonomics and visual rhythm cannot be fully asserted by unit tests | Run `npm run dev`, open 390x844 and 1280x800 in browser devtools, confirm stacked mobile flow, desktop 40/60 emphasis, and readable body/status copy in both themes |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 40s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
