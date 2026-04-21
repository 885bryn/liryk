---
phase: 12
slug: playback-clock-backbone-and-poll-safety
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test -- src/core/playback/playback-clock.test.ts src/app/playback-runtime.test.ts src/app/live-sync-runtime.test.ts src/state/playback/live-sync-store.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- src/core/playback/playback-clock.test.ts src/app/playback-runtime.test.ts src/app/live-sync-runtime.test.ts src/state/playback/live-sync-store.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | CLK-01 | unit | `npm run test -- src/core/playback/playback-clock.test.ts` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | CLK-01 | unit | `npm run test -- src/core/playback/playback-clock.test.ts` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 2 | CLK-01 | integration | `npm run test -- src/app/live-sync-runtime.test.ts src/state/playback/live-sync-store.test.ts` | ✅ | ⬜ pending |
| 12-02-02 | 02 | 2 | CLK-01 | integration | `npm run test -- src/app/live-sync-runtime.test.ts src/state/playback/live-sync-store.test.ts` | ✅ | ⬜ pending |
| 12-03-01 | 03 | 2 | CLK-02 | race unit | `npm run test -- src/app/playback-runtime.test.ts` | ✅ | ⬜ pending |
| 12-03-02 | 03 | 2 | CLK-02 | verification | `npm run test -- src/app/playback-runtime.test.ts && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Observe lyric timing stability over 20+ seconds of active playback while poll responses continue | CLK-01 | Real Spotify playback jitter and browser timer behavior are environment-dependent | Run app, play a track, keep fullscreen lyrics open for 20 seconds, verify line progression remains smooth without 1-second poll jumps |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
