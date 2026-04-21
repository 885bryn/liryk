---
phase: 22
slug: event-emission-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-19
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx` |
| **Full suite command** | `rtk vitest run` |
| **Estimated runtime** | ~10 seconds (quick), ~30 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx`
- **After every plan wave:** Run `rtk vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | DEV-04 | integration | `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx` | ✅ | ⬜ pending |
| 22-01-02 | 01 | 1 | DEV-05 | integration | `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx` | ✅ | ⬜ pending |
| 22-01-03 | 01 | 1 | DEV-06 | integration | `rtk vitest run src/web/fullscreen-lyrics-page.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. New tests are additions to `describe("dev panel integration")` in `src/web/fullscreen-lyrics-page.test.tsx` — no new test files or framework setup needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Log entries appear in correct chronological order during live playback | DEV-04/05/06 | Requires real Spotify session | Open fullscreen, play a track, open dev panel, verify lyrics → sync → clock entries appear in sequence |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
