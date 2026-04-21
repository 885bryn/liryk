---
phase: 05
slug: web-runtime-and-theme-foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for web runtime, shadcn baseline, and persistent theming.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | package.json |
| **Quick run command** | `npm test -- src/web/app-shell.test.tsx src/web/shadcn-checkpoint.test.tsx src/web/theme/theme-store.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~40 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- <phase 5 targeted file list>`
- **After every wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | WEB-01 | integration | `npm test -- src/web/app-shell.test.tsx` | MISSING -> Plan 01 creates it | ⬜ pending |
| 05-01-02 | 01 | 1 | WEB-01, THEM-01 | integration | `npm test -- src/web/app-shell.test.tsx` | MISSING -> Plan 01 updates it | ⬜ pending |
| 05-02-01 | 02 | 2 | UI-02 | unit | `npm test -- src/web/shadcn-checkpoint.test.tsx` | MISSING -> Plan 02 creates it | ⬜ pending |
| 05-02-02 | 02 | 2 | UI-02 | integration | `npm test -- src/web/shadcn-checkpoint.test.tsx` | MISSING -> Plan 02 updates it | ⬜ pending |
| 05-03-01 | 03 | 3 | THEM-01, THEM-02 | unit | `npm test -- src/web/theme/theme-store.test.ts` | MISSING -> Plan 03 creates it | ⬜ pending |
| 05-03-02 | 03 | 3 | WEB-01, THEM-01, THEM-02 | integration | `npm test -- src/web/app-shell.test.tsx src/web/theme/theme-store.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

Existing test infrastructure is sufficient; Plan 01 introduces browser shell test scaffolding before downstream tasks depend on it.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Theme change uses subtle transition and appears natural in both connected and pre-connect header controls | THEM-01 | Automated tests can validate class/state changes but not perceived transition quality | Run app locally, toggle theme in header then account menu, confirm transition is immediate and not jarring |
| Split-first layout keeps both panes visible with explicit placeholders before playback/connection data is active | WEB-01 | Visual composition and placeholder clarity are best validated by human review | Open shell on desktop and mobile width, confirm both panes are present and inactive pane has explicit state copy |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity preserved across all plans
- [x] Wave 0 not required beyond new phase test scaffolding
- [x] No watch-mode flags
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
