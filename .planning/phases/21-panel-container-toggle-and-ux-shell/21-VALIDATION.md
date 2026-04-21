---
phase: 21
slug: panel-container-toggle-and-ux-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 2.1.9 + @testing-library/react 16.3.0 |
| **Config file** | `vite.config.ts` (test.environment: jsdom) |
| **Quick run command** | `rtk vitest run src/web/dev-activity-panel` |
| **Full suite command** | `rtk vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run src/web/dev-activity-panel`
- **After every plan wave:** Run `rtk vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | DEV-01, DEV-08 | unit | `rtk vitest run src/web/dev-activity-panel` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | DEV-03 | unit | `rtk vitest run src/web/dev-activity-panel` | ❌ W0 | ⬜ pending |
| 21-01-03 | 01 | 1 | DEV-07 | unit | `rtk vitest run src/web/dev-activity-panel` | ❌ W0 | ⬜ pending |
| 21-02-01 | 02 | 2 | DEV-02, DEV-09 | unit | `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/web/dev-activity-panel/dev-activity-panel.test.tsx` — test stubs for DEV-01 (toggle), DEV-03 (scroll isolation), DEV-07 (auth events), DEV-08 (auto-scroll)
- [ ] `src/web/dev-activity-panel/use-dev-activity-log.ts` — ring buffer hook (tested inline in panel test)
- [ ] `src/web/dev-activity-panel/dev-activity-panel.tsx` — panel component stub

*Existing infrastructure (`vite.config.ts`, `@testing-library/react`, `vitest`) covers all framework needs — no new test tooling required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Panel visually unobtrusive against dark background | DEV-09 | Visual judgment; DOM position automated but aesthetics require human review | Open fullscreen lyrics, open dev panel, verify lyrics remain readable and panel fits theme |
| Scroll isolation under real touch on mobile | DEV-03 | Touch simulation in jsdom is unreliable for passive/non-passive behavior | Open on mobile or mobile emulator, scroll panel log, verify lyric viewport does not scroll and live lock stays on |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
