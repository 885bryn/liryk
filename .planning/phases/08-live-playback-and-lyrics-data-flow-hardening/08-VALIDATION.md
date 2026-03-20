---
phase: 8
slug: live-playback-and-lyrics-data-flow-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- src/web/auth/now-playing.test.ts src/web/app-shell.test.tsx` |
| **Full suite command** | `npm test -- src/web/auth/now-playing.test.ts src/web/app-shell.test.tsx src/core/lyrics/lyrics-resolver.test.ts src/core/lyrics/lyrics-matcher.test.ts` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/web/auth/now-playing.test.ts src/web/app-shell.test.tsx`
- **After every plan wave:** Run `npm test -- src/web/auth/now-playing.test.ts src/web/app-shell.test.tsx src/core/lyrics/lyrics-resolver.test.ts src/core/lyrics/lyrics-matcher.test.ts`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | WEB-04 | unit | `npm test -- src/web/auth/now-playing.test.ts` | ✅ | ⬜ pending |
| 08-01-02 | 01 | 1 | WEB-04 | integration | `npm test -- src/web/app-shell.test.tsx` | ✅ | ⬜ pending |
| 08-02-01 | 02 | 2 | LYR-WEB-01 | unit | `npm test -- src/core/lyrics/lyrics-resolver.test.ts src/core/lyrics/lyrics-matcher.test.ts` | ✅ | ⬜ pending |
| 08-02-02 | 02 | 2 | LYR-WEB-01 | integration | `npm test -- src/web/app-shell.test.tsx` | ✅ | ⬜ pending |
| 08-03-01 | 03 | 3 | LYR-WEB-02 | integration | `npm test -- src/web/app-shell.test.tsx` | ✅ | ⬜ pending |
| 08-03-02 | 03 | 3 | WEB-04, LYR-WEB-02 | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Connected playback shows now-playing metadata and lyric line transitions while real Spotify track advances | WEB-04, LYR-WEB-02 | Requires real Spotify account playback and OAuth session in browser | Follow phase checkpoint steps to connect Spotify, play a track, verify metadata appears within one poll, and confirm active/next line changes over 10-15 seconds |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
