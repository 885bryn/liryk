---
phase: 20
slug: viewport-regression-and-timing-safety-closure
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
---

# Phase 20 - Validation Strategy

> Per-phase validation contract for viewport regression and timing safety closure.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest with Testing Library and jsdom |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts` |
| **Full suite command** | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts; rtk npm run build` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts`
- **After every plan wave:** Run `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts; rtk npm run build`
- **Before `$gsd-verify-work`:** The targeted safety suite and build must be green.
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | QA-01 | fullscreen integration | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes | pending |
| 20-01-02 | 01 | 1 | SAFE-01 | timing and motion safety | `rtk npm run test -- src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts` | yes | pending |
| 20-02-01 | 02 | 1 | QA-01 | docs/manual | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts; rtk npm run build` | no - Wave 0 | pending |
| 20-02-02 | 02 | 1 | SAFE-01, QA-01 | final safety gate | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts src/core/sync/lyric-motion-window.test.ts src/core/playback/playback-clock.test.ts src/app/live-sync-runtime.test.ts; rtk npm run build` | yes | pending |

---

## Wave 0 Requirements

- [ ] `.planning/phases/20-viewport-regression-and-timing-safety-closure/20-VALIDATION.md` - maps `SAFE-01` and `QA-01` to exact commands and manual checks.
- [ ] `.planning/phases/20-viewport-regression-and-timing-safety-closure/20-02-SUMMARY.md` - final reproducible runbook and evidence ledger created during execution.
- [ ] `src/web/fullscreen-lyrics-page.test.tsx` - programmatic recentering and Back to Live tests either run without React `act(...)` warnings or the summary records why the warnings are non-blocking.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real fullscreen track start and track transition visibility | QA-01 | jsdom stubs can prove geometry math, but real browser fullscreen depends on fonts, viewport chrome, and rendered scroll behavior. | In a Chromium browser, start a synced Spotify track from before the first lyric and then switch to a second synced track. In fullscreen lyrics, confirm the highlighted first synced row is inside the visible viewport after each entry. Record browser, viewport size, track names, and result in `20-02-SUMMARY.md`. |
| Real fullscreen song end and final handoff visibility | QA-01 | End-of-song rendering depends on actual lyric lengths, font metrics, and viewport height. | Seek near the last synced lyric of a synced track. Confirm the highlighted final row and the final handoff remain inside the visible fullscreen viewport until playback advances beyond the final timestamp. Record result in `20-02-SUMMARY.md`. |
| Manual browse-away and Back to Live recovery | QA-01 | Pointer, wheel, and touch intent can differ from synthetic jsdom scroll events. | While live locked, intentionally wheel-scroll or touch-scroll away from the live anchor, confirm Back to Live appears, then activate Back to Live. Confirm live lock is restored and the highlighted row returns to the boundary-aware anchor. Record result in `20-02-SUMMARY.md`. |

---

## Validation Sign-Off

- [x] All tasks have automated verification or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verification.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency < 60s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
