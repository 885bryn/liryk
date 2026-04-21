---
phase: 07
slug: web-lyrics-experience-parity-and-state-polish
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 07 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + testing-library |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- src/app/live-lyrics-presenter.test.ts src/ui/lyrics/live-lyrics-panel.test.ts src/web/app-shell.test.tsx` |
| **Full suite command** | `npm test && npm run build` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/app/live-lyrics-presenter.test.ts src/ui/lyrics/live-lyrics-panel.test.ts src/web/app-shell.test.tsx`
- **After every plan wave:** Run `npm test && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | WEB-03 | unit | `npm test -- src/app/live-lyrics-presenter.test.ts src/ui/lyrics/live-lyrics-panel.test.ts` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | UI-04 | unit | `npm test -- src/app/live-lyrics-presenter.test.ts src/ui/lyrics/live-lyrics-panel.test.ts` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 2 | WEB-03 | component | `npm test -- src/web/app-shell.test.tsx` | ✅ | ⬜ pending |
| 07-02-02 | 02 | 2 | UI-04 | component | `npm test -- src/web/app-shell.test.tsx` | ✅ | ⬜ pending |
| 07-03-01 | 03 | 3 | WEB-03, UI-04 | docs+verify | `npm test -- src/web/app-shell.test.tsx && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending - ✅ green - ❌ red - ⚠ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Transition feel remains soft and non-jarring across reconnecting/syncing/paused | UI-04 | Motion smoothness perception is subjective | Run app, trigger playback reconnect and pause/resume paths in both themes, confirm lyrics stay anchored while inline rail updates |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-20
