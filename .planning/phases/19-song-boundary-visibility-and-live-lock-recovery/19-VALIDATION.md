---
phase: 19
slug: song-boundary-visibility-and-live-lock-recovery
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-09
---

# Phase 19 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 + Testing Library React 16.3.0 |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` |
| **Full suite command** | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts && rtk npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx`
- **After every plan wave:** Run `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | VIEW-01 | fullscreen integration/render | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes | green |
| 19-01-02 | 01 | 1 | VIEW-02 | fullscreen integration/render | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes | green |
| 19-02-01 | 02 | 2 | LIVE-02 | fullscreen interaction | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | yes | green |
| 19-02-02 | 02 | 2 | LIVE-02, LIVE-03 | fullscreen interaction + recovery | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts` | yes | green |
| 19-02-03 | 02 | 2 | VIEW-01, VIEW-02, LIVE-02, LIVE-03 | phase validation artifact | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx && rtk npm run build` | yes | green |

*Status: pending / green / red / flaky*

---

## Phase Gate

- `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx && rtk npm run build`
- `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx src/core/sync/lyric-timeline.test.ts src/core/sync/lyric-sync-engine.test.ts && rtk npm run build`

## Requirement Traceability

| Requirement | Proof Command | Source Evidence |
|-------------|---------------|-----------------|
| VIEW-01 | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx` |
| VIEW-02 | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx` |
| LIVE-02 | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx` |
| LIVE-03 | `rtk npm run test -- src/web/fullscreen-lyrics-page.test.tsx` | `src/web/fullscreen-lyrics-page.tsx`, `src/web/fullscreen-lyrics-page.test.tsx` |

---

## Manual-Only Verifications

All phase behaviors should have automated verification. Manual fullscreen checks remain part of Phase 20 final regression coverage.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
